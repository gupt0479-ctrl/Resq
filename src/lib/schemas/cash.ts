import { z } from "zod"

// ─── Cash Position ─────────────────────────────────────────────────────────

export const CashPositionSchema = z.object({
  currentCash: z.number(),
  openReceivables: z.number(),
  cashCollected90d: z.number(),
})

// ─── Collection Lag ────────────────────────────────────────────────────────

export const CollectionLagTierSchema = z.enum(["on_time", "slightly_late", "very_late"])

export const ClientCollectionLagSchema = z.object({
  clientId: z.string().uuid(),
  clientName: z.string(),
  avgDaysToCollect: z.number().nonnegative(),
  tier: CollectionLagTierSchema,
  paidInvoiceCount: z.number().int().nonnegative(),
  onTimePercent: z.number().min(0).max(100),
})

// ─── Weekly Forecast Bucket ────────────────────────────────────────────────

export const WeeklyBucketSchema = z.object({
  weekNumber: z.number().int().min(1).max(13),
  startDate: z.string(),
  endDate: z.string(),
  projectedInflows: z.number(),
  projectedOutflows: z.number(),
  endingBalance: z.number(),
  assumptionTags: z.array(z.string()).min(1),
})

export const ForecastScenarioSchema = z.object({
  scenarioType: z.enum(["base", "stress", "upside"]),
  weeks: z.array(WeeklyBucketSchema).length(13),
})

export const ForecastResponseSchema = z.object({
  base: ForecastScenarioSchema,
  stress: ForecastScenarioSchema,
  upside: ForecastScenarioSchema,
  generatedAt: z.string(),
  organizationId: z.string().uuid(),
})

// ─── Breakpoint ────────────────────────────────────────────────────────────

export const BreakpointResultSchema = z.object({
  detected: z.boolean(),
  weekNumber: z.number().int().min(1).max(13).nullable(),
  shortfallAmount: z.number().nullable(),
  thresholdUsed: z.number(),
  minimumProjectedBalance: z.number(),
  label: z.string(), // "Week 4" or "No risk"
})

// ─── Risk Driver ───────────────────────────────────────────────────────────

export const RiskDriverCategorySchema = z.enum([
  "receivable_slippage",
  "expense_spike",
  "revenue_shortfall",
  "tax_obligation",
  "recurring_obligation_increase",
])

export const RiskDriverSchema = z.object({
  category: RiskDriverCategorySchema,
  description: z.string(),
  cashImpact: z.number(),
  entityRef: z.string().nullable(),
})

// ─── Intervention ──────────────────────────────────────────────────────────

export const InterventionCategorySchema = z.enum([
  "accelerate_collection",
  "secure_financing",
  "defer_payment",
  "reduce_expense",
])

export const InterventionSchema = z.object({
  id: z.string().uuid(),
  category: InterventionCategorySchema,
  description: z.string(),
  cashImpactEstimate: z.number(),
  speedDays: z.number().int().nonnegative(),
  riskLevel: z.enum(["low", "medium", "high"]),
  confidenceScore: z.number().min(0).max(1),
  sourceAttribution: z.string().nullable(),
  executable: z.boolean(),
})

// ─── Cash Summary (4 metric boxes) ─────────────────────────────────────────

export const MetricBoxSchema = z.object({
  label: z.string(),
  value: z.string(),
  numericValue: z.number().nullable(),
  detail: z.string().nullable(),
})

export const CashSummaryResponseSchema = z.object({
  currentCashPosition: MetricBoxSchema,
  cashCollected: MetricBoxSchema,
  breakpointWeek: MetricBoxSchema,
  largestRiskDriver: MetricBoxSchema,
  deviation: z.object({
    oldBreakpointWeek: z.number().nullable(),
    newBreakpointWeek: z.number().nullable(),
    triggerEvent: z.string(),
    summary: z.string(),
    urgency: z.enum(["normal", "critical"]),
    createdAt: z.string(),
  }).nullable(),
  organizationId: z.string().uuid(),
  generatedAt: z.string(),
})

// ─── Cash Obligation ───────────────────────────────────────────────────────

export const CashObligationCategorySchema = z.enum([
  "payroll", "rent", "tax", "vendor_bill", "insurance", "loan_payment", "other",
])

export const CashObligationRecurrenceSchema = z.enum([
  "one_time", "weekly", "biweekly", "monthly", "quarterly", "annual",
])

