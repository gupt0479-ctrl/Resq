import { z } from "zod"

export const KycStatusSchema = z.enum([
  "not_started",
  "pending",
  "in_progress",
  "completed_verified",
  "completed_review",
  "completed_flagged",
  "completed_failed",
])

export const KycBandSchema = z.enum(["verified", "review", "flagged", "failed"])

export const KycCheckTypeSchema = z.enum([
  "business_name",
  "office_address",
  "people_verification",
  "watchlist_screening",
  "bank_account",
  "owner_kyc",
  "adverse_media",
  "website_presence",
])

// POST /api/kyc — create a new verification request
export const CreateKycRequestSchema = z.object({
  customerId:         z.string().uuid(),
  invoiceId:          z.string().uuid().optional(),
  businessName:       z.string().min(1),
  registeredState:    z.string().length(2).optional(),
  businessAddress:    z.string().min(5).optional(),
  websiteUrl:         z.string().url().optional(),
  directorName:       z.string().min(1).optional(),
  directorDob:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  bankAccountLast4:   z.string().length(4).optional(),
  bankRoutingNumber:  z.string().length(9).optional(),
})

// PATCH /api/kyc/verification/[token] — client submits their info
export const SubmitVerificationDataSchema = z.object({
  businessName:      z.string().min(1),
  registeredState:   z.string().length(2),
  businessAddress:   z.string().min(5),
  websiteUrl:        z.string().url(),
  directorName:      z.string().min(1),
  directorDob:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bankAccountLast4:  z.string().length(4),
  bankRoutingNumber: z.string().length(9),
})

// POST /api/kyc/[requestId]/operator-action
export const OperatorActionSchema = z.object({
  action:  z.enum(["escalate_to_legal", "override_and_approve", "decline_and_blacklist"]),
  notes:   z.string().optional(),
  actorId: z.string().optional(),
})

// POST /api/kyc/[requestId]/check/[checkType] — optional override data
export const RunCheckOverrideSchema = z.object({
  forceRerun: z.boolean().optional(),
})

// POST /api/kyc/[requestId]/run — kick off all pending checks
export const RunAllChecksSchema = z.object({
  startFromCheck: KycCheckTypeSchema.optional(),
})
