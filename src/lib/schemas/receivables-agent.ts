import { z } from "zod"

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

export const ReceivablesInvestigationResultSchema = z.object({
  customerId:         z.string(),
  customerName:       z.string(),
  invoiceIds:         z.array(z.string()),
  totalOverdue:       z.number(),
  overdueDays:        z.number(),
  riskScore:          z.number().min(0).max(100),
  riskLevel:          z.enum(["low", "medium", "high", "critical"]),
  verificationChecks: VerificationChecksSchema,
  riskFactors:        z.array(RiskFactorSchema),
  recommendedAction:  z.enum(["reminder", "payment_plan", "escalation", "write_off"]),
  actionDraft:        z.string(),
  reasoning:          z.string(),
  agentSteps:         z.array(AgentStepSchema),
})

export type VerificationChecks = z.infer<typeof VerificationChecksSchema>
export type RiskFactor = z.infer<typeof RiskFactorSchema>
export type AgentStep = z.infer<typeof AgentStepSchema>
export type ReceivablesInvestigationResult = z.infer<typeof ReceivablesInvestigationResultSchema>
