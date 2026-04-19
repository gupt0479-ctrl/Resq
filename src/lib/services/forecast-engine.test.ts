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
vi.mock("@/lib/services/cash-model", () => ({ computePosition: vi.fn() }))
vi.mock("@/lib/services/collection-lag", () => ({ computeAll: vi.fn() }))

import {
  buildWeeks,
  type BuildWeeksParams,
  type OpenInvoice,
  type Obligation,
  type TrailingOutflow,
  type ClientLag,
} from "./forecast-engine"

// ── Helpers ────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

const OBLIGATION_CATEGORIES = [
  "payroll",
  "rent",
  "tax",
  "vendor_bill",
  "insurance",
  "loan_payment",
  "other",
] as const

// Fixed reference Monday in LOCAL time so getMonday() inside buildWeeks
// computes the correct week boundaries (buildWeeks uses local-time Date methods).
const REF_MONDAY = new Date(2026, 3, 13, 0, 0, 0, 0) // April 13 2026, local midnight

function addDays(d: Date, days: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + days)
  result.setHours(0, 0, 0, 0)
  return result
}

// ── Generators ─────────────────────────────────────────────────────────────

const arbUuid = fc.uuid({ version: 4 })

const arbPositiveAmount = fc.double({
  min: 0.01,
  max: 50_000,
  noNaN: true,
  noDefaultInfinity: true,
})

const arbStartingCash = fc.double({
  min: 0,
  max: 500_000,
  noNaN: true,
  noDefaultInfinity: true,
})

const arbOpenInvoice: fc.Arbitrary<OpenInvoice> = fc
  .record({
    id: arbUuid,
    customerId: arbUuid,
    clientName: fc.string({ minLength: 1, maxLength: 10 }),
    totalAmount: arbPositiveAmount,
    amountPaid: fc.constant(0),
    // createdAt: 0-30 days before REF_MONDAY
    createdAtOffset: fc.integer({ min: 0, max: 30 }),
    // dueAt: 7-60 days after createdAt
    dueAtOffset: fc.integer({ min: 7, max: 60 }),
  })
  .map((r) => ({
    id: r.id,
    customerId: r.customerId,
    clientName: r.clientName,
    totalAmount: round2(r.totalAmount),
    amountPaid: 0,
    createdAt: addDays(REF_MONDAY, -r.createdAtOffset),
    dueAt: addDays(REF_MONDAY, -r.createdAtOffset + r.dueAtOffset),
  }))

const arbObligation: fc.Arbitrary<Obligation> = fc
  .record({
    id: arbUuid,
    category: fc.constantFrom(...OBLIGATION_CATEGORIES),
    description: fc.string({ minLength: 1, maxLength: 15 }),
    amount: arbPositiveAmount,
    // dueAt: within 13 weeks from REF_MONDAY
    dueAtOffset: fc.integer({ min: 0, max: 90 }),
  })
  .map((r) => ({
    id: r.id,
    category: r.category,
    description: r.description,
    amount: round2(r.amount),
    dueAt: addDays(REF_MONDAY, r.dueAtOffset),
    recurrence: "one_time" as const,
  }))

const arbTrailingOutflow: fc.Arbitrary<TrailingOutflow> = fc
  .record({
    category: fc.constantFrom(
      "supplies",
      "utilities",
      "marketing",
      "misc",
    ),
    weeklyAvg: arbPositiveAmount,
  })
  .map((r) => ({ ...r, weeklyAvg: round2(r.weeklyAvg) }))


// Generator that produces clientLags matching the customerIds in openInvoices
function arbClientLags(
  invoices: OpenInvoice[],
): fc.Arbitrary<ClientLag[]> {
  const uniqueCustomerIds = [...new Set(invoices.map((i) => i.customerId))]
  if (uniqueCustomerIds.length === 0) return fc.constant([])

  return fc
    .array(
      fc.double({ min: 1, max: 90, noNaN: true, noDefaultInfinity: true }),
      {
        minLength: uniqueCustomerIds.length,
        maxLength: uniqueCustomerIds.length,
      },
    )
    .map((lags) =>
      uniqueCustomerIds.map((cid, i) => ({
        clientId: cid,
        clientName: `Client-${i}`,
        avgDaysToCollect: round2(lags[i]),
      })),
    )
}

// ── Property 2: Forecast Waterfall Consistency ─────────────────────────────
// **Validates: Requirements 2.1**

