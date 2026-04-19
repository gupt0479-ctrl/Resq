import { z } from "zod"

// ─── Portal Reconnaissance Mode ────────────────────────────────────────────

export const PortalReconnaissanceModeSchema = z.enum(["live", "mock", "misconfigured"])
export type PortalReconnaissanceMode = z.infer<typeof PortalReconnaissanceModeSchema>

// ─── Screenshot ────────────────────────────────────────────────────────────

export const ScreenshotSchema = z.object({
  step:      z.enum(["login", "invoice_list", "invoice_detail", "payment_status", "message_sent"]),
  url:       z.string(), // S3 URL or base64 data URI
  timestamp: z.string(),
  invoiceId: z.string(),
})
export type Screenshot = z.infer<typeof ScreenshotSchema>

// ─── Portal Reconnaissance Result ──────────────────────────────────────────

export const PortalReconnaissanceResultSchema = z.object({
  // Invoice visibility
  visibility:           z.boolean(),
  visibilityReason:     z.string().nullable(),
  visibilityConfidence: z.number().min(0).max(100),

  // Payment status
  paymentStatus:        z.enum(["unpaid", "processing", "paid", "failed", "unknown"]),
  paymentDate:          z.string().nullable(),
  paymentMethod:        z.string().nullable(),
  shouldSkipCollection: z.boolean(),

  // Customer activity
  lastLoginAt:          z.string().nullable(),
  hasRecentActivity:    z.boolean(), // within 7 days
  invoiceViewCount:     z.number().nullable(),
  invoiceViewTimestamps: z.array(z.string()),
  engagementLevel:      z.enum(["high", "medium", "low", "none"]),
  activityConfidence:   z.number().min(0).max(100),

  // Messaging
  messageSent:          z.boolean(),
  messageSentAt:        z.string().nullable(),
  messageFailureReason: z.string().nullable(),

  // Proof and audit
  screenshots:          z.array(ScreenshotSchema),
  portalUrl:            z.string(),
  tinyfishRunId:        z.string().nullable(),

  // Error handling
  authFailed:           z.boolean(),
  botDetected:          z.boolean(),
  parsingFailed:        z.boolean(),
})
export type PortalReconnaissanceResult = z.infer<typeof PortalReconnaissanceResultSchema>

// ─── Portal Reconnaissance Response ────────────────────────────────────────

export const PortalReconnaissanceResponseSchema = z.object({
  mode:             PortalReconnaissanceModeSchema,
  degradedFromLive: z.boolean(),
  warning:          z.string().nullable(),
  result:           PortalReconnaissanceResultSchema,
})
export type PortalReconnaissanceResponse = z.infer<typeof PortalReconnaissanceResponseSchema>

// ─── Parsed Portal Data ────────────────────────────────────────────────────

export const ParsedInvoiceSchema = z.object({
  invoiceNumber: z.string().nullable(),
  amount:        z.number().nullable(),
  dueDate:       z.string().nullable(),
  status:        z.string().nullable(),
  paymentDate:   z.string().nullable(),
  paymentMethod: z.string().nullable(),
})
export type ParsedInvoice = z.infer<typeof ParsedInvoiceSchema>

export const ParsedActivitySchema = z.object({
  lastLoginAt:    z.string().nullable(),
  viewCount:      z.number().nullable(),
  viewTimestamps: z.array(z.string()),
})
export type ParsedActivity = z.infer<typeof ParsedActivitySchema>

export const ParsedPortalDataSchema = z.object({
  invoices:       z.array(ParsedInvoiceSchema),
  customerActivity: ParsedActivitySchema,
  confidence:     z.number().min(0).max(100),
  parsingErrors:  z.array(z.string()),
})
export type ParsedPortalData = z.infer<typeof ParsedPortalDataSchema>

// ─── Portal Login Result (TinyFish API response) ───────────────────────────

export const PortalLoginResultSchema = z.object({
  mode:             PortalReconnaissanceModeSchema,
  degradedFromLive: z.boolean(),
  warning:          z.string().nullable(),
  status:           z.enum(["COMPLETED", "FAILED", "AUTH_FAILED", "BOT_DETECTED"]),
  result:           z.object({
    authenticated: z.boolean(),
    invoiceFound:  z.boolean(),
    invoiceData:   z.record(z.string(), z.unknown()),
    activityData:  z.record(z.string(), z.unknown()),
    messageSent:   z.boolean(),
    screenshots:   z.array(z.object({
      step: z.string(),
      data: z.string(),
    })),
  }),
  steps: z.array(z.object({
    index:       z.number().int().nonnegative(),
    label:       z.string(),
    observation: z.string(),
    durationMs:  z.number().int().nonnegative(),
  })),
  tinyfishRunId: z.string().nullable(),
})
export type PortalLoginResult = z.infer<typeof PortalLoginResultSchema>

// ─── Portal Recon Scenarios ────────────────────────────────────────────────

export const PortalReconScenarioSchema = z.enum([
  "invoice_visible_unpaid",
  "invoice_visible_processing",
  "invoice_not_visible",
  "high_engagement",
  "low_engagement",
])
export type PortalReconScenario = z.infer<typeof PortalReconScenarioSchema>
