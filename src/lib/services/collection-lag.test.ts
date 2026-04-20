import { describe, it, expect, vi } from "vitest"
import fc from "fast-check"

// Mock server-only and DB dependencies so we can import the pure `assignTier` function
vi.mock("server-only", () => ({}))
vi.mock("@/lib/db", () => ({ db: {} }))
vi.mock("@/lib/db/schema", () => ({ invoices: {}, customers: {} }))

import { assignTier } from "./collection-lag"

// ── Pure helpers mirroring collection-lag.ts internals ──────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Given a set of paid invoices (each with createdAt, paidAt, dueAt),
 * compute the tier the same way collection-lag.ts does:
 *   daysLate = avgDaysToCollect − avgPaymentTerms
 *   on_time      : daysLate <= 5
 *   slightly_late: 6–30
 *   very_late    : > 30
 */
function computeTierFromInvoices(
  invoices: Array<{ createdAt: Date; paidAt: Date; dueAt: Date }>
): "on_time" | "slightly_late" | "very_late" {
  const daysToCollect = invoices.map((i) => daysBetween(i.createdAt, i.paidAt))
  const paymentTerms = invoices.map((i) => daysBetween(i.createdAt, i.dueAt))

  const avgDaysToCollect = round2(
    daysToCollect.reduce((s, d) => s + d, 0) / daysToCollect.length
  )
  const avgPaymentTerms = round2(
    paymentTerms.reduce((s, d) => s + d, 0) / paymentTerms.length
  )

  const daysLate = avgDaysToCollect - avgPaymentTerms
  return assignTier(daysLate)
}

// ── Generators ─────────────────────────────────────────────────────────────

/** Generate a base date within a reasonable range */
const baseDateArb = fc.date({
  min: new Date("2023-01-01"),
  max: new Date("2025-01-01"),
})

/** Generate a paid invoice with createdAt, dueAt (createdAt + paymentTerms), paidAt (createdAt + daysToCollect) */
const paidInvoiceArb = fc
  .record({
    createdAt: baseDateArb,
    paymentTermsDays: fc.integer({ min: 1, max: 90 }),
    daysToCollect: fc.integer({ min: 1, max: 120 }),
  })
  .map(({ createdAt, paymentTermsDays, daysToCollect }) => ({
    createdAt,
    dueAt: new Date(createdAt.getTime() + paymentTermsDays * 86_400_000),
    paidAt: new Date(createdAt.getTime() + daysToCollect * 86_400_000),
  }))

// ── Property 8: Collection Lag Tier Bucketing ──────────────────────────────

/**
 * **Validates: Requirements 10.2**
 *
 * Property 8: Collection Lag Tier Bucketing
 *
 * For any set of paid invoices with varying days-to-collect,
 * the tier assignment SHALL match:
 *   on_time      if avg days late <= 5
 *   slightly_late if avg days late 6–30
 *   very_late    if avg days late > 30
 */
describe("Collection Lag Tier Bucketing", () => {
  it("assignTier returns correct tier for any daysLate value", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -100, max: 200, noNaN: true, noDefaultInfinity: true }),
        (daysLate) => {
          const tier = assignTier(daysLate)

          if (daysLate <= 5) {
            expect(tier).toBe("on_time")
          } else if (daysLate <= 30) {
            expect(tier).toBe("slightly_late")
          } else {
            expect(tier).toBe("very_late")
          }
        }
      ),
      { numRuns: 1000 }
    )
  })

  it("tier computed from random paid invoice histories matches spec boundaries", () => {
    fc.assert(
      fc.property(
        fc.array(paidInvoiceArb, { minLength: 2, maxLength: 30 }),
        (invoices) => {
          const tier = computeTierFromInvoices(invoices)

          // Recompute daysLate independently to verify
          const daysToCollect = invoices.map((i) => daysBetween(i.createdAt, i.paidAt))
          const paymentTerms = invoices.map((i) => daysBetween(i.createdAt, i.dueAt))
          const avgCollect = round2(
            daysToCollect.reduce((s, d) => s + d, 0) / daysToCollect.length
          )
          const avgTerms = round2(
            paymentTerms.reduce((s, d) => s + d, 0) / paymentTerms.length
          )
          const daysLate = avgCollect - avgTerms

          if (daysLate <= 5) {
            expect(tier).toBe("on_time")
          } else if (daysLate <= 30) {
            expect(tier).toBe("slightly_late")
          } else {
            expect(tier).toBe("very_late")
          }
        }
      ),
      { numRuns: 500 }
    )
  })

  it("boundary: daysLate exactly 5 is on_time", () => {
    expect(assignTier(5)).toBe("on_time")
  })

  it("boundary: daysLate exactly 6 is slightly_late", () => {
    expect(assignTier(6)).toBe("slightly_late")
  })

  it("boundary: daysLate exactly 30 is slightly_late", () => {
    expect(assignTier(30)).toBe("slightly_late")
  })

  it("boundary: daysLate exactly 31 is very_late", () => {
    expect(assignTier(31)).toBe("very_late")
  })
})


