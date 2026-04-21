import { describe, it, expect, vi } from "vitest"
import fc from "fast-check"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/db", () => ({ db: {} }))
vi.mock("@/lib/db/schema", () => ({
  invoices: {},
  customers: {},
  cashObligations: {},
  financeTransactions: {},
}))

import { rankDrivers } from "./risk-driver-analyzer"
import type { RiskDriver } from "@/lib/schemas/cash"

// ── Helpers ────────────────────────────────────────────────────────────────

function makeDriver(
  category: RiskDriver["category"],
  cashImpact: number,
  description = "test driver",
): RiskDriver {
  return {
    category,
    description,
    cashImpact,
    entityRef: null,
  }
}

// ── Unit Tests for rankDrivers ─────────────────────────────────────────────

describe("rankDrivers", () => {
  it("sorts drivers by cashImpact descending", () => {
    const drivers = [
      makeDriver("expense_spike", 500),
      makeDriver("receivable_slippage", 12000),
      makeDriver("tax_obligation", 3000),
    ]
    const ranked = rankDrivers(drivers)

    expect(ranked[0].cashImpact).toBe(12000)
    expect(ranked[1].cashImpact).toBe(3000)
    expect(ranked[2].cashImpact).toBe(500)
  })

  it("returns empty array for empty input", () => {
    expect(rankDrivers([])).toEqual([])
  })

  it("handles single driver", () => {
    const drivers = [makeDriver("tax_obligation", 5000)]
    const ranked = rankDrivers(drivers)
    expect(ranked).toHaveLength(1)
    expect(ranked[0].cashImpact).toBe(5000)
  })

  it("preserves order for equal cashImpact values", () => {
    const drivers = [
      makeDriver("expense_spike", 5000, "first"),
      makeDriver("receivable_slippage", 5000, "second"),
    ]
    const ranked = rankDrivers(drivers)
    expect(ranked).toHaveLength(2)
    // Both have same impact — order is stable
    expect(ranked[0].cashImpact).toBe(5000)
    expect(ranked[1].cashImpact).toBe(5000)
  })

  it("does not mutate the original array", () => {
    const drivers = [
      makeDriver("expense_spike", 100),
      makeDriver("receivable_slippage", 5000),
    ]
    const original = [...drivers]
    rankDrivers(drivers)

    expect(drivers[0].cashImpact).toBe(original[0].cashImpact)
    expect(drivers[1].cashImpact).toBe(original[1].cashImpact)
  })

  it("handles drivers with all five categories", () => {
    const drivers = [
      makeDriver("revenue_shortfall", 1000),
      makeDriver("receivable_slippage", 5000),
      makeDriver("expense_spike", 3000),
      makeDriver("tax_obligation", 2000),
      makeDriver("recurring_obligation_increase", 4000),
    ]
    const ranked = rankDrivers(drivers)

    expect(ranked.map((d) => d.cashImpact)).toEqual([5000, 4000, 3000, 2000, 1000])
  })
})


// ── Property Tests ─────────────────────────────────────────────────────────

const DRIVER_CATEGORIES = [
  "receivable_slippage",
  "expense_spike",
  "revenue_shortfall",
  "tax_obligation",
  "recurring_obligation_increase",
] as const

/**
 * **Validates: Requirements 4.3**
 */
describe("Property 7: Drivers Ranked by Cash Impact Descending", () => {
  it("rankDrivers produces monotonic descending cashImpact", () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        category: fc.constantFrom(...DRIVER_CATEGORIES),
        description: fc.string({ minLength: 1, maxLength: 20 }),
        cashImpact: fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        entityRef: fc.option(fc.uuid(), { nil: null }),
      }), { minLength: 0, maxLength: 20 }),
      (drivers) => {
        const ranked = rankDrivers(drivers as RiskDriver[])
        for (let i = 0; i < ranked.length - 1; i++) {
          expect(ranked[i].cashImpact).toBeGreaterThanOrEqual(ranked[i + 1].cashImpact)
        }
      }
    ), { numRuns: 500 })
  })
})
