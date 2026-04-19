import { describe, it, expect } from "vitest"
import fc from "fast-check"
import {
  CashSummaryResponseSchema,
  MetricBoxSchema,
  AnalysisResponseSchema,
  ClientCollectionLagSchema,
  BreakpointResultSchema,
  RiskDriverSchema,
  InterventionSchema,
  ClientSummaryBoxesSchema,
} from "./cash"

// ─── Shared Arbitraries ────────────────────────────────────────────────────

const arbUuid = fc.uuid().filter((u) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u))

// Safe ISO date string: generate epoch millis in a valid range, then convert
const arbIsoDateString = fc
  .integer({ min: 1577836800000, max: 1924905600000 }) // 2020-01-01 to 2030-12-31
  .map((ms) => new Date(ms).toISOString())

const arbMetricBox = fc.record({
  label: fc.string({ minLength: 1, maxLength: 50 }),
  value: fc.string({ minLength: 1, maxLength: 50 }),
  numericValue: fc.option(fc.double({ noNaN: true, noDefaultInfinity: true }), { nil: null }),
  detail: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
})

const arbDeviation = fc.option(
  fc.record({
    oldBreakpointWeek: fc.option(fc.integer({ min: 1, max: 13 }), { nil: null }),
    newBreakpointWeek: fc.option(fc.integer({ min: 1, max: 13 }), { nil: null }),
    triggerEvent: fc.string({ minLength: 1, maxLength: 100 }),
    summary: fc.string({ minLength: 1, maxLength: 200 }),
    urgency: fc.constantFrom("normal" as const, "critical" as const),
    createdAt: arbIsoDateString,
  }),
  { nil: null },
)

// ─── Property 11: Cash Summary Four Metrics Schema ─────────────────────────
// **Validates: Requirements 1.5, 9.1**

