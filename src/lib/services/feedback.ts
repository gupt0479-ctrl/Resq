import "server-only"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { eq, and, desc, count, ilike } from "drizzle-orm"
import { ReviewAnalysisSchema, type ReviewAnalysis } from "@/lib/schemas/feedback-ai"
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
  organizationId: string,
  customerId: string
): Promise<GuestHistoryInput> {
  const [customerRow] = await db
    .select({
      lifetimeValue: schema.customers.lifetimeValue,
      lastVisitAt:   schema.customers.lastVisitAt,
      notes:         schema.customers.notes,
      riskStatus:    schema.customers.riskStatus,
    })
    .from(schema.customers)
    .where(
      and(
        eq(schema.customers.id, customerId),
        eq(schema.customers.organizationId, organizationId),
      ),
    )
    .limit(1)

  if (!customerRow) return null

  const recentAppointments = await db
    .select({
      startsAt: schema.appointments.startsAt,
      notes:    schema.appointments.notes,
    })
    .from(schema.appointments)
    .where(
      and(
        eq(schema.appointments.customerId, customerId),
        eq(schema.appointments.organizationId, organizationId),
      ),
    )
    .orderBy(desc(schema.appointments.startsAt))
    .limit(3)

  // Get total visit count
  const [visitCountResult] = await db
    .select({ count: count() })
    .from(schema.appointments)
    .where(
      and(
        eq(schema.appointments.customerId, customerId),
        eq(schema.appointments.organizationId, organizationId),
      ),
    )

  const visitCount = Number(visitCountResult?.count ?? 0)
  const lifetime = Number(customerRow.lifetimeValue) || 0
  const customerNotes = customerRow.notes ?? ""
  const appointmentNotes = recentAppointments
    .map((row) => row.notes ?? "")
    .filter(Boolean)
    .join(" ")
  const combinedNotes = [customerNotes, appointmentNotes].filter(Boolean).join(" ").trim()
  const mostRecentVisit = recentAppointments[0]?.startsAt?.toISOString()

  return {
    visitCount:    visitCount || undefined,
    lifetimeSpend: lifetime,
    lastVisit:     mostRecentVisit ?? customerRow.lastVisitAt?.toISOString() ?? undefined,
    vip:           lifetime >= 1200 || /\bVIP\b/i.test(combinedNotes),
    dietaryNotes:  combinedNotes.match(/allergy|nut|gluten|dairy|shellfish/i) ? combinedNotes : null,
  }
}

export async function findFeedbackByExternalRef(
  organizationId: string,
  externalSource: string,
  externalReviewId: string
) {
  const [row] = await db
    .select({ id: schema.feedback.id })
    .from(schema.feedback)
    .where(
      and(
        eq(schema.feedback.organizationId, organizationId),
        eq(schema.feedback.externalSource, externalSource),
        eq(schema.feedback.externalReviewId, externalReviewId),
      ),
    )
    .limit(1)

  return row?.id as string | undefined
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
  input: IngestFeedbackInput
): Promise<{ feedbackId: string; created: boolean }> {
  if (input.externalReviewId && input.externalSource) {
    const existing = await findFeedbackByExternalRef(
      input.organizationId,
      input.externalSource,
      input.externalReviewId
    )
    if (existing) return { feedbackId: existing, created: false }
  }

  const customerId = input.customerId ?? null
  const appointmentId = input.appointmentId ?? null

  if (customerId) {
    const [custRow] = await db
      .select({ id: schema.customers.id })
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.id, customerId),
          eq(schema.customers.organizationId, input.organizationId),
        ),
      )
      .limit(1)
    if (!custRow) {
      throw new Error("customer_id does not belong to this organization")
    }
  }
  if (appointmentId) {
    const [apptRow] = await db
      .select({ id: schema.appointments.id })
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.id, appointmentId),
          eq(schema.appointments.organizationId, input.organizationId),
        ),
      )
      .limit(1)
    if (!apptRow) {
      throw new Error("appointment_id does not belong to this organization")
    }
  }

  try {
    const [row] = await db
      .insert(schema.feedback)
      .values({
        organizationId:          input.organizationId,
        customerId,
        appointmentId,
        integrationSyncEventId:  input.integrationSyncEventId ?? null,
        source:                  input.source,
        guestNameSnapshot:       input.guestName,
        score:                   input.score,
        comment:                 input.comment,
        externalReviewId:        input.externalReviewId ?? null,
        externalSource:          input.externalSource ?? null,
        analysisSource:          "none",
      })
      .returning({ id: schema.feedback.id })

    if (!row) throw new Error("Failed to insert feedback")
    return { feedbackId: row.id, created: true }
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      const sid = input.externalSource ?? ""
      const rid = input.externalReviewId ?? ""
      if (sid && rid) {
        const id = await findFeedbackByExternalRef(input.organizationId, sid, rid)
        if (id) return { feedbackId: id, created: false }
      }
    }
    throw err
  }
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
  organizationId: string,
  feedbackId: string,
  analysis: ReviewAnalysis
) {
  const t = analysis.recovery_action.type
  if (t === "none" || t === "thank_you_email") return

  const existingRows = await db
    .select({ id: schema.followUpActions.id })
    .from(schema.followUpActions)
    .where(
      and(
        eq(schema.followUpActions.organizationId, organizationId),
        eq(schema.followUpActions.feedbackId, feedbackId),
        eq(schema.followUpActions.actionType, t),
      ),
    )
    .orderBy(desc(schema.followUpActions.createdAt))
    .limit(1)

  if (existingRows.length > 0) return

  await db.insert(schema.followUpActions).values({
    organizationId,
    feedbackId,
    actionType:   t,
    status:       "pending",
    channel:      analysis.recovery_action.channel,
    priority:     analysis.recovery_action.priority,
    messageDraft:
      analysis.recovery_action.message_draft ??
      analysis.recovery_action.subject ??
      null,
  })
}

