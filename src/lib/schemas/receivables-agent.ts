import { z } from "zod"

export const CreditRedFlagSchema = z.object({
  flag:     z.enum(["late_payments", "charged_off", "unfamiliar_accounts", "maxed_out_credit", "address_changes"]),
  label:    z.string(),
  severity: z.enum(["none", "warning", "critical"]),
  detail:   z.string(),
})

export const CreditReportSchema = z.object({
  redFlags:       z.array(CreditRedFlagSchema),
  flagCount:      z.number(),
  overallStatus:  z.enum(["clean", "caution", "high_risk"]),
})

export const VerificationChecksSchema = z.object({
  businessNameVerified:  z.boolean(),
  addressVerified:       z.boolean(),
  peopleVerified:        z.boolean(),
  tinMatch:              z.boolean(),
  watchlistsClear:       z.boolean(),
  bankAccountVerified:   z.boolean(),
  taxCompliant:          z.boolean(),
  ownerKycComplete:      z.boolean(),
  creditHistoryCheck:    z.enum(["passed", "failed", "limited_data"]),
  utilityBillVerified:   z.boolean(),
  onlinePresenceVerified: z.boolean(),
})

export const RiskFactorSchema = z.object({
  label:    z.string(),
  score:    z.number().min(0).max(100),
  weight:   z.number().min(0).max(1),
  evidence: z.string(),
})

export const AgentStepSchema = z.object({
  tool:    z.string(),
  summary: z.string(),
  result:  z.unknown(),
})

export const WATCHLIST_IDS = [
  "ofac", "interpol", "fatf", "eu_sanctions",
  "sdl", "un_security_council", "world_bank", "bis_entity",
] as const
export type WatchlistId = typeof WATCHLIST_IDS[number]

export const WATCHLIST_LABELS: Record<WatchlistId, string> = {
  ofac:                "OFAC Sanctions List",
  interpol:            "Interpol Most Wanted",
  fatf:                "FATF High-Risk Jurisdictions",
  eu_sanctions:        "EU Consolidated Sanctions",
  sdl:                 "SDN List (US Treasury)",
  un_security_council: "UN Security Council Sanctions",
  world_bank:          "World Bank Debarred Entities",
  bis_entity:          "U.S. BIS Entity List",
}

export const WatchlistHitSchema = z.object({
  list:   z.enum(WATCHLIST_IDS),
  label:  z.string(),
  status: z.enum(["clear", "flagged", "inconclusive"]),
  detail: z.string(),
})

export const WatchlistScreeningSchema = z.object({
  screenedNames: z.array(z.string()),
  hits:          z.array(WatchlistHitSchema),
  overallStatus: z.enum(["clear", "review_required", "flagged"]),
  dataSource:    z.enum(["live", "mock", "not_run"]),
})

export const CompanyInfoSchema = z.object({
  companyName: z.string().optional(),
  email:       z.string().optional(),
  phone:       z.string().optional(),
  address:     z.string().optional(),
  keyPeople:   z.array(z.string()).optional(),
})

export const ExternalSignalArticleSchema = z.object({
  title:     z.string(),
  url:       z.string(),
  snippet:   z.string(),
  relevance: z.enum(["high", "medium", "low"]),
})

export const ExternalSignalsSchema = z.object({
  searched:      z.boolean(),
  articles:      z.array(ExternalSignalArticleSchema),
  marketContext: z.string(),
  dataSource:    z.enum(["live", "mock", "not_run"]),
})

export const ReceivablesInvestigationResultSchema = z.object({
  customerId:         z.string(),
  customerName:       z.string(),
  invoiceIds:         z.array(z.string()),
  totalOverdue:       z.number(),
  overdueDays:        z.number(),
  riskScore:          z.number().min(0).max(100),
  riskLevel:          z.enum(["low", "medium", "high", "critical"]),
  companyInfo:        CompanyInfoSchema.optional(),
  verificationChecks: VerificationChecksSchema,
  creditReport:       CreditReportSchema,
  watchlistScreening: WatchlistScreeningSchema.optional(),
  externalSignals:    ExternalSignalsSchema.optional(),
  riskFactors:        z.array(RiskFactorSchema),
  recommendedAction:  z.enum(["reminder", "payment_plan", "escalation", "write_off"]),
  actionDraft:        z.string(),
  reasoning:          z.string(),
  agentSteps:         z.array(AgentStepSchema),
})

export type WatchlistHit = z.infer<typeof WatchlistHitSchema>
export type WatchlistScreening = z.infer<typeof WatchlistScreeningSchema>
export type CompanyInfo = z.infer<typeof CompanyInfoSchema>
export type CreditRedFlag = z.infer<typeof CreditRedFlagSchema>
export type CreditReport  = z.infer<typeof CreditReportSchema>
export type ExternalSignalArticle = z.infer<typeof ExternalSignalArticleSchema>
export type ExternalSignals = z.infer<typeof ExternalSignalsSchema>
export type VerificationChecks = z.infer<typeof VerificationChecksSchema>
export type RiskFactor = z.infer<typeof RiskFactorSchema>
export type AgentStep = z.infer<typeof AgentStepSchema>
export type ReceivablesInvestigationResult = z.infer<typeof ReceivablesInvestigationResultSchema>