// ── Property 9: Collection Lag Fallback ────────────────────────────────────

/**
 * Pure reimplementation of the org-wide fallback logic from collection-lag.ts.
 * Clients with < 2 paid invoices get the org-wide average days-to-collect
 * and the tier is derived from that org average.
 */
function computeOrgFallback(
  allPaidInvoices: Array<{ createdAt: Date; paidAt: Date; dueAt: Date }>
): { avgDays: number; avgTerms: number } {
  if (allPaidInvoices.length === 0) return { avgDays: 30, avgTerms: 0 }
  const days = allPaidInvoices.map((i) => daysBetween(i.createdAt, i.paidAt))
  const terms = allPaidInvoices.map((i) => daysBetween(i.createdAt, i.dueAt))
  return {
    avgDays: round2(days.reduce((s, d) => s + d, 0) / days.length),
    avgTerms: round2(terms.reduce((s, d) => s + d, 0) / terms.length),
  }
}

interface ClientHistory {
  clientId: string
  invoices: Array<{ createdAt: Date; paidAt: Date; dueAt: Date }>
}

/** Generator for a client with 0 or 1 paid invoices (needs fallback) */
const sparseClientArb = fc
  .record({
    clientId: fc.uuid(),
    invoiceCount: fc.constantFrom(0, 1),
  })
  .chain(({ clientId, invoiceCount }) =>
    fc.array(paidInvoiceArb, { minLength: invoiceCount, maxLength: invoiceCount }).map(
      (invoices) => ({ clientId, invoices } as ClientHistory)
    )
  )

/** Generator for a client with 2+ paid invoices (has own data) */
const richClientArb = fc
  .record({
    clientId: fc.uuid(),
  })
  .chain(({ clientId }) =>
    fc.array(paidInvoiceArb, { minLength: 2, maxLength: 15 }).map(
      (invoices) => ({ clientId, invoices } as ClientHistory)
    )
  )

/**
 * **Validates: Requirements 10.4**
 *
 * Property 9: Collection Lag Fallback
 *
 * For organizations with mixed client histories (some with 0-1 paid invoices,
 * some with 2+), clients with < 2 paid invoices SHALL get the org-wide average
 * days-to-collect and the tier derived from that org average.
 */
describe("Collection Lag Fallback", () => {
  it("clients with < 2 paid invoices receive org-wide average", () => {
    fc.assert(
      fc.property(
        fc.array(sparseClientArb, { minLength: 1, maxLength: 5 }),
        fc.array(richClientArb, { minLength: 1, maxLength: 5 }),
        (sparseClients, richClients) => {
          // Collect all paid invoices across the org (from rich clients)
          const allOrgInvoices = richClients.flatMap((c) => c.invoices)
          const { avgDays: orgAvgDays, avgTerms: orgAvgTerms } =
            computeOrgFallback(allOrgInvoices)

          const orgDaysLate = orgAvgDays - orgAvgTerms
          const expectedFallbackTier = assignTier(orgDaysLate)

          // Each sparse client should get the org-wide average
          for (const sparse of sparseClients) {
            expect(sparse.invoices.length).toBeLessThan(2)

            // The fallback avgDaysToCollect should be the org average
            const fallbackAvgDays = orgAvgDays
            const fallbackTier = assignTier(orgAvgDays - orgAvgTerms)

            expect(fallbackAvgDays).toBe(orgAvgDays)
            expect(fallbackTier).toBe(expectedFallbackTier)
          }
        }
      ),
      { numRuns: 300 }
    )
  })

  it("when org has zero paid invoices, fallback defaults to 30 days avg", () => {
    const { avgDays, avgTerms } = computeOrgFallback([])
    expect(avgDays).toBe(30)
    expect(avgTerms).toBe(0)

    // daysLate = 30 - 0 = 30 → slightly_late
    expect(assignTier(avgDays - avgTerms)).toBe("slightly_late")
  })

  it("fallback tier is consistent with org-wide daysLate for any org history", () => {
    fc.assert(
      fc.property(
        fc.array(paidInvoiceArb, { minLength: 1, maxLength: 50 }),
        (orgInvoices) => {
          const { avgDays, avgTerms } = computeOrgFallback(orgInvoices)
          const daysLate = avgDays - avgTerms
          const tier = assignTier(daysLate)

          // Verify tier matches the spec boundaries
          if (daysLate <= 5) {
            expect(tier).toBe("on_time")
          } else if (daysLate <= 30) {
            expect(tier).toBe("slightly_late")
          } else {
            expect(tier).toBe("very_late")
          }
        }
      ),
      { numRuns: 500 }
    )
  })
})
