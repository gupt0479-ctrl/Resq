import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { ReviewAnalysis } from "@/lib/schemas/feedback-ai"
import {
  parseAndApplyReviewBusinessRules,
  rulesOnlyReviewAnalysis,
  type GuestHistoryInput,
} from "@/lib/domain/feedback-rules"
import { recordAiAction } from "@/lib/services/ai-actions"
import { logAiCall } from "@/lib/logging/server-log"

function mapRiskStatusToCustomerColumn(update: ReviewAnalysis["risk_status_update"]): string {
  if (update === "healthy") return "none"
  if (update === "at_risk") return "at_risk"
  return "churned"
}

export async function buildGuestHistory(
  client: SupabaseClient,
  organizationId: string,
  customerId: string
): Promise<GuestHistoryInput> {
  const { data, error } = await client
    .from("customers")
    .select("lifetime_value, last_visit_at, notes, risk_status")
    .eq("id", customerId)
    .eq("organization_id", organizationId)
    .maybeSingle()

  if (error || !data) return null

  const lifetime = Number(data.lifetime_value) || 0
  const notes = (data.notes as string | null) ?? ""
  return {
    visitCount:     undefined,
    lifetimeSpend:  lifetime,
    lastVisit:      (data.last_visit_at as string | null) ?? undefined,
    vip:            lifetime >= 1200 || /\bVIP\b/i.test(notes),
    dietaryNotes:   notes.match(/allergy|nut|gluten|dairy|shellfish/i) ? notes : null,
  }
}

export async function findFeedbackByExternalRef(
  client: SupabaseClient,
  organizationId: string,
  externalSource: string,
  externalReviewId: string
) {
  const { data, error } = await client
    .from("feedback")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("external_source", externalSource)
    .eq("external_review_id", externalReviewId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data?.id as string | undefined
}

export interface IngestFeedbackInput {
  organizationId:         string
  customerId?:            string | null
  appointmentId?:         string | null
  integrationSyncEventId?: string | null
  guestName:              string
  score:                  number
  comment:                string
  source:                 string
  externalReviewId?:      string | null
  externalSource?:        string | null
}

/**
 * Creates feedback row. Returns existing id if external ref already ingested (idempotent).
 */
export async function ingestFeedbackRow(
  client: SupabaseClient,
  input: IngestFeedbackInput
): Promise<{ feedbackId: string; created: boolean }> {
  if (input.externalReviewId && input.externalSource) {
    const existing = await findFeedbackByExternalRef(
      client,
      input.organizationId,
      input.externalSource,
      input.externalReviewId
    )
    if (existing) return { feedbackId: existing, created: false }
  }

  const { data, error } = await client
    .from("feedback")
    .insert({
      organization_id:            input.organizationId,
      customer_id:                input.customerId ?? null,
      appointment_id:             input.appointmentId ?? null,
      integration_sync_event_id:  input.integrationSyncEventId ?? null,
      source:                       input.source,
      guest_name_snapshot:          input.guestName,
      score:                        input.score,
      comment:                      input.comment,
      external_review_id:         input.externalReviewId ?? null,
      external_source:              input.externalSource ?? null,
      analysis_source:              "none",
    })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") {
      const sid = input.externalSource ?? ""
      const rid = input.externalReviewId ?? ""
      if (sid && rid) {
        const id = await findFeedbackByExternalRef(client, input.organizationId, sid, rid)
        if (id) return { feedbackId: id, created: false }
      }
    }
    throw new Error(error.message)
  }

  return { feedbackId: data!.id as string, created: true }
}

async function importAnalyzeReview(): Promise<
  (p: {
    guestName:    string
    score:        number
    comment:      string
    source?:      string
    guestHistory: GuestHistoryInput
  }) => Promise<Record<string, unknown>>
> {
  const mod = await import("../../../agents/customer-service/agent.js")
  return mod.analyzeReview as (p: {
    guestName:    string
    score:        number
    comment:      string
    source?:      string
    guestHistory: GuestHistoryInput
  }) => Promise<Record<string, unknown>>
}

function stripAgentMeta(raw: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip agent-only fields before Zod parse
  const { _meta, messaging, ...rest } = raw
  return rest
}

async function maybeInsertFollowUp(
  client: SupabaseClient,
  organizationId: string,
  feedbackId: string,
  analysis: ReviewAnalysis
) {
  const t = analysis.recovery_action.type
  if (t === "none" || t === "thank_you_email") return

  const { error } = await client.from("follow_up_actions").insert({
    organization_id: organizationId,
    feedback_id:     feedbackId,
    action_type:       t,
    status:            "pending",
    channel:           analysis.recovery_action.channel,
    priority:          analysis.recovery_action.priority,
    message_draft:
      analysis.recovery_action.message_draft ??
      analysis.recovery_action.subject ??
      null,
  })
  if (error) throw new Error(error.message)
}

export async function patchCustomerRiskOnly(
  client: SupabaseClient,
  organizationId: string,
  customerId: string,
  analysis: ReviewAnalysis
) {
  const risk = mapRiskStatusToCustomerColumn(analysis.risk_status_update)
  const { error } = await client
    .from("customers")
    .update({ risk_status: risk, updated_at: new Date().toISOString() })
    .eq("id", customerId)
    .eq("organization_id", organizationId)

  if (error) throw new Error(error.message)
}

