import { z } from "zod"
import { FEEDBACK_TOPIC, FEEDBACK_FOLLOW_UP_STATUS, FEEDBACK_SOURCE } from "@/lib/constants/enums"

/** Frozen output contract for customer-service review analysis (aligned with CLAUDE.md + agent.js). */
export const RecoveryActionTypeSchema = z.enum([
  "none",
  "thank_you_email",
  "personal_call",
  "comp_offer",
  "refund",
  "urgent_escalation",
])

export const RecoveryActionSchema = z.object({
  type:          RecoveryActionTypeSchema,
  message_draft: z.string().nullable().optional(),
  subject:       z.string().optional(),
  channel:       z.enum(["email", "sms", "phone", "none"]),
  priority:      z.enum(["low", "normal", "high", "urgent"]),
})

export const ReviewAnalysisSchema = z.object({
  sentiment:           z.enum(["positive", "neutral", "negative"]),
  score_label:         z.enum(["excellent", "good", "mixed", "poor", "critical"]),
  topics:              z.array(z.enum(FEEDBACK_TOPIC)),
  urgency:             z.number().int().min(1).max(5),
  safety_flag:         z.boolean(),
  churn_risk:          z.enum(["low", "medium", "high"]),
  risk_status_update:  z.enum(["healthy", "at_risk", "churned"]),
  reply_draft:         z.string().nullable().optional(),
  internal_note:       z.string(),
  recovery_action:     RecoveryActionSchema,
  follow_up_status:    z.enum(FEEDBACK_FOLLOW_UP_STATUS),
  manager_summary:     z.string(),
  auto_send_thank_you: z.boolean().optional(),
})

export type ReviewAnalysis = z.infer<typeof ReviewAnalysisSchema>

export const FeedbackSourceInputSchema = z.enum(FEEDBACK_SOURCE)

export type FeedbackSourceInput = z.infer<typeof FeedbackSourceInputSchema>