export async function patchCustomerRiskOnly(
  organizationId: string,
  customerId: string,
  analysis: ReviewAnalysis
) {
  const risk = mapRiskStatusToCustomerColumn(analysis.risk_status_update)
  await db
    .update(schema.customers)
    .set({ riskStatus: risk, updatedAt: new Date() })
    .where(
      and(
        eq(schema.customers.id, customerId),
        eq(schema.customers.organizationId, organizationId),
      ),
    )
}

async function readStoredAnalysis(
  organizationId: string,
  feedbackId: string
): Promise<{
  analysis: ReviewAnalysis
  analysisSource: "model" | "rules_fallback" | "invalid_model"
} | null> {
  const [row] = await db
    .select({
      analysisSource: schema.feedback.analysisSource,
      analysisJson:   schema.feedback.analysisJson,
    })
    .from(schema.feedback)
    .where(
      and(
        eq(schema.feedback.id, feedbackId),
        eq(schema.feedback.organizationId, organizationId),
      ),
    )
    .limit(1)

  if (!row) throw new Error("Feedback not found")

  if (!row.analysisSource || row.analysisSource === "none") return null

  const parsed = ReviewAnalysisSchema.safeParse(row.analysisJson)
  if (!parsed.success) return null

  const analysisSource =
    row.analysisSource === "model"
      ? "model"
      : row.analysisSource === "invalid_model"
        ? "invalid_model"
        : "rules_fallback"

  return {
    analysis: parsed.data,
    analysisSource,
  }
}

async function readCurrentFeedbackState(
  organizationId: string,
  feedbackId: string
): Promise<{ followUpStatus: string; flagged: boolean }> {
  const [row] = await db
    .select({
      followUpStatus: schema.feedback.followUpStatus,
      flagged:        schema.feedback.flagged,
    })
    .from(schema.feedback)
    .where(
      and(
        eq(schema.feedback.id, feedbackId),
        eq(schema.feedback.organizationId, organizationId),
      ),
    )
    .limit(1)

  if (!row) throw new Error("Feedback not found")

  return {
    followUpStatus: row.followUpStatus ?? "none",
    flagged: Boolean(row.flagged),
  }
}

type PersistFeedbackAnalysisContext = {
  guestName: string
  score: number
  comment: string
  source: string
  customerId: string | null
  guestHistory?: GuestHistoryInput
}