export const CashObligationSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  category: CashObligationCategorySchema,
  description: z.string(),
  amount: z.number(),
  dueAt: z.string(),
  recurrence: CashObligationRecurrenceSchema,
  isActive: z.boolean(),
})

// ─── Analysis Response (POST /api/cash/analyze) ────────────────────────────

export const ClientSummaryBoxesSchema = z.object({
  totalOutstanding: z.number(),
  avgDaysToPay: z.number(),
  paymentReliabilityPercent: z.number().min(0).max(100),
  riskClassification: z.enum(["forgot", "cash_flow", "disputing", "bad_actor"]),
})

export const AnalysisResponseSchema = z.object({
  organizationId: z.string().uuid(),
  clientId: z.string().uuid(),
  clientName: z.string(),

  // 4 client summary boxes
  clientSummary: ClientSummaryBoxesSchema,

  // Collection lag for this client
  collectionLag: ClientCollectionLagSchema,

  // AI-generated natural language summary
  aiSummary: z.string(),

  // TinyFish external findings
  externalFindings: z.object({
    newsSummary: z.string(),
    rawSnippets: z.array(z.string()),
    distressFlag: z.boolean(),
    dataSource: z.enum(["live", "mock"]),
  }),

  // Ranked interventions (read-only context list)
  interventions: z.array(InterventionSchema),

  // The single top-ranked recommended action
  recommendedAction: InterventionSchema.nullable(),

  // Breakpoint context
  breakpoint: BreakpointResultSchema,

  // Top risk drivers
  riskDrivers: z.array(RiskDriverSchema),

  // Audit
  auditRecordId: z.string().uuid(),
  mode: z.enum(["live", "mock"]),
  degradedFromLive: z.boolean(),
  warning: z.string().nullable(),
  generatedAt: z.string(),
})

// ─── Action Execution ──────────────────────────────────────────────────────

export const ActionExecuteRequestSchema = z.object({
  interventionId: z.string().uuid(),
})

export const ActionExecuteResponseSchema = z.object({
  status: z.enum(["executed", "failed", "requires_manual"]),
  auditRecordId: z.string().uuid(),
  executionType: z.string(),
  artifacts: z.object({
    draftEmailContent: z.string().nullable(),
    taskDescription: z.string().nullable(),
  }).nullable(),
  guidanceText: z.string().nullable(),
})

// ─── Deviation ─────────────────────────────────────────────────────────────

export const DeviationRecordSchema = z.object({
  oldBreakpointWeek: z.number().int().nullable(),
  newBreakpointWeek: z.number().int().nullable(),
  triggerEvent: z.string(),
  summary: z.string(),
  urgency: z.enum(["normal", "critical"]),
  createdAt: z.string(),
})

// ─── Inferred Types ────────────────────────────────────────────────────────

export type CashPosition = z.infer<typeof CashPositionSchema>
export type CollectionLagTier = z.infer<typeof CollectionLagTierSchema>
export type ClientCollectionLag = z.infer<typeof ClientCollectionLagSchema>
export type WeeklyBucket = z.infer<typeof WeeklyBucketSchema>
export type ForecastScenario = z.infer<typeof ForecastScenarioSchema>
export type ForecastResponse = z.infer<typeof ForecastResponseSchema>
export type BreakpointResult = z.infer<typeof BreakpointResultSchema>
export type RiskDriverCategory = z.infer<typeof RiskDriverCategorySchema>
export type RiskDriver = z.infer<typeof RiskDriverSchema>
export type InterventionCategory = z.infer<typeof InterventionCategorySchema>
export type Intervention = z.infer<typeof InterventionSchema>
export type MetricBox = z.infer<typeof MetricBoxSchema>
export type CashSummaryResponse = z.infer<typeof CashSummaryResponseSchema>
export type CashObligationCategory = z.infer<typeof CashObligationCategorySchema>
export type CashObligationRecurrence = z.infer<typeof CashObligationRecurrenceSchema>
export type CashObligation = z.infer<typeof CashObligationSchema>
export type ClientSummaryBoxes = z.infer<typeof ClientSummaryBoxesSchema>
export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>
export type ActionExecuteRequest = z.infer<typeof ActionExecuteRequestSchema>
export type ActionExecuteResponse = z.infer<typeof ActionExecuteResponseSchema>
export type DeviationRecord = z.infer<typeof DeviationRecordSchema>
