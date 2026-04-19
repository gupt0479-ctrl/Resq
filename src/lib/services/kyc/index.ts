import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import crypto from "crypto"
import { z } from "zod"
import type {
  KycVerificationRequest,
  KycRequestWithChecks,
  KycOperatorAlert,
  KycCheckType,
} from "@/lib/types/kyc"
import { KYC_CHECK_ORDER, KYC_CHECK_POINTS } from "@/lib/types/kyc"
import { CreateKycRequestSchema } from "@/lib/schemas/kyc"
import { logKycEvent } from "./audit"
import { mapRowToRequest } from "./orchestrator"

export type CreateKycRequestInput = z.infer<typeof CreateKycRequestSchema>

export async function createKycRequest(
  supabase: SupabaseClient,
  organizationId: string,
  input: CreateKycRequestInput
): Promise<KycVerificationRequest> {
  const token = `kyc_tok_${crypto.randomBytes(16).toString("hex")}`
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("kyc_verification_requests")
    .insert({
      organization_id:    organizationId,
      customer_id:        input.customerId,
      invoice_id:         input.invoiceId ?? null,
      token,
      status:             "pending",
      business_name:      input.businessName,
      registered_state:   input.registeredState ?? null,
      business_address:   input.businessAddress ?? null,
      website_url:        input.websiteUrl ?? null,
      director_name:      input.directorName ?? null,
      director_dob:       input.directorDob ?? null,
      bank_account_last4: input.bankAccountLast4 ?? null,
      bank_routing_number: input.bankRoutingNumber ?? null,
      created_at:         now,
      updated_at:         now,
      link_expires_at:    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create KYC request: ${error.message}`)

  // Initialize all 8 checks in pending state
  const checkRows = KYC_CHECK_ORDER.map((checkType) => ({
    request_id:      data.id as string,
    check_type:      checkType,
    status:          "pending",
    points_possible: KYC_CHECK_POINTS[checkType],
    flags:           [],
  }))

  await supabase.from("kyc_checks").insert(checkRows)

  // Update customer kyc_status to pending
  await supabase.from("customers").update({ kyc_status: "pending" }).eq("id", input.customerId)

  await logKycEvent(supabase, data.id as string, "request_created", {
    customer_id: input.customerId,
    invoice_id:  input.invoiceId ?? null,
    business:    input.businessName,
  })

  return mapRowToRequest(data as Record<string, unknown>)
}

export async function getKycRequest(
  supabase: SupabaseClient,
  requestId: string,
  organizationId: string
): Promise<KycVerificationRequest | null> {
  const { data } = await supabase
    .from("kyc_verification_requests")
    .select("*")
    .eq("id", requestId)
    .eq("organization_id", organizationId)
    .single()

  return data ? mapRowToRequest(data as Record<string, unknown>) : null
}

export async function getKycRequestByToken(
  supabase: SupabaseClient,
  token: string
): Promise<KycVerificationRequest | null> {
  const { data } = await supabase
    .from("kyc_verification_requests")
    .select("*")
    .eq("token", token)
    .single()

  return data ? mapRowToRequest(data as Record<string, unknown>) : null
}

export async function getKycRequestWithChecks(
  supabase: SupabaseClient,
  requestId: string,
  organizationId: string
): Promise<KycRequestWithChecks | null> {
  const [reqResult, checksResult, auditResult, alertResult] = await Promise.all([
    supabase.from("kyc_verification_requests").select("*").eq("id", requestId).eq("organization_id", organizationId).single(),
    supabase.from("kyc_checks").select("*").eq("request_id", requestId).order("created_at"),
    supabase.from("kyc_audit_trail").select("*").eq("request_id", requestId).order("created_at"),
    supabase.from("kyc_operator_alerts").select("*").eq("request_id", requestId).maybeSingle(),
  ])

  if (!reqResult.data) return null

  return {
    ...mapRowToRequest(reqResult.data as Record<string, unknown>),
    checks:     (checksResult.data ?? []).map(mapCheckRow),
    auditTrail: (auditResult.data ?? []).map(mapAuditRow),
    alert:      alertResult.data ? mapAlertRow(alertResult.data as Record<string, unknown>) : null,
  }
}

export async function listKycRequests(
  supabase: SupabaseClient,
  organizationId: string,
  opts: { status?: string; limit?: number; offset?: number } = {}
): Promise<KycVerificationRequest[]> {
  let query = supabase
    .from("kyc_verification_requests")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50)

  if (opts.status) query = query.eq("status", opts.status)
  if (opts.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1)

  const { data } = await query
  return (data ?? []).map((r: Record<string, unknown>) => mapRowToRequest(r as Record<string, unknown>))
}

export async function listOperatorAlerts(
  supabase: SupabaseClient,
  organizationId: string,
  opts: { status?: string } = {}
): Promise<KycOperatorAlert[]> {
  let query = supabase
    .from("kyc_operator_alerts")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })

  if (opts.status) query = query.eq("status", opts.status)

  const { data } = await query
  return (data ?? []).map((r: Record<string, unknown>) => mapAlertRow(r as Record<string, unknown>))
}

export async function recordLinkOpened(
  supabase: SupabaseClient,
  requestId: string
): Promise<void> {
  await supabase.from("kyc_verification_requests").update({
    link_opened_at: new Date().toISOString(),
    updated_at:     new Date().toISOString(),
  }).eq("id", requestId).is("link_opened_at", null)

  await logKycEvent(supabase, requestId, "link_opened", {}, "client")
}

export async function applyOperatorAction(
  supabase: SupabaseClient,
  requestId: string,
  _organizationId: string,
  action: "escalate_to_legal" | "override_and_approve" | "decline_and_blacklist",
  notes?: string,
  actorId?: string
): Promise<void> {
  const now = new Date().toISOString()
  const actor = actorId ?? "operator"

  let alertStatus: string
  let customerRiskStatus: string | null = null
  let kycStatus: string | null = null

  switch (action) {
    case "escalate_to_legal":
      alertStatus = "escalated"
      break
    case "override_and_approve":
      alertStatus = "approved"
      kycStatus = "completed_review"
      break
    case "decline_and_blacklist":
      alertStatus = "declined"
      customerRiskStatus = "flagged"
      break
  }

  // Update alert
  await supabase.from("kyc_operator_alerts").update({
    status:           alertStatus,
    resolved_by:      actor,
    resolved_at:      now,
    resolution_notes: notes ?? null,
    updated_at:       now,
  }).eq("request_id", requestId)

  // Update KYC request if overriding
  if (kycStatus) {
    await supabase.from("kyc_verification_requests").update({
      status:     kycStatus,
      updated_at: now,
    }).eq("id", requestId)
  }

  // Update customer risk status if blacklisting
  if (customerRiskStatus) {
    const { data: req } = await supabase
      .from("kyc_verification_requests")
      .select("customer_id")
      .eq("id", requestId)
      .single()

    if (req) {
      await supabase.from("customers").update({
        risk_status: customerRiskStatus,
        kyc_status:  "completed_failed",
      }).eq("id", req.customer_id as string)
    }
  }

  await logKycEvent(supabase, requestId, "operator_action", {
    action,
    notes: notes ?? null,
    actor,
  }, "operator")
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function mapCheckRow(row: Record<string, unknown>): import("@/lib/types/kyc").KycCheck {
  return {
    id:                 row.id as string,
    requestId:          row.request_id as string,
    checkType:          row.check_type as KycCheckType,
    status:             row.status as import("@/lib/types/kyc").KycCheckStatus,
    pointsPossible:     row.points_possible as number,
    pointsEarned:       row.points_earned as number | null,
    resultSummary:      row.result_summary as string | null,
    resultDetail:       row.result_detail as Record<string, unknown> | null,
    sourceUrl:          row.source_url as string | null,
    rawTinyfishResult:  row.raw_tinyfish_result ?? null,
    claudeAnalysis:     row.claude_analysis as string | null,
    flags:              (row.flags as string[]) ?? [],
    startedAt:          row.started_at as string | null,
    completedAt:        row.completed_at as string | null,
    createdAt:          row.created_at as string,
  }
}

function mapAuditRow(row: Record<string, unknown>): import("@/lib/types/kyc").KycAuditEvent {
  return {
    id:         row.id as string,
    requestId:  row.request_id as string,
    eventType:  row.event_type as string,
    eventData:  row.event_data as Record<string, unknown> | null,
    actor:      row.actor as "system" | "client" | "operator",
    createdAt:  row.created_at as string,
  }
}

function mapAlertRow(row: Record<string, unknown>): KycOperatorAlert {
  return {
    id:               row.id as string,
    requestId:        row.request_id as string,
    organizationId:   row.organization_id as string,
    customerId:       row.customer_id as string,
    customerName:     row.customer_name as string,
    alertType:        row.alert_type as KycOperatorAlert["alertType"],
    severity:         row.severity as KycOperatorAlert["severity"],
    summary:          row.summary as string,
    failedChecks:     (row.failed_checks as KycOperatorAlert["failedChecks"]) ?? [],
    watchlistMatches: row.watchlist_matches as Record<string, unknown> | null,
    adverseMedia:     row.adverse_media as KycOperatorAlert["adverseMedia"],
    claudeAnalysis:   row.claude_analysis as string | null,
    status:           row.status as KycOperatorAlert["status"],
    resolvedBy:       row.resolved_by as string | null,
    resolvedAt:       row.resolved_at as string | null,
    resolutionNotes:  row.resolution_notes as string | null,
    createdAt:        row.created_at as string,
    updatedAt:        row.updated_at as string,
  }
}
