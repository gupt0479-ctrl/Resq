import "server-only"
import { db } from "@/lib/db"
import { invoices, customers } from "@/lib/db/schema"
import { eq, and, isNotNull, inArray } from "drizzle-orm"
import type { ClientCollectionLag, CollectionLagTier } from "@/lib/schemas/cash"

/**
 * Pure helper — exported so property tests can import it without "server-only" issues.
 *
 * daysLate = avgDaysToCollect − avgPaymentTerms
 *   on_time      : daysLate <= 5
 *   slightly_late: 6–30
 *   very_late    : > 30
 */
export function assignTier(daysLate: number): CollectionLagTier {
  if (daysLate <= 5) return "on_time"
  if (daysLate <= 30) return "slightly_late"
  return "very_late"
}

// ── helpers ────────────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ── types for internal grouping ────────────────────────────────────────────

interface PaidInvoiceRow {
  id: string
  customerId: string
  customerName: string
  createdAt: Date
  paidAt: Date
  dueAt: Date
}

// ── core queries ───────────────────────────────────────────────────────────

async function fetchPaidInvoices(
  orgId: string,
  clientId?: string,
): Promise<PaidInvoiceRow[]> {
  const conditions = [
    eq(invoices.organizationId, orgId),
    eq(invoices.status, "paid"),
    isNotNull(invoices.paidAt),
  ]
  if (clientId) conditions.push(eq(invoices.customerId, clientId))

  const rows = await db
    .select({
      id: invoices.id,
      customerId: invoices.customerId,
      customerName: customers.fullName,
      createdAt: invoices.createdAt,
      paidAt: invoices.paidAt,
      dueAt: invoices.dueAt,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .where(and(...conditions))

  return rows.filter((r): r is PaidInvoiceRow => r.paidAt !== null)
}

// ── build a ClientCollectionLag from a group of paid invoices ──────────────

function buildClientLag(
  clientId: string,
  clientName: string,
  paidRows: PaidInvoiceRow[],
): ClientCollectionLag {
  const daysToCollectArr = paidRows.map((r) => daysBetween(r.createdAt, r.paidAt))
  const paymentTermsArr = paidRows.map((r) => daysBetween(r.createdAt, r.dueAt))

  const avgDaysToCollect = round2(
    daysToCollectArr.reduce((s, d) => s + d, 0) / daysToCollectArr.length,
  )
  const avgPaymentTerms = round2(
    paymentTermsArr.reduce((s, d) => s + d, 0) / paymentTermsArr.length,
  )

  const daysLate = avgDaysToCollect - avgPaymentTerms
  const tier = assignTier(daysLate)

  const onTimeCount = paidRows.filter(
    (r) => r.paidAt.getTime() <= r.dueAt.getTime(),
  ).length
  const onTimePercent = round2((onTimeCount / paidRows.length) * 100)

  return {
    clientId,
    clientName,
    avgDaysToCollect,
    tier,
    paidInvoiceCount: paidRows.length,
    onTimePercent,
  }
}

// ── org-wide fallback ──────────────────────────────────────────────────────

function computeOrgFallback(allPaidRows: PaidInvoiceRow[]): {
  avgDays: number
  avgTerms: number
} {
  if (allPaidRows.length === 0) return { avgDays: 30, avgTerms: 0 }
  const days = allPaidRows.map((r) => daysBetween(r.createdAt, r.paidAt))
  const terms = allPaidRows.map((r) => daysBetween(r.createdAt, r.dueAt))
  return {
    avgDays: round2(days.reduce((s, d) => s + d, 0) / days.length),
    avgTerms: round2(terms.reduce((s, d) => s + d, 0) / terms.length),
  }
}

function buildFallbackLag(
  clientId: string,
  clientName: string,
  paidCount: number,
  orgAvgDays: number,
  orgAvgTerms: number,
): ClientCollectionLag {
  const daysLate = orgAvgDays - orgAvgTerms
  return {
    clientId,
    clientName,
    avgDaysToCollect: orgAvgDays,
    tier: assignTier(daysLate),
    paidInvoiceCount: paidCount,
    onTimePercent: 0,
  }
}

// ── public API ─────────────────────────────────────────────────────────────

/**
 * Compute collection lag for a single client.
 * Falls back to org-wide average when the client has < 2 paid invoices.
 */
export async function computeForClient(
  orgId: string,
  clientId: string,
): Promise<ClientCollectionLag> {
  const clientRows = await fetchPaidInvoices(orgId, clientId)

  if (clientRows.length >= 2) {
    return buildClientLag(clientId, clientRows[0].customerName, clientRows)
  }

  // Fallback: use org-wide average
  const allRows = await fetchPaidInvoices(orgId)
  const { avgDays, avgTerms } = computeOrgFallback(allRows)

  // Resolve client name
  const name =
    clientRows.length > 0
      ? clientRows[0].customerName
      : await resolveClientName(clientId)

  return buildFallbackLag(clientId, name, clientRows.length, avgDays, avgTerms)
}

/**
 * Compute collection lag for every client that has open invoices in the org.
 * Clients with < 2 paid invoices get the org-wide fallback.
 */
export async function computeAll(orgId: string): Promise<ClientCollectionLag[]> {
  // 1. All paid invoices for the org
  const allPaid = await fetchPaidInvoices(orgId)
  const { avgDays, avgTerms } = computeOrgFallback(allPaid)

  // 2. Group paid invoices by client
  const grouped = new Map<string, PaidInvoiceRow[]>()
  for (const row of allPaid) {
    const arr = grouped.get(row.customerId) ?? []
    arr.push(row)
    grouped.set(row.customerId, arr)
  }

  // 3. All clients with open invoices
  const openClients = await db
    .select({
      customerId: invoices.customerId,
      customerName: customers.fullName,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .where(
      and(
        eq(invoices.organizationId, orgId),
        inArray(invoices.status, ["sent", "pending", "overdue"]),
      ),
    )
    .groupBy(invoices.customerId, customers.fullName)

  // 4. Build results
  const results: ClientCollectionLag[] = []

  for (const { customerId, customerName } of openClients) {
    const paidRows = grouped.get(customerId) ?? []

    if (paidRows.length >= 2) {
      results.push(buildClientLag(customerId, customerName, paidRows))
    } else {
      results.push(
        buildFallbackLag(customerId, customerName, paidRows.length, avgDays, avgTerms),
      )
    }
  }

  return results
}

// ── name resolution helper ─────────────────────────────────────────────────

async function resolveClientName(clientId: string): Promise<string> {
  const [row] = await db
    .select({ fullName: customers.fullName })
    .from(customers)
    .where(eq(customers.id, clientId))
    .limit(1)
  return row?.fullName ?? "Unknown"
}
