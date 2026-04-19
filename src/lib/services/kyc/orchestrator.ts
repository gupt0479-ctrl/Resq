import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { KycVerificationRequest, KycCheck, KycCheckType } from "@/lib/types/kyc"
import { KYC_CHECK_ORDER, KYC_CHECK_POINTS } from "@/lib/types/kyc"
import { logKycEvent } from "./audit"
import { calculateScore, bandToKycStatus, shouldCreateAlert, alertSeverity, alertType } from "./score-engine"
import { runBusinessNameCheck } from "./checks/business-name"
import { runOfficeAddressCheck } from "./checks/office-address"
import { runPeopleVerificationCheck } from "./checks/people-verification"
import { runWatchlistCheck } from "./checks/watchlist"
import { runBankAccountCheck } from "./checks/bank-account"
import { runOwnerKycCheck } from "./checks/owner-kyc"
import { runAdverseMediaCheck } from "./checks/adverse-media"
import { runWebsitePresenceCheck } from "./checks/website-presence"

const CHECK_RUNNERS: Record<KycCheckType, (req: KycVerificationRequest) => Promise<import("@/lib/types/kyc").KycCheckRunResult>> = {
  business_name:       runBusinessNameCheck,
  office_address:      runOfficeAddressCheck,
  people_verification: runPeopleVerificationCheck,
  watchlist_screening: runWatchlistCheck,
  bank_account:        runBankAccountCheck,
  owner_kyc:           runOwnerKycCheck,
  adverse_media:       runAdverseMediaCheck,
  website_presence:    runWebsitePresenceCheck,
}

async function upsertCheck(
  supabase: SupabaseClient,
  requestId: string,
  checkType: KycCheckType,
  status: "running" | "passed" | "failed" | "flagged",
  data?: Partial<{
    pointsEarned: number
    resultSummary: string
    resultDetail: unknown
    sourceUrl: string
    rawTinyfishResult: unknown
    claudeAnalysis: string
    flags: string[]
    startedAt: string
    completedAt: string
  }>
): Promise<void> {
  await supabase.from("kyc_checks").upsert({
    request_id:           requestId,
    check_type:           checkType,
    status,
    points_possible:      KYC_CHECK_POINTS[checkType],
    points_earned:        data?.pointsEarned ?? null,
    result_summary:       data?.resultSummary ?? null,
    result_detail:        data?.resultDetail ?? null,
    source_url:           data?.sourceUrl ?? null,
    raw_tinyfish_result:  data?.rawTinyfishResult ?? null,
    claude_analysis:      data?.claudeAnalysis ?? null,
    flags:                data?.flags ?? [],
    started_at:           data?.startedAt ?? null,
    completed_at:         data?.completedAt ?? null,
  }, { onConflict: "request_id,check_type" })
}

export async function runSingleCheck(
  supabase: SupabaseClient,
  request: KycVerificationRequest,
  checkType: KycCheckType
): Promise<KycCheck> {
  const now = new Date().toISOString()

  // Mark running
  await upsertCheck(supabase, request.id, checkType, "running", { startedAt: now })
  await supabase.from("kyc_verification_requests").update({
    current_step: checkType,
    status: "in_progress",
    updated_at: now,
  }).eq("id", request.id)

  await logKycEvent(supabase, request.id, "check_started", { check_type: checkType })

  const runner = CHECK_RUNNERS[checkType]
  const result = await runner(request)

  const completedAt = new Date().toISOString()

  await upsertCheck(supabase, request.id, checkType, result.status, {
    pointsEarned:       result.pointsEarned,
    resultSummary:      result.resultSummary,
    resultDetail:       result.resultDetail,
    sourceUrl:          result.sourceUrl,
    rawTinyfishResult:  result.rawTinyfishResult,
    claudeAnalysis:     result.claudeAnalysis,
    flags:              result.flags,
    startedAt:          now,
    completedAt,
  })

  await logKycEvent(supabase, request.id, "check_completed", {
    check_type:    checkType,
    status:        result.status,
    points_earned: result.pointsEarned,
    flags:         result.flags,
  })

  const { data } = await supabase
    .from("kyc_checks")
    .select("*")
    .eq("request_id", request.id)
    .eq("check_type", checkType)
    .single()

  return data as KycCheck
}