async function persistNormalizedFeedbackAnalysis(
  organizationId: string,
  feedbackId: string,
  ctx: PersistFeedbackAnalysisContext,
  analysis: ReviewAnalysis,
  analysisSource: "model" | "rules_fallback" | "invalid_model"
) {
  const flagged = analysis.safety_flag || analysis.urgency >= 4 || analysis.sentiment === "negative"
  const currentState = await readCurrentFeedbackState(organizationId, feedbackId)

  let persistedFollowUpStatus = analysis.follow_up_status
  let persistedFlagged = flagged

  if (
    currentState.followUpStatus === "resolved" ||
    currentState.followUpStatus === "thankyou_sent"
  ) {
    persistedFollowUpStatus = currentState.followUpStatus as "resolved" | "thankyou_sent"
    persistedFlagged = false
  }

  await db
    .update(schema.feedback)
    .set({
      sentiment:      analysis.sentiment,
      topics:         analysis.topics,
      urgency:        analysis.urgency,
      safetyFlag:     analysis.safety_flag,
      followUpStatus: persistedFollowUpStatus,
      flagged:        persistedFlagged,
      replyDraft:     analysis.reply_draft ?? null,
      internalNote:   analysis.internal_note,
      managerSummary: analysis.manager_summary,
      analysisJson:   analysis as unknown as Record<string, unknown>,
      analysisSource,
      updatedAt:      new Date(),
    })
    .where(
      and(
        eq(schema.feedback.id, feedbackId),
        eq(schema.feedback.organizationId, organizationId),
      ),
    )

  if (ctx.customerId) {
    await patchCustomerRiskOnly(organizationId, ctx.customerId, analysis)
  }

  await maybeInsertFollowUp(organizationId, feedbackId, analysis)

  await recordAiAction({
    organizationId,
    entityType:   "feedback",
    entityId:     feedbackId,
    triggerType:  "feedback.received",
    actionType:   "customer_service.analyze_review",
    inputSummary: `${ctx.guestName} - score ${ctx.score} - ${ctx.source}`,
    outputPayload: {
      sentiment:   analysis.sentiment,
      urgency:     analysis.urgency,
      safety_flag: analysis.safety_flag,
      source:      analysisSource,
    },
    status: "executed",
  })

  return {
    analysis,
    analysisSource,
    flagged: persistedFlagged,
    followUpStatus: persistedFollowUpStatus,
  }
}

export async function persistAgentFeedbackAnalysis(
  organizationId: string,
  feedbackId: string,
  ctx: PersistFeedbackAnalysisContext,
  rawAnalysis: Record<string, unknown>,
  analysisSource: "model" | "rules_fallback" | "invalid_model" = "model"
) {
  const cleaned = stripAgentMeta(rawAnalysis)
  const analysis = parseAndApplyReviewBusinessRules(cleaned, {
    score:        ctx.score,
    source:       ctx.source,
    guestHistory: ctx.guestHistory ?? null,
    comment:      ctx.comment,
  })

  return persistNormalizedFeedbackAnalysis(
    organizationId,
    feedbackId,
    ctx,
    analysis,
    analysisSource
  )
}

/**
 * Runs model (if key present) + deterministic rules, persists analysis, ai_action, optional follow_up.
 */