describe("Property 2: Forecast Waterfall Consistency", () => {
  it("each week's endingBalance == previousEndingBalance + inflows - outflows", () => {
    fc.assert(
      fc.property(
        arbStartingCash,
        fc.array(arbOpenInvoice, { minLength: 0, maxLength: 5 }),
        fc.array(arbObligation, { minLength: 0, maxLength: 5 }),
        fc.array(arbTrailingOutflow, { minLength: 0, maxLength: 3 }),
        (startingCash, openInvoices, obligations, trailingOutflows) => {
          return fc.assert(
            fc.property(
              arbClientLags(openInvoices),
              (clientLags) => {
                const params: BuildWeeksParams = {
                  startingCash: round2(startingCash),
                  openInvoices,
                  obligations,
                  trailingOutflows,
                  clientLags,
                  scenarioType: "base",
                  weekStartDate: REF_MONDAY,
                }

                const weeks = buildWeeks(params)

                expect(weeks).toHaveLength(13)

                for (let i = 0; i < 13; i++) {
                  const w = weeks[i]
                  const prevBalance =
                    i === 0 ? round2(startingCash) : weeks[i - 1].endingBalance
                  const expected = round2(
                    prevBalance + w.projectedInflows - w.projectedOutflows,
                  )

                  expect(Math.abs(w.endingBalance - expected)).toBeLessThan(
                    0.02,
                  )
                }
              },
            ),
            { numRuns: 1 },
          )
        },
      ),
      { numRuns: 50 },
    )
  })
})


// ── Property 3: Collection Lag Shifts Receivables Later Than Due Date ──────
// **Validates: Requirements 2.2, 10.3**

describe("Property 3: Collection Lag Shifts Receivables Later Than Due Date", () => {
  it("expectedReceiptWeek >= dueDateWeek when avgDaysToCollect > payment terms", () => {
    // We generate a single invoice with known dates and a client lag that
    // exceeds the payment terms (dueAt - createdAt). Then we verify the
    // invoice lands in a week >= the due date week.

    const arbScenario = fc
      .record({
        invoiceId: arbUuid,
        customerId: arbUuid,
        clientName: fc.string({ minLength: 1, maxLength: 10 }),
        totalAmount: arbPositiveAmount,
        // createdAt: 0-30 days before REF_MONDAY
        createdAtOffset: fc.integer({ min: 0, max: 30 }),
        // payment terms: 7-30 days
        paymentTermsDays: fc.integer({ min: 7, max: 30 }),
        // extra lag beyond payment terms: 1-60 days
        extraLagDays: fc.integer({ min: 1, max: 60 }),
      })
      .map((r) => {
        const createdAt = addDays(REF_MONDAY, -r.createdAtOffset)
        const dueAt = addDays(createdAt, r.paymentTermsDays)
        const avgDaysToCollect = r.paymentTermsDays + r.extraLagDays

        return {
          invoice: {
            id: r.invoiceId,
            customerId: r.customerId,
            clientName: r.clientName,
            totalAmount: round2(r.totalAmount),
            amountPaid: 0,
            createdAt,
            dueAt,
          } as OpenInvoice,
          clientLag: {
            clientId: r.customerId,
            clientName: r.clientName,
            avgDaysToCollect,
          } as ClientLag,
          dueAt,
          expectedReceiptDate: addDays(createdAt, avgDaysToCollect),
        }
      })

    fc.assert(
      fc.property(arbScenario, arbStartingCash, (scenario, startingCash) => {
        const params: BuildWeeksParams = {
          startingCash: round2(startingCash),
          openInvoices: [scenario.invoice],
          obligations: [],
          trailingOutflows: [],
          clientLags: [scenario.clientLag],
          scenarioType: "base",
          weekStartDate: REF_MONDAY,
        }

        const weeks = buildWeeks(params)

        // Find which week the invoice inflow landed in (if any within 13 weeks)
        const inflowWeekIdx = weeks.findIndex(
          (w) => w.projectedInflows > 0,
        )

        // Find which week the due date falls in
        const dueDate = scenario.dueAt
        const dueDateWeekIdx = weeks.findIndex((w) => {
          const start = new Date(w.startDate + "T00:00:00.000Z")
          const end = new Date(w.endDate + "T00:00:00.000Z")
          return dueDate >= start && dueDate <= end
        })

        // If the invoice landed within the 13-week window, verify it's
        // in a week >= the due date week
        if (inflowWeekIdx >= 0 && dueDateWeekIdx >= 0) {
          expect(inflowWeekIdx).toBeGreaterThanOrEqual(dueDateWeekIdx)
        }
        // If the expected receipt date is beyond the 13-week window,
        // no inflow should appear at all — which is also correct
        // (shifted later than the forecast horizon)
      }),
      { numRuns: 100 },
    )
  })
})


