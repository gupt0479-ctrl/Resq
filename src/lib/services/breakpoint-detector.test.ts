import { describe, it, expect, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/db", () => ({ db: {} }))
vi.mock("@/lib/db/schema", () => ({
  financeTransactions: {},
  cashObligations: {},
  cashForecastSnapshots: {},
}))
vi.mock("@/lib/services/ai-actions", () => ({
  recordAiAction: vi.fn().mockResolvedValue("mock-audit-id"),
}))

import { detectPure, computeDefaultThreshold, computeDeviation } from "./breakpoint-detector"
import type { WeeklyBucket } from "@/lib/schemas/cash"

// ── Helpers ────────────────────────────────────────────────────────────────

function makeWeek(weekNumber: number, endingBalance: number): WeeklyBucket {
  return {
    weekNumber,
    startDate: "2026-04-13",
    endDate: "2026-04-19",
    projectedInflows: 1000,
    projectedOutflows: 500,
    endingBalance,
    assumptionTags: ["test"],
  }
}

function make13Weeks(balances: number[]): WeeklyBucket[] {
  return balances.map((b, i) => makeWeek(i + 1, b))
}

// ── Unit Tests ─────────────────────────────────────────────────────────────

describe("computeDefaultThreshold", () => {
  it("returns the larger of trailing outflows and payroll", () => {
    expect(computeDefaultThreshold(5000, 3000)).toBe(5000)
    expect(computeDefaultThreshold(3000, 5000)).toBe(5000)
  })

  it("handles zero values", () => {
    expect(computeDefaultThreshold(0, 0)).toBe(0)
    expect(computeDefaultThreshold(0, 1000)).toBe(1000)
    expect(computeDefaultThreshold(1000, 0)).toBe(1000)
  })

  it("handles equal values", () => {
    expect(computeDefaultThreshold(4000, 4000)).toBe(4000)
  })
})

describe("detectPure", () => {
  it("detects breakpoint at first week below threshold", () => {
    const weeks = make13Weeks([
      20000, 18000, 15000, 12000, 9000, 7000, 5000, 4000, 3000, 2000, 1000,
      500, 200,
    ])
    const result = detectPure(weeks, 10000)

    expect(result.detected).toBe(true)
    expect(result.weekNumber).toBe(5)
    expect(result.shortfallAmount).toBe(1000)
    expect(result.thresholdUsed).toBe(10000)
    expect(result.label).toBe("Week 5")
    expect(result.minimumProjectedBalance).toBe(200)
  })

  it("returns no risk when all weeks above threshold", () => {
    const weeks = make13Weeks([
      20000, 19000, 18000, 17000, 16000, 15000, 14000, 13000, 12000, 11000,
      10000, 9500, 9100,
    ])
    const result = detectPure(weeks, 9000)

    expect(result.detected).toBe(false)
    expect(result.weekNumber).toBeNull()
    expect(result.shortfallAmount).toBeNull()
    expect(result.thresholdUsed).toBe(9000)
    expect(result.label).toBe("No risk")
    expect(result.minimumProjectedBalance).toBe(9100)
  })

  it("detects breakpoint at week 1 if immediately below threshold", () => {
    const weeks = make13Weeks([
      100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300,
    ])
    const result = detectPure(weeks, 500)

    expect(result.detected).toBe(true)
    expect(result.weekNumber).toBe(1)
    expect(result.shortfallAmount).toBe(400)
    expect(result.label).toBe("Week 1")
  })

  it("handles empty weeks array", () => {
    const result = detectPure([], 1000)

    expect(result.detected).toBe(false)
    expect(result.weekNumber).toBeNull()
    expect(result.label).toBe("No risk")
    expect(result.minimumProjectedBalance).toBe(0)
  })

  it("rounds shortfall and minimum balance to 2 decimal places", () => {
    const weeks = make13Weeks([
      100.555, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
      1300,
    ])
    const result = detectPure(weeks, 200)

    expect(result.detected).toBe(true)
    expect(result.shortfallAmount).toBe(99.45) // 200 - 100.555 rounded
    expect(result.minimumProjectedBalance).toBe(100.56) // 100.555 rounded
  })

  it("handles threshold of zero — no breakpoint when all balances non-negative", () => {
    const weeks = make13Weeks([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    const result = detectPure(weeks, 0)

    expect(result.detected).toBe(false)
    expect(result.label).toBe("No risk")
  })

  it("detects breakpoint with negative balances", () => {
    const weeks = make13Weeks([
      5000, 3000, 1000, -500, -1000, -2000, 0, 1000, 2000, 3000, 4000, 5000,
      6000,
    ])
    const result = detectPure(weeks, 0)

    expect(result.detected).toBe(true)
    expect(result.weekNumber).toBe(4)
    expect(result.shortfallAmount).toBe(500)
    expect(result.minimumProjectedBalance).toBe(-2000)
  })
})

// ── Property-Based Tests ───────────────────────────────────────────────────

import fc from "fast-check"

// Property 5: Breakpoint Is First Week Below Threshold
// **Validates: Requirements 3.1**
describe("Property 5: Breakpoint Is First Week Below Threshold", () => {
  it("when breakpoint at week N, all weeks 1..N-1 >= threshold and week N < threshold", () => {
    fc.assert(
      fc.property(
        // Generate 13 random balances and a threshold
        fc.array(
          fc.double({
            min: -50000,
            max: 100000,
            noNaN: true,
            noDefaultInfinity: true,
          }),
          { minLength: 13, maxLength: 13 },
        ),
        fc.double({
          min: 0,
          max: 50000,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (balances, threshold) => {
          const weeks = balances.map((b, i) => makeWeek(i + 1, b))
          const result = detectPure(weeks, threshold)

          if (result.detected && result.weekNumber !== null) {
            const N = result.weekNumber
            // All weeks before N have balance >= threshold
            for (let i = 0; i < N - 1; i++) {
              expect(weeks[i].endingBalance).toBeGreaterThanOrEqual(threshold)
            }
            // Week N has balance < threshold
            expect(weeks[N - 1].endingBalance).toBeLessThan(threshold)
          }
        },
      ),
      { numRuns: 500 },
    )
  })
})

// Property 6: Default Threshold Computation
// **Validates: Requirements 3.5**
describe("Property 6: Default Threshold Computation", () => {
  it("threshold >= trailing4WeekAvg AND threshold >= nextPayroll", () => {
    fc.assert(
      fc.property(
        fc.double({
          min: 0,
          max: 100000,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        fc.double({
          min: 0,
          max: 100000,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (trailing, payroll) => {
          const threshold = computeDefaultThreshold(trailing, payroll)
          expect(threshold).toBeGreaterThanOrEqual(trailing)
          expect(threshold).toBeGreaterThanOrEqual(payroll)
        },
      ),
      { numRuns: 500 },
    )
  })
})

// Property 10: Deviation Urgency
// **Validates: Requirements 7.5**
describe("Property 10: Deviation Urgency", () => {
  it("urgency is critical iff newBreakpointWeek <= 2", () => {
    fc.assert(
      fc.property(
        fc.option(fc.integer({ min: 1, max: 13 }), { nil: null }),
        fc.option(fc.integer({ min: 1, max: 13 }), { nil: null }),
        fc.string({ minLength: 1, maxLength: 30 }),
        (oldWeek, newWeek, trigger) => {
          const deviation = computeDeviation(oldWeek, newWeek, trigger)
          if (deviation === null) return // no deviation to check

          if (newWeek !== null && newWeek <= 2) {
            expect(deviation.urgency).toBe("critical")
          } else {
            expect(deviation.urgency).toBe("normal")
          }
        },
      ),
      { numRuns: 500 },
    )
  })
})