export async function analyzeAndPersistFeedback(
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

  let guestHistory: GuestHistoryInput = null
  if (ctx.customerId) {
    guestHistory = await buildGuestHistory(organizationId, ctx.customerId)
  }

  let stored = null as {
    analysis: ReviewAnalysis
    analysisSource: "model" | "rules_fallback" | "invalid_model"
  } | null

  if (opts?.skipIfAlreadyAnalyzed) {
    stored = await readStoredAnalysis(organizationId, feedbackId)
  }

  let analysis: ReviewAnalysis
  let analysisSource: "model" | "rules_fallback" | "invalid_model" = "rules_fallback"

  if (stored) {
    analysis = stored.analysis
    analysisSource = stored.analysisSource
  } else if (process.env.ANTHROPIC_API_KEY) {
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

  await persistNormalizedFeedbackAnalysis(
    organizationId,
    feedbackId,
    {
      ...ctx,
      guestHistory,
    },
    analysis,
    analysisSource
  )
}

export async function markFeedbackReplyApproved(
  organizationId: string,
  feedbackId: string
) {
  const [row] = await db
    .select({
      id:         schema.feedback.id,
      source:     schema.feedback.source,
      replyDraft: schema.feedback.replyDraft,
    })
    .from(schema.feedback)
    .where(
      and(
        eq(schema.feedback.id, feedbackId),
        eq(schema.feedback.organizationId, organizationId),
      ),
    )
    .limit(1)

  if (!row) throw new Error("Feedback not found")

  if (row.source !== "google" && row.source !== "yelp") {
    throw new Error("Only public Google or Yelp reviews can be approved from this card.")
  }
  if (!row.replyDraft?.trim()) {
    throw new Error("No public reply draft is available for this review.")
  }

  const [pendingCountResult] = await db
    .select({ count: count() })
    .from(schema.followUpActions)
    .where(
      and(
        eq(schema.followUpActions.organizationId, organizationId),
        eq(schema.followUpActions.feedbackId, feedbackId),
        eq(schema.followUpActions.status, "pending"),
      ),
    )

  if (Number(pendingCountResult?.count ?? 0) > 0) {
    throw new Error("This review already has a pending follow-up plan. Approve or dismiss that plan below instead.")
  }

  await db
    .update(schema.feedback)
    .set({
      flagged:        false,
      followUpStatus: "resolved",
      updatedAt:      new Date(),
    })
    .where(
      and(
        eq(schema.feedback.id, feedbackId),
        eq(schema.feedback.organizationId, organizationId),
      ),
    )
}

export async function setFollowUpActionDecision(
  organizationId: string,
  actionId: string,
  decision: "approve" | "dismiss"
) {
  const [actionRow] = await db
    .select({
      id:         schema.followUpActions.id,
      feedbackId: schema.followUpActions.feedbackId,
    })
    .from(schema.followUpActions)
    .where(
      and(
        eq(schema.followUpActions.id, actionId),
        eq(schema.followUpActions.organizationId, organizationId),
      ),
    )
    .limit(1)

  if (!actionRow) throw new Error("Follow-up action not found")

  const status = decision === "approve" ? "approved" : "dismissed"
  await db
    .update(schema.followUpActions)
    .set({ status, updatedAt: new Date() })
    .where(
      and(
        eq(schema.followUpActions.id, actionId),
        eq(schema.followUpActions.organizationId, organizationId),
      ),
    )

  const feedbackId = actionRow.feedbackId
  const [pendingCountResult] = await db
    .select({ count: count() })
    .from(schema.followUpActions)
    .where(
      and(
        eq(schema.followUpActions.organizationId, organizationId),
        eq(schema.followUpActions.feedbackId, feedbackId),
        eq(schema.followUpActions.status, "pending"),
      ),
    )

  if (Number(pendingCountResult?.count ?? 0) === 0) {
    await db
      .update(schema.feedback)
      .set({
        flagged:        false,
        followUpStatus: "resolved",
        updatedAt:      new Date(),
      })
      .where(
        and(
          eq(schema.feedback.id, feedbackId),
          eq(schema.feedback.organizationId, organizationId),
        ),
      )
  }
}

export async function setFeedbackFlagged(
  organizationId: string,
  feedbackId: string,
  flagged: boolean
) {
  await readCurrentFeedbackState(organizationId, feedbackId)

  await db
    .update(schema.feedback)
    .set({ flagged, updatedAt: new Date() })
    .where(
      and(
        eq(schema.feedback.id, feedbackId),
        eq(schema.feedback.organizationId, organizationId),
      ),
    )
}

export async function enqueueFollowUpFromBody(
  organizationId: string,
  feedbackId: string,
  body: { actionType: string; channel: string; priority: string; messageDraft?: string }
) {
  await readCurrentFeedbackState(organizationId, feedbackId)

  const existingRows = await db
    .select({ id: schema.followUpActions.id })
    .from(schema.followUpActions)
    .where(
      and(
        eq(schema.followUpActions.organizationId, organizationId),
        eq(schema.followUpActions.feedbackId, feedbackId),
        eq(schema.followUpActions.actionType, body.actionType),
        eq(schema.followUpActions.status, "pending"),
      ),
    )
    .limit(1)

  if (existingRows.length === 0) {
    await db.insert(schema.followUpActions).values({
      organizationId,
      feedbackId,
      actionType:   body.actionType,
      status:       "pending",
      channel:      body.channel,
      priority:     body.priority,
      messageDraft: body.messageDraft ?? null,
    })
  }

  await db
    .update(schema.feedback)
    .set({
      flagged:        true,
      followUpStatus: "callback_needed",
      updatedAt:      new Date(),
    })
    .where(
      and(
        eq(schema.feedback.id, feedbackId),
        eq(schema.feedback.organizationId, organizationId),
      ),
    )
}

export async function resolveCustomerIdByEmail(
  organizationId: string,
  email: string
): Promise<string | null> {
  const [row] = await db
    .select({ id: schema.customers.id })
    .from(schema.customers)
    .where(
      and(
        eq(schema.customers.organizationId, organizationId),
        ilike(schema.customers.email, email.trim()),
      ),
    )
    .limit(1)

  return row?.id ?? null
}