// ── Property 4: Scenario Ordering ──────────────────────────────────────────
// **Validates: Requirements 2.4**
//
// The upside scenario defers the largest non-payroll obligation from weeks 1-4
// to weeks 5-8, which can temporarily make upside worse than base in the
// landing week. To test the core ordering property cleanly we:
//   - Use only payroll obligations (never deferred in upside)
//   - Ensure invoices are created at/after weekStartDate so the upside 30%
//     lag reduction doesn't shift receipts before the forecast window

describe("Property 4: Scenario Ordering", () => {
  // Invoice generator constrained for scenario ordering:
  // createdAt is at or after REF_MONDAY so upside lag reduction keeps receipt in window
  const arbOrderingInvoice: fc.Arbitrary<OpenInvoice> = fc
    .record({
      id: arbUuid,
      customerId: arbUuid,
      clientName: fc.string({ minLength: 1, maxLength: 10 }),
      totalAmount: arbPositiveAmount,
      // createdAt: 0-14 days AFTER REF_MONDAY
      createdAtOffset: fc.integer({ min: 0, max: 14 }),
      dueAtOffset: fc.integer({ min: 7, max: 30 }),
    })
    .map((r) => ({
      id: r.id,
      customerId: r.customerId,
      clientName: r.clientName,
      totalAmount: round2(r.totalAmount),
      amountPaid: 0,
      createdAt: addDays(REF_MONDAY, r.createdAtOffset),
      dueAt: addDays(REF_MONDAY, r.createdAtOffset + r.dueAtOffset),
    }))

  // Only payroll obligations — never deferred in upside scenario
  const arbPayrollObligation: fc.Arbitrary<Obligation> = fc
    .record({
      id: arbUuid,
      description: fc.string({ minLength: 1, maxLength: 15 }),
      amount: arbPositiveAmount,
      dueAtOffset: fc.integer({ min: 0, max: 90 }),
    })
    .map((r) => ({
      id: r.id,
      category: "payroll",
      description: r.description,
      amount: round2(r.amount),
      dueAt: addDays(REF_MONDAY, r.dueAtOffset),
      recurrence: "one_time" as const,
    }))

  // Client lags constrained so that even with 30% reduction the receipt
  // still falls within the 13-week (91-day) window from REF_MONDAY
  function arbOrderingClientLags(
    invoices: OpenInvoice[],
  ): fc.Arbitrary<ClientLag[]> {
    const uniqueCustomerIds = [
      ...new Set(invoices.map((i) => i.customerId)),
    ]
    if (uniqueCustomerIds.length === 0) return fc.constant([])

    return fc
      .array(
        fc.integer({ min: 7, max: 70 }),
        {
          minLength: uniqueCustomerIds.length,
          maxLength: uniqueCustomerIds.length,
        },
      )
      .map((lags) =>
        uniqueCustomerIds.map((cid, i) => ({
          clientId: cid,
          clientName: `Client-${i}`,
          avgDaysToCollect: lags[i],
        })),
      )
  }

  it("stress.endingBalance <= base.endingBalance <= upside.endingBalance for each week", () => {
    fc.assert(
      fc.property(
        arbStartingCash,
        fc.array(arbOrderingInvoice, { minLength: 1, maxLength: 5 }),
        fc.array(arbPayrollObligation, { minLength: 0, maxLength: 3 }),
        fc.array(arbTrailingOutflow, { minLength: 0, maxLength: 3 }),
        (startingCash, openInvoices, obligations, trailingOutflows) => {
          return fc.assert(
            fc.property(
              arbOrderingClientLags(openInvoices),
              (clientLags) => {
                const common = {
                  startingCash: round2(startingCash),
                  openInvoices,
                  obligations,
                  trailingOutflows,
                  clientLags,
                  weekStartDate: REF_MONDAY,
                }

                const stressWeeks = buildWeeks({
                  ...common,
                  scenarioType: "stress",
                })
                const baseWeeks = buildWeeks({
                  ...common,
                  scenarioType: "base",
                })
                const upsideWeeks = buildWeeks({
                  ...common,
                  scenarioType: "upside",
                })

                for (let i = 0; i < 13; i++) {
                  const s = stressWeeks[i].endingBalance
                  const b = baseWeeks[i].endingBalance
                  const u = upsideWeeks[i].endingBalance

                  // Allow small floating-point tolerance
                  expect(s).toBeLessThanOrEqual(b + 0.02)
                  expect(b).toBeLessThanOrEqual(u + 0.02)
                }
              },
            ),
            { numRuns: 1 },
          )
        },
      ),
      { numRuns: 50 },
    )
  })
})
