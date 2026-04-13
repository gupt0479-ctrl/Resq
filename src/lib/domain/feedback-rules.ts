import type { ReviewAnalysis } from "@/lib/schemas/feedback-ai"
import { ReviewAnalysisSchema } from "@/lib/schemas/feedback-ai"
import { FEEDBACK_TOPIC, type FeedbackTopic } from "@/lib/constants/enums"

const ALLERGY_PATTERN =
  /\b(allergy|allergic|anaphylaxis|illness|food\s*poisoning|contamination|cross[-\s]?contamination|nut|peanut|shellfish|gluten|dairy|sesame|pistachio)\b/i

export type GuestHistoryInput = {
  visitCount?:    number
  lifetimeSpend?: number
  lastVisit?:     string
  vip?:           boolean
  dietaryNotes?: string | null
} | null

/**
 * Validates model output then enforces non-negotiable business rules (deterministic).
 */
export function parseAndApplyReviewBusinessRules(
  raw: unknown,
  ctx: {
    score:        number
    source:       string
    guestHistory: GuestHistoryInput
    comment:      string
  }
): ReviewAnalysis {
  const base = ReviewAnalysisSchema.parse(raw)

  const dietary = ctx.guestHistory?.dietaryNotes ?? ""
  const comment = `${ctx.comment} ${dietary}`.trim()
  let safety_flag = base.safety_flag
  let urgency = base.urgency
  const topics = [...base.topics] as FeedbackTopic[]

  if (ALLERGY_PATTERN.test(comment)) {
    safety_flag = true
    urgency = 5
    if (!topics.includes("allergy_safety")) topics.push("allergy_safety")
  }

  if (ctx.score <= 2) {
    urgency = Math.max(urgency, 3)
  }

  const isVip =
    Boolean(ctx.guestHistory?.vip) ||
    (typeof ctx.guestHistory?.lifetimeSpend === "number" && ctx.guestHistory.lifetimeSpend >= 1200)

  let recovery_action = { ...base.recovery_action }
  if (isVip && recovery_action.type === "none") {
    recovery_action = {
      ...recovery_action,
      type:          "thank_you_email",
      channel:       recovery_action.channel === "none" ? "email" : recovery_action.channel,
      priority:      "normal",
      message_draft: base.manager_summary.slice(0, 2000),
    }
  }

  const src = ctx.source.toLowerCase()
  let reply_draft =
    base.reply_draft === undefined || base.reply_draft === null ? null : base.reply_draft
  if (src === "google" || src === "yelp") {
    if (!reply_draft || !reply_draft.trim()) {
      reply_draft = `Thank you for your review. We are sorry your experience missed the mark and we would appreciate the chance to follow up — please contact Ember Table directly so we can make this right.`
    }
  }

  let follow_up_status = base.follow_up_status
  if (ctx.score >= 5 && src === "internal" && recovery_action.type === "thank_you_email") {
    follow_up_status = "thankyou_sent"
  }

  const uniqueTopics = [...new Set(topics)].filter((t): t is FeedbackTopic =>
    (FEEDBACK_TOPIC as readonly string[]).includes(t)
  )

  return ReviewAnalysisSchema.parse({
    ...base,
    topics: uniqueTopics.length ? uniqueTopics : base.topics,
    urgency,
    safety_flag,
    recovery_action,
    reply_draft,
    follow_up_status,
  })
}

/** When Anthropic is unavailable or JSON is invalid — minimal deterministic classification. */
export function rulesOnlyReviewAnalysis(ctx: {
  guestName:    string
  score:        number
  comment:      string
  source:       string
  guestHistory: GuestHistoryInput
}): ReviewAnalysis {
  const sentiment =
    ctx.score <= 2 ? "negative" :
    ctx.score <= 3 ? "neutral" :
    "positive"

  const comment = `${ctx.comment} ${ctx.guestHistory?.dietaryNotes ?? ""}`
  const safety = ALLERGY_PATTERN.test(comment)
  const urgency = safety ? 5 : ctx.score <= 2 ? 3 : ctx.score <= 3 ? 2 : 1

  const topics: FeedbackTopic[] = []
  if (safety) topics.push("allergy_safety")
  if (/slow|wait/i.test(comment)) topics.push("wait_time")

  const isVip =
    Boolean(ctx.guestHistory?.vip) ||
    (typeof ctx.guestHistory?.lifetimeSpend === "number" && ctx.guestHistory.lifetimeSpend >= 1200)

  let recovery_type:
    | "none"
    | "thank_you_email"
    | "personal_call"
    | "comp_offer"
    | "refund"
    | "urgent_escalation" =
    safety ? "urgent_escalation" :
    ctx.score >= 5 && ctx.source === "internal" ? "thank_you_email" :
    ctx.score <= 2 ? "personal_call" :
    isVip ? "thank_you_email" :
    "none"

  if (isVip && recovery_type === "none") recovery_type = "thank_you_email"

  const recovery_channel =
    recovery_type === "thank_you_email" ? "email" :
    recovery_type === "personal_call" || recovery_type === "urgent_escalation" ? "phone" :
    "none"

  const googleYelp = ctx.source === "google" || ctx.source === "yelp"
  const reply_draft = googleYelp
    ? "Thank you for your feedback — we are reviewing your experience and will respond personally shortly."
    : null

  return ReviewAnalysisSchema.parse({
    sentiment,
    score_label:
      ctx.score <= 1 ? "critical" :
      ctx.score <= 2 ? "poor" :
      ctx.score <= 3 ? "mixed" :
      ctx.score <= 4 ? "good" :
      "excellent",
    topics: topics.length ? topics : ctx.score <= 3 ? ["service_speed"] : ["food_quality"],
    urgency,
    safety_flag: safety,
    churn_risk: ctx.score <= 2 ? "high" : ctx.score <= 3 ? "medium" : "low",
    risk_status_update:
      ctx.score <= 2 ? "at_risk" :
      ctx.score <= 3 ? "at_risk" :
      "healthy",
    reply_draft,
    internal_note: `Rules-only analysis for ${ctx.guestName} (${ctx.source}, ${ctx.score}/5).`,
    recovery_action: {
      type:          recovery_type,
      message_draft: `We value your feedback and would like to follow up regarding your recent visit.`,
      channel:       recovery_channel,
      priority:      safety ? "urgent" : ctx.score <= 2 ? "high" : "low",
    },
    follow_up_status:
      ctx.score >= 5 && ctx.source === "internal" ? "thankyou_sent" :
      ctx.score <= 2 ? "callback_needed" :
      "none",
    manager_summary: `${ctx.guestName}: ${ctx.score}/5 from ${ctx.source}${safety ? " — safety follow-up required" : ""}.`,
  })
}