/**
 * Runs model (if key present) + deterministic rules, persists analysis, ai_action, optional follow_up.
 */
export async function analyzeAndPersistFeedback(
  client: SupabaseClient,
  organizationId: string,
  feedbackId: string,
  ctx: {
    guestName:    string
    score:        number
    comment:      string
    source:       string
    customerId:   string | null
  },
  opts?: { skipIfAlreadyAnalyzed?: boolean }
) {
  const t0 = Date.now()
  if (opts?.skipIfAlreadyAnalyzed) {
    const { data: row } = await client
      .from("feedback")
      .select("analysis_source")
      .eq("id", feedbackId)
      .eq("organization_id", organizationId)
      .maybeSingle()
    if (row && (row as { analysis_source?: string }).analysis_source && (row as { analysis_source: string }).analysis_source !== "none") {
      return
    }
  }

  let guestHistory: GuestHistoryInput = null
  if (ctx.customerId) {
    guestHistory = await buildGuestHistory(client, organizationId, ctx.customerId)
  }

  let analysis: ReviewAnalysis
  let analysisSource: "model" | "rules_fallback" | "invalid_model" = "rules_fallback"

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const analyzeReview = await importAnalyzeReview()
      const raw = await analyzeReview({
        guestName:    ctx.guestName,
        score:        ctx.score,
        comment:      ctx.comment,
        source:       ctx.source,
        guestHistory: guestHistory ?? null,
      })
      const cleaned = stripAgentMeta(raw as Record<string, unknown>)
      analysis = parseAndApplyReviewBusinessRules(cleaned, {
        score:        ctx.score,
        source:       ctx.source,
        guestHistory: guestHistory,
        comment:      ctx.comment,
      })
      analysisSource = "model"
      logAiCall({ feature: "customer_service.analyzeReview", ok: true, durationMs: Date.now() - t0 })
    } catch (e) {
      analysis = rulesOnlyReviewAnalysis({
        guestName:    ctx.guestName,
        score:        ctx.score,
        comment:      ctx.comment,
        source:       ctx.source,
        guestHistory: guestHistory,
      })
      analysisSource = "invalid_model"
      logAiCall({
        feature: "customer_service.analyzeReview",
        ok:      false,
        durationMs: Date.now() - t0,
        error:   e instanceof Error ? e.message : "unknown",
      })
    }
  } else {
    analysis = rulesOnlyReviewAnalysis({
      guestName:    ctx.guestName,
      score:        ctx.score,
      comment:      ctx.comment,
      source:       ctx.source,
      guestHistory: guestHistory,
    })
    analysisSource = "rules_fallback"
    logAiCall({ feature: "customer_service.analyzeReview", ok: true, durationMs: Date.now() - t0 })
  }

  const flagged = analysis.safety_flag || analysis.urgency >= 4 || analysis.sentiment === "negative"

  const { error: upErr } = await client
    .from("feedback")
    .update({
      sentiment:          analysis.sentiment,
      topics:             analysis.topics,
      urgency:            analysis.urgency,
      safety_flag:        analysis.safety_flag,
      follow_up_status:   analysis.follow_up_status,
      flagged,
      reply_draft:        analysis.reply_draft ?? null,
      internal_note:      analysis.internal_note,
      manager_summary:    analysis.manager_summary,
      analysis_json:      analysis as unknown as Record<string, unknown>,
      analysis_source:    analysisSource,
      updated_at:         new Date().toISOString(),
    })
    .eq("id", feedbackId)
    .eq("organization_id", organizationId)

  if (upErr) throw new Error(upErr.message)

  if (ctx.customerId) {
    await patchCustomerRiskOnly(client, organizationId, ctx.customerId, analysis)
  }

  await maybeInsertFollowUp(client, organizationId, feedbackId, analysis)

  await recordAiAction(client, {
    organizationId,
    entityType:    "feedback",
    entityId:      feedbackId,
    triggerType:   "feedback.received",
    actionType:    "customer_service.analyze_review",
    inputSummary:  `${ctx.guestName} · score ${ctx.score} · ${ctx.source}`,
    outputPayload: {
      sentiment:   analysis.sentiment,
      urgency:     analysis.urgency,
      safety_flag: analysis.safety_flag,
      source:      analysisSource,
    },
    status: "executed",
  })
}

export async function setFeedbackFlagged(
  client: SupabaseClient,
  organizationId: string,
  feedbackId: string,
  flagged: boolean
) {
  const { error } = await client
    .from("feedback")
    .update({ flagged, updated_at: new Date().toISOString() })
    .eq("id", feedbackId)
    .eq("organization_id", organizationId)

  if (error) throw new Error(error.message)
}

export async function enqueueFollowUpFromBody(
  client: SupabaseClient,
  organizationId: string,
  feedbackId: string,
  body: { actionType: string; channel: string; priority: string; messageDraft?: string }
) {
  const { error } = await client.from("follow_up_actions").insert({
    organization_id: organizationId,
    feedback_id:     feedbackId,
    action_type:       body.actionType,
    status:            "pending",
    channel:           body.channel,
    priority:          body.priority,
    message_draft:     body.messageDraft ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function resolveCustomerIdByEmail(
  client: SupabaseClient,
  organizationId: string,
  email: string
): Promise<string | null> {
  const { data, error } = await client
    .from("customers")
    .select("id")
    .eq("organization_id", organizationId)
    .ilike("email", email.trim())
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data?.id as string) ?? null
}
