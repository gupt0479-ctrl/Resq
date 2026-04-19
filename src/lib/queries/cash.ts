import "server-only"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { eq, and, sql, inArray } from "drizzle-orm"

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CashSummary {
  currentCash: number
  expectedInflows: number
  expectedOutflows: number
  refundsPaid: number
  refundExposure: number
  projectedEndingCash: number
}

export interface ForecastWeek {
  weekStart: string
  weekEnd: string
  weekLabel: string
  inflow: number
  outflow: number
  runningBalance: number
}

export interface CashForecast {
  weeks: ForecastWeek[]
  minProjectedBalance: number
  breakpointWeek: string | null
  threshold: number
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function startOfWeek(d: Date): Date {
  const out = new Date(d)
  out.setUTCDate(out.getUTCDate() - out.getUTCDay())
  out.setUTCHours(0, 0, 0, 0)
  return out
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d)
  out.setUTCDate(out.getUTCDate() + days)
  return out
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ─── currentCash ───────────────────────────────────────────────────────────
// Sum of cleared entries in finance_transactions only. Nothing else.

async function getCurrentCash(orgId: string): Promise<number> {
  const [result] = await db
    .select({
      total: sql<string>`coalesce(sum(
        case when ${schema.financeTransactions.direction} = 'in'
          then ${schema.financeTransactions.amount}
          else -${schema.financeTransactions.amount}
        end
      ), 0)`,
    })
    .from(schema.financeTransactions)
    .where(eq(schema.financeTransactions.organizationId, orgId))

  return round2(Number(result?.total ?? 0))
}

// ─── expectedInflows ───────────────────────────────────────────────────────
// Sum of open unpaid invoices. These are forecast, not cash.

async function getExpectedInflows(orgId: string): Promise<number> {
  const [result] = await db
    .select({
      total: sql<string>`coalesce(sum(
        ${schema.invoices.totalAmount} - ${schema.invoices.amountPaid}
      ), 0)`,
    })
    .from(schema.invoices)
    .where(
      and(
        eq(schema.invoices.organizationId, orgId),
        inArray(schema.invoices.status, ["sent", "pending", "overdue"]),
      ),
    )

  return round2(Number(result?.total ?? 0))
}

// ─── expectedOutflows ──────────────────────────────────────────────────────
// Known future obligations from the obligations table.

async function getExpectedOutflows(orgId: string): Promise<number> {
  const [result] = await db
    .select({
      total: sql<string>`coalesce(sum(${schema.obligations.amount}), 0)`,
    })
    .from(schema.obligations)
    .where(
      and(
        eq(schema.obligations.organizationId, orgId),
        eq(schema.obligations.status, "upcoming"),
      ),
    )

  return round2(Number(result?.total ?? 0))
}

// ─── refundsPaid ───────────────────────────────────────────────────────────
// Refunds already settled in the ledger.

async function getRefundsPaid(orgId: string): Promise<number> {
  const [result] = await db
    .select({
      total: sql<string>`coalesce(sum(${schema.financeTransactions.amount}), 0)`,
    })
    .from(schema.financeTransactions)
    .where(
      and(
        eq(schema.financeTransactions.organizationId, orgId),
        eq(schema.financeTransactions.type, "refund"),
        eq(schema.financeTransactions.direction, "out"),
      ),
    )

  return round2(Number(result?.total ?? 0))
}

// ─── refundExposure ────────────────────────────────────────────────────────
// Refund requests not yet paid. Separate field, never mixed with refundsPaid.
// These are obligations with category = 'refund' and status = 'upcoming'.

async function getRefundExposure(orgId: string): Promise<number> {
  const [result] = await db
    .select({
      total: sql<string>`coalesce(sum(${schema.obligations.amount}), 0)`,
    })
    .from(schema.obligations)
    .where(
      and(
        eq(schema.obligations.organizationId, orgId),
        eq(schema.obligations.category, "refund"),
        eq(schema.obligations.status, "upcoming"),
      ),
    )

  return round2(Number(result?.total ?? 0))
}

// ─── GET /api/cash/summary ─────────────────────────────────────────────────

export async function getCashSummary(orgId: string): Promise<CashSummary> {
  const [currentCash, expectedInflows, expectedOutflows, refundsPaid, refundExposure] =
    await Promise.all([
      getCurrentCash(orgId),
      getExpectedInflows(orgId),
      getExpectedOutflows(orgId),
      getRefundsPaid(orgId),
      getRefundExposure(orgId),
    ])

  const projectedEndingCash = round2(
    currentCash + expectedInflows - expectedOutflows - refundExposure
  )

  return {
    currentCash,
    expectedInflows,
    expectedOutflows,
    refundsPaid,
    refundExposure,
    projectedEndingCash,
  }
}

// ─── GET /api/cash/forecast ────────────────────────────────────────────────

export async function getCashForecast(
  orgId: string,
  opts: { weeks?: number; threshold?: number } = {}
): Promise<CashForecast> {
  const numWeeks = opts.weeks ?? 13
  const threshold = opts.threshold ?? 0

  // Start from the current week's Monday (Sunday-based start)
  const now = new Date()
  const weekStart = startOfWeek(now)

  // Get current cash as the starting balance
  const currentCash = await getCurrentCash(orgId)

  // Load all open invoices with due dates for inflow bucketing
  const openInvoices = await db
    .select({
      totalAmount: schema.invoices.totalAmount,
      amountPaid: schema.invoices.amountPaid,
      dueAt: schema.invoices.dueAt,
    })
    .from(schema.invoices)
    .where(
      and(
        eq(schema.invoices.organizationId, orgId),
        inArray(schema.invoices.status, ["sent", "pending", "overdue"]),
      ),
    )

  // Load all upcoming obligations for outflow bucketing
  const upcomingObligations = await db
    .select({
      amount: schema.obligations.amount,
      dueAt: schema.obligations.dueAt,
      category: schema.obligations.category,
    })
    .from(schema.obligations)
    .where(
      and(
        eq(schema.obligations.organizationId, orgId),
        eq(schema.obligations.status, "upcoming"),
      ),
    )

  // Build weekly buckets
  const weeks: ForecastWeek[] = []
  let runningBalance = currentCash
  let minProjectedBalance = currentCash
  let breakpointWeek: string | null = null

  for (let i = 0; i < numWeeks; i++) {
    const wStart = addDays(weekStart, i * 7)
    const wEnd = addDays(wStart, 6)
    const wStartStr = formatDate(wStart)
    const wEndStr = formatDate(wEnd)

    // Inflows: invoices with due_at in this week
    let inflow = 0
    for (const inv of openInvoices) {
      const dueDate = formatDate(new Date(inv.dueAt))
      if (dueDate >= wStartStr && dueDate <= wEndStr) {
        inflow += Number(inv.totalAmount) - Number(inv.amountPaid)
      }
    }

    // Outflows: obligations with due_at in this week
    let outflow = 0
    for (const obl of upcomingObligations) {
      const dueDate = obl.dueAt // already a date string from the date column
      if (dueDate >= wStartStr && dueDate <= wEndStr) {
        outflow += Number(obl.amount)
      }
    }

    inflow = round2(inflow)
    outflow = round2(outflow)
    runningBalance = round2(runningBalance + inflow - outflow)

    if (runningBalance < minProjectedBalance) {
      minProjectedBalance = runningBalance
    }

    if (breakpointWeek === null && runningBalance < threshold) {
      breakpointWeek = wStartStr
    }

    weeks.push({
      weekStart: wStartStr,
      weekEnd: wEndStr,
      weekLabel: `Week ${i + 1}`,
      inflow,
      outflow,
      runningBalance,
    })
  }

  return {
    weeks,
    minProjectedBalance: round2(minProjectedBalance),
    breakpointWeek,
    threshold,
  }
}
