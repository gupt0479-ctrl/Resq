import { z } from "zod"
import { FEEDBACK_FOLLOW_UP_STATUS, FEEDBACK_SOURCE } from "@/lib/constants/enums"

export const FeedbackSubmitBodySchema = z.object({
  guestName:   z.string().min(1).max(200),
  score:       z.number().int().min(1).max(5),
  comment:     z.string().max(8000).default(""),
  source:      z.enum(FEEDBACK_SOURCE).default("internal"),
  customerId:  z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  /** When true, runs analysis after insert (requires ANTHROPIC_API_KEY for model path). */
  analyze:     z.boolean().optional().default(true),
})

export type FeedbackSubmitBody = z.infer<typeof FeedbackSubmitBodySchema>

export const FeedbackFlagBodySchema = z.object({
  flagged: z.boolean(),
})

export const FeedbackFollowUpDecisionBodySchema = z.object({
  decision: z.enum(["approve", "dismiss"]),
})

export const FeedbackFollowUpBodySchema = z.object({
  actionType:    z.string().min(1).max(120),
  channel:       z.enum(["email", "sms", "phone", "none"]).default("email"),
  priority:      z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  messageDraft:  z.string().max(8000).optional(),
})

export const FeedbackRequestParamsSchema = z.object({
  appointmentId: z.string().uuid(),
})

export const FeedbackRowSchema = z.object({
  id:              z.string().uuid(),
  organizationId:  z.string().uuid(),
  customerId:      z.string().uuid().nullable(),
  appointmentId:   z.string().uuid().nullable(),
  source:          z.string(),
  guestName:       z.string().nullable(),
  score:           z.number(),
  comment:         z.string(),
  sentiment:       z.string().nullable(),
  topics:          z.array(z.string()),
  urgency:         z.number(),
  safetyFlag:      z.boolean(),
  followUpStatus:  z.enum(FEEDBACK_FOLLOW_UP_STATUS),
  flagged:         z.boolean(),
  replyDraft:      z.string().nullable(),
  internalNote:    z.string().nullable(),
  managerSummary:  z.string().nullable(),
  receivedAt:      z.string(),
})

export type FeedbackRow = z.infer<typeof FeedbackRowSchema>