describe("Property 11: Cash Summary Four Metrics Schema", () => {
  const FOUR_METRIC_KEYS = [
    "currentCashPosition",
    "cashCollected",
    "breakpointWeek",
    "largestRiskDriver",
  ] as const

  it("CashSummaryResponse always has four metric boxes conforming to MetricBoxSchema", () => {
    fc.assert(
      fc.property(
        arbMetricBox,
        arbMetricBox,
        arbMetricBox,
        arbMetricBox,
        arbDeviation,
        arbUuid,
        (box1, box2, box3, box4, deviation, orgId) => {
          const response = {
            currentCashPosition: box1,
            cashCollected: box2,
            breakpointWeek: box3,
            largestRiskDriver: box4,
            deviation,
            organizationId: orgId,
            generatedAt: new Date().toISOString(),
          }

          // Full response must parse through CashSummaryResponseSchema
          const result = CashSummaryResponseSchema.safeParse(response)
          expect(result.success).toBe(true)
          if (!result.success) return

          // All four metric keys must be present
          for (const key of FOUR_METRIC_KEYS) {
            expect(result.data).toHaveProperty(key)
          }

          // Each metric box individually conforms to MetricBoxSchema
          for (const key of FOUR_METRIC_KEYS) {
            const boxResult = MetricBoxSchema.safeParse(result.data[key])
            expect(boxResult.success).toBe(true)
          }

          // Each metric box has the required fields
          for (const key of FOUR_METRIC_KEYS) {
            const box = result.data[key]
            expect(box).toHaveProperty("label")
            expect(box).toHaveProperty("value")
            expect(box).toHaveProperty("numericValue")
            expect(box).toHaveProperty("detail")
            expect(typeof box.label).toBe("string")
            expect(typeof box.value).toBe("string")
          }
        },
      ),
      { numRuns: 200 },
    )
  })

  it("rejects response missing any of the four metric boxes", () => {
    fc.assert(
      fc.property(
        arbMetricBox,
        arbMetricBox,
        arbMetricBox,
        fc.constantFrom(...FOUR_METRIC_KEYS),
        arbUuid,
        (box1, box2, box3, missingKey, orgId) => {
          const complete: Record<string, unknown> = {
            currentCashPosition: box1,
            cashCollected: box2,
            breakpointWeek: box1,
            largestRiskDriver: box3,
            deviation: null,
            organizationId: orgId,
            generatedAt: new Date().toISOString(),
          }

          // Remove one of the four required keys
          delete complete[missingKey]

          const result = CashSummaryResponseSchema.safeParse(complete)
          expect(result.success).toBe(false)
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─── Property 12: Mock/Live Structural Equivalence ─────────────────────────
// **Validates: Requirements 11.6**

describe("Property 12: Mock/Live Structural Equivalence", () => {
  // Arbitraries for building a valid AnalysisResponse

  const arbCollectionLagTier = fc.constantFrom(
    "on_time" as const,
    "slightly_late" as const,
    "very_late" as const,
  )

  const arbRiskClassification = fc.constantFrom(
    "forgot" as const,
    "cash_flow" as const,
    "disputing" as const,
    "bad_actor" as const,
  )

  const arbClientSummary = fc.record({
    totalOutstanding: fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
    avgDaysToPay: fc.double({ min: 0, max: 365, noNaN: true, noDefaultInfinity: true }),
    paymentReliabilityPercent: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
    riskClassification: arbRiskClassification,
  })

  const arbCollectionLag = fc.record({
    clientId: arbUuid,
    clientName: fc.string({ minLength: 1, maxLength: 50 }),
    avgDaysToCollect: fc.double({ min: 0, max: 365, noNaN: true, noDefaultInfinity: true }),
    tier: arbCollectionLagTier,
    paidInvoiceCount: fc.integer({ min: 0, max: 1000 }),
    onTimePercent: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
  })

  const arbBreakpoint = fc.record({
    detected: fc.boolean(),
    weekNumber: fc.option(fc.integer({ min: 1, max: 13 }), { nil: null }),
    shortfallAmount: fc.option(
      fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
      { nil: null },
    ),
    thresholdUsed: fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
    minimumProjectedBalance: fc.double({
      min: -1_000_000,
      max: 1_000_000,
      noNaN: true,
      noDefaultInfinity: true,
    }),
    label: fc.string({ minLength: 1, maxLength: 30 }),
  })

  const arbRiskDriverCategory = fc.constantFrom(
    "receivable_slippage" as const,
    "expense_spike" as const,
    "revenue_shortfall" as const,
    "tax_obligation" as const,
    "recurring_obligation_increase" as const,
  )

  const arbRiskDriver = fc.record({
    category: arbRiskDriverCategory,
    description: fc.string({ minLength: 1, maxLength: 200 }),
    cashImpact: fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
    entityRef: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  })

  const arbInterventionCategory = fc.constantFrom(
    "accelerate_collection" as const,
    "secure_financing" as const,
    "defer_payment" as const,
    "reduce_expense" as const,
  )

  const arbIntervention = fc.record({
    id: arbUuid,
    category: arbInterventionCategory,
    description: fc.string({ minLength: 1, maxLength: 200 }),
    cashImpactEstimate: fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
    speedDays: fc.integer({ min: 0, max: 365 }),
    riskLevel: fc.constantFrom("low" as const, "medium" as const, "high" as const),
    confidenceScore: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
    sourceAttribution: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
    executable: fc.boolean(),
  })

  const arbDataSource = fc.constantFrom("live" as const, "mock" as const)

  const arbExternalFindings = fc.record({
    newsSummary: fc.string({ minLength: 1, maxLength: 500 }),
    rawSnippets: fc.array(fc.string({ minLength: 1, maxLength: 200 }), { maxLength: 5 }),
    distressFlag: fc.boolean(),
    dataSource: arbDataSource,
  })

  function buildAnalysisResponseArb(mode: "mock" | "live") {
    return fc.record({
      organizationId: arbUuid,
      clientId: arbUuid,
      clientName: fc.string({ minLength: 1, maxLength: 50 }),
      clientSummary: arbClientSummary,
      collectionLag: arbCollectionLag,
      aiSummary: fc.string({ minLength: 1, maxLength: 500 }),
      externalFindings: arbExternalFindings,
      interventions: fc.array(arbIntervention, { minLength: 0, maxLength: 5 }),
      recommendedAction: fc.option(arbIntervention, { nil: null }),
      breakpoint: arbBreakpoint,
      riskDrivers: fc.array(arbRiskDriver, { minLength: 0, maxLength: 5 }),
      auditRecordId: arbUuid,
      mode: fc.constant(mode),
      degradedFromLive: fc.boolean(),
      warning: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
      generatedAt: arbIsoDateString,
    })
  }

  it("mock mode response parses through AnalysisResponseSchema", () => {
    fc.assert(
      fc.property(buildAnalysisResponseArb("mock"), (response) => {
        const result = AnalysisResponseSchema.safeParse(response)
        expect(result.success).toBe(true)
      }),
      { numRuns: 200 },
    )
  })

  it("live mode response parses through AnalysisResponseSchema", () => {
    fc.assert(
      fc.property(buildAnalysisResponseArb("live"), (response) => {
        const result = AnalysisResponseSchema.safeParse(response)
        expect(result.success).toBe(true)
      }),
      { numRuns: 200 },
    )
  })

  it("same schema validates both modes — structural equivalence", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("mock" as const, "live" as const),
        buildAnalysisResponseArb("mock"),
        (mode, baseResponse) => {
          // Override mode to the randomly chosen one
          const response = { ...baseResponse, mode }

          const result = AnalysisResponseSchema.safeParse(response)
          expect(result.success).toBe(true)

          if (result.success) {
            // Verify mode field is correctly set
            expect(result.data.mode).toBe(mode)

            // Verify all structural fields are present regardless of mode
            expect(result.data).toHaveProperty("clientSummary")
            expect(result.data).toHaveProperty("collectionLag")
            expect(result.data).toHaveProperty("aiSummary")
            expect(result.data).toHaveProperty("externalFindings")
            expect(result.data).toHaveProperty("interventions")
            expect(result.data).toHaveProperty("breakpoint")
            expect(result.data).toHaveProperty("riskDrivers")
            expect(result.data).toHaveProperty("auditRecordId")

            // Sub-schemas validate independently
            expect(ClientSummaryBoxesSchema.safeParse(result.data.clientSummary).success).toBe(true)
            expect(ClientCollectionLagSchema.safeParse(result.data.collectionLag).success).toBe(true)
            expect(BreakpointResultSchema.safeParse(result.data.breakpoint).success).toBe(true)
            for (const driver of result.data.riskDrivers) {
              expect(RiskDriverSchema.safeParse(driver).success).toBe(true)
            }
            for (const intervention of result.data.interventions) {
              expect(InterventionSchema.safeParse(intervention).success).toBe(true)
            }
          }
        },
      ),
      { numRuns: 200 },
    )
  })
})
