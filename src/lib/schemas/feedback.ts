import { z } from "zod"
import { FEEDBACK_FOLLOW_UP_STATUS, FEEDBACK_SOURCE } from "@/lib/constants/enums"

const UuidLikeSchema = z.string().regex(
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  "Invalid UUID"
)

const CreateFeedbackBaseSchema = z.object({
  guestName:     z.string().min(1).max(200),
  score:         z.number().int().min(1).max(5),
  comment:       z.string().max(8000),
  appointmentId: UuidLikeSchema.optional(),
  analyze:       z.boolean().optional().default(true),
})

export const CreateReviewSchema = z.object({
  guestName: z.string().min(1),
  score:     z.number().int().min(1).max(5),
  comment:   z.string().min(1),
  source:    z.enum(["internal", "google", "yelp", "opentable"]),
  guestId:   UuidLikeSchema,
})

export type CreateReviewBody = z.infer<typeof CreateReviewSchema>

export const FeedbackSubmitBodySchema = CreateFeedbackBaseSchema.extend({
  comment:    z.string().max(8000).default(""),
  source:     z.enum(FEEDBACK_SOURCE).default("internal"),
  customerId: UuidLikeSchema.optional(),
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
  appointmentId: UuidLikeSchema,
})

export const FeedbackRowSchema = z.object({
  id:              UuidLikeSchema,
  organizationId:  UuidLikeSchema,
  customerId:      UuidLikeSchema.nullable(),
  appointmentId:   UuidLikeSchema.nullable(),
  source:          z.enum(FEEDBACK_SOURCE),
  guestName:       z.string().nullable(),
  score:           z.number().int().min(1).max(5),
  comment:         z.string(),
  sentiment:       z.enum(["positive", "neutral", "negative"]).nullable(),
  topics:          z.array(z.string()),
  urgency:         z.number().int().min(1).max(5),
  safetyFlag:      z.boolean(),
  followUpStatus:  z.enum(FEEDBACK_FOLLOW_UP_STATUS),
  flagged:         z.boolean(),
  replyDraft:      z.string().nullable(),
  internalNote:    z.string().nullable(),
  managerSummary:  z.string().nullable(),
  receivedAt:      z.string(),
})

export type FeedbackRow = z.infer<typeof FeedbackRowSchema>