export async function runAllPendingChecks(
  supabase: SupabaseClient,
  requestId: string,
  startFromCheck?: KycCheckType
): Promise<{ finalScore: number; band: string; status: string }> {
  const { data: req } = await supabase
    .from("kyc_verification_requests")
    .select("*")
    .eq("id", requestId)
    .single()

  if (!req) throw new Error(`KYC request ${requestId} not found`)

  const request = mapRowToRequest(req)
  const startIdx = startFromCheck ? KYC_CHECK_ORDER.indexOf(startFromCheck) : 0
  const checksToRun = KYC_CHECK_ORDER.slice(Math.max(0, startIdx))

  // Run checks sequentially (watchlist result affects whether to continue)
  for (const checkType of checksToRun) {
    const { data: existing } = await supabase
      .from("kyc_checks")
      .select("status")
      .eq("request_id", requestId)
      .eq("check_type", checkType)
      .single()

    if (existing && existing.status !== "pending" && existing.status !== "running") {
      continue // already completed
    }

    await runSingleCheck(supabase, request, checkType)
  }

  // Fetch all checks and calculate final score
  const { data: allChecks } = await supabase
    .from("kyc_checks")
    .select("*")
    .eq("request_id", requestId)

  const checks = (allChecks ?? []) as KycCheck[]
  const scoreResult = calculateScore(checks)
  const finalStatus = bandToKycStatus(scoreResult.band)
  const now = new Date().toISOString()

  await supabase.from("kyc_verification_requests").update({
    status:                finalStatus,
    risk_score:            scoreResult.finalScore,
    risk_band:             scoreResult.band,
    score_breakdown:       scoreResult.scoreBreakdown,
    watchlist_flagged:     scoreResult.watchlistFlagged,
    liveness_flagged:      scoreResult.livenessFlagged,
    adverse_media_flagged: scoreResult.adverseMediaFlagged,
    completed_at:          now,
    current_step:          null,
    updated_at:            now,
  }).eq("id", requestId)

  // Update customer kyc_status
  await supabase.from("customers").update({
    kyc_status:      finalStatus,
    kyc_score:       scoreResult.finalScore,
    kyc_band:        scoreResult.band,
    kyc_verified_at: now,
  }).eq("id", request.customerId)

  await logKycEvent(supabase, requestId, "verification_completed", {
    score:  scoreResult.finalScore,
    band:   scoreResult.band,
    status: finalStatus,
    caps:   scoreResult.capsApplied,
  })

  // Create operator alert if needed
  if (shouldCreateAlert(scoreResult.band)) {
    const failedChecks = checks
      .filter((c) => c.status === "flagged" || c.status === "failed")
      .map((c) => ({
        check_type: c.checkType,
        reason: (c.flags as string[])[0] ?? "Check failed",
        detail: c.resultSummary ?? "",
      }))

    const watchlistCheck = checks.find((c) => c.checkType === "watchlist_screening")
    const adverseCheck = checks.find((c) => c.checkType === "adverse_media")

    const watchlistMatches = watchlistCheck?.resultDetail as Record<string, unknown> | null

    let adverseMedia = null
    if (adverseCheck?.resultDetail) {
      const detail = adverseCheck.resultDetail as { articles?: unknown }
      adverseMedia = detail.articles ?? null
    }

    const ownerKycCheck = checks.find((c) => c.checkType === "owner_kyc")

    await supabase.from("kyc_operator_alerts").insert({
      request_id:       requestId,
      organization_id:  request.organizationId,
      customer_id:      request.customerId,
      customer_name:    request.directorName ?? request.businessName ?? "Unknown",
      alert_type:       alertType(scoreResult.watchlistFlagged, scoreResult.band),
      severity:         alertSeverity(scoreResult.watchlistFlagged),
      summary:          buildAlertSummary(request, scoreResult),
      failed_checks:    failedChecks,
      watchlist_matches: watchlistMatches ? { ofac_match: watchlistMatches.ofac_match } : null,
      adverse_media:    adverseMedia,
      claude_analysis:  ownerKycCheck?.claudeAnalysis ?? null,
      status:           "open",
    })

    await logKycEvent(supabase, requestId, "operator_alert_created", {
      severity: alertSeverity(scoreResult.watchlistFlagged),
      score:    scoreResult.finalScore,
    })
  }

  return {
    finalScore: scoreResult.finalScore,
    band:       scoreResult.band,
    status:     finalStatus,
  }
}

function buildAlertSummary(
  request: KycVerificationRequest,
  score: ReturnType<typeof calculateScore>
): string {
  const parts: string[] = [
    `Score ${score.finalScore}/100 — ${score.band.toUpperCase()}.`,
  ]
  if (score.watchlistFlagged) parts.push("OFAC/sanctions watchlist match found.")
  if (score.adverseMediaFlagged) parts.push("Credible adverse media detected.")
  if (score.livenessFlagged) parts.push("Liveness check failed.")
  parts.push("Agent blocked pending operator review.")
  return parts.join(" ")
}

export function mapRowToRequest(row: Record<string, unknown>): KycVerificationRequest {
  return {
    id:                   row.id as string,
    organizationId:       row.organization_id as string,
    customerId:           row.customer_id as string,
    invoiceId:            row.invoice_id as string | null,
    token:                row.token as string,
    status:               row.status as KycVerificationRequest["status"],
    currentStep:          row.current_step as KycCheckType | null,
    riskScore:            row.risk_score as number | null,
    riskBand:             row.risk_band as KycVerificationRequest["riskBand"],
    scoreBreakdown:       row.score_breakdown as KycVerificationRequest["scoreBreakdown"],
    watchlistFlagged:     Boolean(row.watchlist_flagged),
    livenessFlagged:      Boolean(row.liveness_flagged),
    adverseMediaFlagged:  Boolean(row.adverse_media_flagged),
    businessName:         row.business_name as string | null,
    registeredState:      row.registered_state as string | null,
    businessAddress:      row.business_address as string | null,
    websiteUrl:           row.website_url as string | null,
    directorName:         row.director_name as string | null,
    directorDob:          row.director_dob as string | null,
    bankAccountLast4:     row.bank_account_last4 as string | null,
    bankRoutingNumber:    row.bank_routing_number as string | null,
    createdAt:            row.created_at as string,
    updatedAt:            row.updated_at as string,
    completedAt:          row.completed_at as string | null,
    linkOpenedAt:         row.link_opened_at as string | null,
    linkExpiresAt:        row.link_expires_at as string,
  }
}
