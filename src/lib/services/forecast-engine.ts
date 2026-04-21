import "server-only"
import { db } from "@/lib/db"
import { cashObligations, financeTransactions, invoices, customers } from "@/lib/db/schema"
import { eq, and, sql, inArray, gte } from "drizzle-orm"
import { computePosition } from "@/lib/services/cash-model"
import { computeAll } from "@/lib/services/collection-lag"
import type { ForecastScenario, WeeklyBucket } from "@/lib/schemas/cash"

// ── Types for the pure buildWeeks helper ───────────────────────────────────

export interface OpenInvoice {
  id: string
  customerId: string
  clientName: string
  totalAmount: number
  amountPaid: number
  createdAt: Date
  dueAt: Date
}

export interface Obligation {
  id: string
  category: string
  description: string
  amount: number
  dueAt: Date
  recurrence: string
}

export interface TrailingOutflow {
  category: string
  weeklyAvg: number
}

export interface ClientLag {
  clientId: string
  clientName: string
  avgDaysToCollect: number
}

export interface BuildWeeksParams {
  startingCash: number
  openInvoices: OpenInvoice[]
  obligations: Obligation[]
  trailingOutflows: TrailingOutflow[]
  clientLags: ClientLag[]
  scenarioType: "base" | "stress" | "upside"
  weekStartDate?: Date // defaults to current Monday
}

// ── Date helpers ───────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + days)
  return result
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}


// ── Obligation recurrence helper ───────────────────────────────────────────

function obligationFallsInWeek(
  obligation: Obligation,
  weekStart: Date,
  weekEnd: Date,
): boolean {
  const due = new Date(obligation.dueAt)
  due.setHours(0, 0, 0, 0)

  switch (obligation.recurrence) {
    case "one_time":
      return due >= weekStart && due <= weekEnd

    case "weekly":
      // Fires every week on or after the first due date
      return due <= weekEnd

    case "biweekly": {
      // Every 2 weeks from due_at
      if (due > weekEnd) return false
      const diffMs = weekStart.getTime() - due.getTime()
      const diffDays = Math.floor(diffMs / 86_400_000)
      const diffWeeks = Math.round(diffDays / 7) // round to nearest week to handle DST/partial days
      // Fires on even-numbered weeks from the original due date (week 0, 2, 4, ...)
      return diffWeeks >= 0 && diffWeeks % 2 === 0
    }

    case "monthly": {
      // Same day-of-month each month
      if (due > weekEnd) return false
      const dueDay = due.getDate()
      for (let d = new Date(weekStart); d <= weekEnd; d = addDays(d, 1)) {
        if (d.getDate() === dueDay && d >= due) return true
      }
      return false
    }

    case "quarterly": {
      // Every 3 months from due_at
      if (due > weekEnd) return false
      const dueDay = due.getDate()
      const dueMonth = due.getMonth()
      for (let d = new Date(weekStart); d <= weekEnd; d = addDays(d, 1)) {
        if (d.getDate() === dueDay && d >= due) {
          const monthDiff =
            (d.getFullYear() - due.getFullYear()) * 12 +
            (d.getMonth() - dueMonth)
          if (monthDiff >= 0 && monthDiff % 3 === 0) return true
        }
      }
      return false
    }

    case "annual": {
      // Once per year from due_at
      if (due > weekEnd) return false
      const dueDay = due.getDate()
      const dueMonth = due.getMonth()
      for (let d = new Date(weekStart); d <= weekEnd; d = addDays(d, 1)) {
        if (
          d.getDate() === dueDay &&
          d.getMonth() === dueMonth &&
          d >= due
        )
          return true
      }
      return false
    }

    default:
      return due >= weekStart && due <= weekEnd
  }
}


// ── Pure buildWeeks — no DB, testable by property tests ────────────────────

export function buildWeeks(params: BuildWeeksParams): WeeklyBucket[] {
  const {
    startingCash,
    openInvoices,
    obligations,
    trailingOutflows,
    clientLags,
    scenarioType,
  } = params

  const now = params.weekStartDate ?? new Date()
  const currentWeekStart = getMonday(now)

  // Build a lag lookup by clientId
  const lagMap = new Map<string, number>()
  for (const lag of clientLags) {
    lagMap.set(lag.clientId, lag.avgDaysToCollect)
  }

  // Identify the 2 largest open invoices (by outstanding amount) for stress scenario
  const invoicesByOutstanding = [...openInvoices]
    .map((inv) => ({ ...inv, outstanding: inv.totalAmount - inv.amountPaid }))
    .sort((a, b) => b.outstanding - a.outstanding)
  const twoLargestIds = new Set(
    invoicesByOutstanding.slice(0, 2).map((inv) => inv.id),
  )

  // Identify the largest non-payroll obligation for upside deferral
  const nonPayrollObligations = obligations
    .filter((o) => o.category !== "payroll")
    .sort((a, b) => b.amount - a.amount)
  const deferredObligationId = nonPayrollObligations[0]?.id ?? null

  // Track which obligation categories are covered per week to avoid double-counting
  // with trailing outflows
  const weeks: WeeklyBucket[] = []
  let runningBalance = startingCash

  // Handle missing data: if no invoices, no obligations, and no trailing outflows
  const hasAnyData =
    openInvoices.length > 0 ||
    obligations.length > 0 ||
    trailingOutflows.length > 0

  for (let weekNum = 1; weekNum <= 13; weekNum++) {
    const weekStart = addDays(currentWeekStart, (weekNum - 1) * 7)
    const weekEnd = addDays(weekStart, 6)

    // ── INFLOWS ──
    let inflows = 0
    const inflowTags: string[] = []

    for (const invoice of openInvoices) {
      const outstanding = invoice.totalAmount - invoice.amountPaid
      if (outstanding <= 0) continue

      const clientLag = lagMap.get(invoice.customerId)
      const avgDays = clientLag ?? 30 // fallback to 30 days

      let expectedReceiptDate = addDays(invoice.createdAt, avgDays)

      // Apply scenario adjustments
      if (scenarioType === "stress" && twoLargestIds.has(invoice.id)) {
        expectedReceiptDate = addDays(expectedReceiptDate, 14)
      }
      if (scenarioType === "upside") {
        // Reduce lag by 30%
        const reduction = Math.floor(avgDays * 0.3)
        expectedReceiptDate = addDays(
          invoice.createdAt,
          avgDays - reduction,
        )
      }

      if (expectedReceiptDate >= weekStart && expectedReceiptDate <= weekEnd) {
        inflows += outstanding
        const lagLabel = clientLag != null
          ? `collection lag: ${avgDays}d avg for ${invoice.clientName}`
          : `collection lag: 30d org fallback for ${invoice.clientName}`
        inflowTags.push(lagLabel)
        if (scenarioType === "stress" && twoLargestIds.has(invoice.id)) {
          inflowTags.push("stress: +14 day slip applied")
        }
        if (scenarioType === "upside") {
          inflowTags.push("upside: lag reduced 30%")
        }
      }
    }

    // ── OUTFLOWS ──
    let outflows = 0
    const outflowTags: string[] = []
    const coveredCategories = new Set<string>()

    // Committed obligations due this week
    for (const obligation of obligations) {
      if (!obligationFallsInWeek(obligation, weekStart, weekEnd)) continue

      // Upside: defer the largest non-payroll obligation by 4 weeks (only in weeks 1-4)
      if (
        scenarioType === "upside" &&
        weekNum <= 4 &&
        obligation.id === deferredObligationId
      ) {
        outflowTags.push(
          `upside: deferred ${obligation.description} to week ${weekNum + 4}`,
        )
        continue
      }

      let amount = obligation.amount

      // Stress: one vendor cost +20%
      if (
        scenarioType === "stress" &&
        obligation.category === "vendor_bill"
      ) {
        amount = round2(amount * 1.2)
        outflowTags.push(
          `stress: ${obligation.description} +20% vendor spike`,
        )
      }

      outflows += amount
      coveredCategories.add(obligation.category)
      outflowTags.push(`committed: ${obligation.description}`)
    }

    // Handle deferred obligation landing in later weeks (upside)
    if (
      scenarioType === "upside" &&
      deferredObligationId &&
      weekNum > 4 &&
      weekNum <= 8
    ) {
      const deferred = obligations.find(
        (o) => o.id === deferredObligationId,
      )
      if (deferred) {
        // The deferred obligation lands in week (originalWeek + 4)
        // We check if this is the right landing week
        const deferredWeekStart = addDays(currentWeekStart, (weekNum - 5) * 7)
        const deferredWeekEnd = addDays(deferredWeekStart, 6)
        if (
          obligationFallsInWeek(deferred, deferredWeekStart, deferredWeekEnd)
        ) {
          outflows += deferred.amount
          outflowTags.push(
            `deferred payment landed: ${deferred.description}`,
          )
        }
      }
    }

    // Baseline recurring from trailing history (only for uncovered categories)
    for (const { category, weeklyAvg } of trailingOutflows) {
      if (!coveredCategories.has(category)) {
        outflows += weeklyAvg
        outflowTags.push(
          `recurring ${category} from 8-week trailing average`,
        )
      }
    }

    // ── Assumption tags ──
    const assumptionTags = [...inflowTags, ...outflowTags]
    if (assumptionTags.length === 0) {
      assumptionTags.push(
        hasAnyData
          ? "no activity projected this week"
          : "no historical data available",
      )
    }

    const endingBalance = round2(runningBalance + inflows - outflows)

    weeks.push({
      weekNumber: weekNum,
      startDate: formatDate(weekStart),
      endDate: formatDate(weekEnd),
      projectedInflows: round2(inflows),
      projectedOutflows: round2(outflows),
      endingBalance,
      assumptionTags,
    })

    runningBalance = endingBalance
  }

  return weeks
}


// ── DB-backed generate function ────────────────────────────────────────────

export async function generate(
  orgId: string,
  scenarioType: "base" | "stress" | "upside",
): Promise<ForecastScenario> {
  // 1. Starting cash from cleared ledger
  const position = await computePosition(orgId)
  const startingCash = position.currentCash

  // 2. Collection lags for all clients
  const lags = await computeAll(orgId)
  const clientLags: ClientLag[] = lags.map((l) => ({
    clientId: l.clientId,
    clientName: l.clientName,
    avgDaysToCollect: l.avgDaysToCollect,
  }))

  // 3. Open receivables
  const openInvoiceRows = await db
    .select({
      id: invoices.id,
      customerId: invoices.customerId,
      clientName: customers.fullName,
      totalAmount: invoices.totalAmount,
      amountPaid: invoices.amountPaid,
      createdAt: invoices.createdAt,
      dueAt: invoices.dueAt,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .where(
      and(
        eq(invoices.organizationId, orgId),
        inArray(invoices.status, ["sent", "pending", "overdue"]),
      ),
    )

  const openInvoiceData: OpenInvoice[] = openInvoiceRows.map((r) => ({
    id: r.id,
    customerId: r.customerId,
    clientName: r.clientName,
    totalAmount: Number(r.totalAmount),
    amountPaid: Number(r.amountPaid),
    createdAt: new Date(r.createdAt),
    dueAt: new Date(r.dueAt),
  }))

  // 4. Active cash obligations due from current week onward
  const currentWeekStart = getMonday(new Date())
  const obligationRows = await db
    .select({
      id: cashObligations.id,
      category: cashObligations.category,
      description: cashObligations.description,
      amount: cashObligations.amount,
      dueAt: cashObligations.dueAt,
      recurrence: cashObligations.recurrence,
    })
    .from(cashObligations)
    .where(
      and(
        eq(cashObligations.organizationId, orgId),
        eq(cashObligations.isActive, true),
        gte(cashObligations.dueAt, currentWeekStart),
      ),
    )

  const obligationData: Obligation[] = obligationRows.map((r) => ({
    id: r.id,
    category: r.category,
    description: r.description,
    amount: Number(r.amount),
    dueAt: new Date(r.dueAt),
    recurrence: r.recurrence,
  }))

  // 5. Trailing 8-week baseline outflows by category
  const trailingRows = await db
    .select({
      category: financeTransactions.category,
      totalAmount: sql<string>`coalesce(sum(${financeTransactions.amount}), 0)`,
    })
    .from(financeTransactions)
    .where(
      and(
        eq(financeTransactions.organizationId, orgId),
        eq(financeTransactions.direction, "out"),
        sql`${financeTransactions.occurredAt} >= now() - interval '8 weeks'`,
      ),
    )
    .groupBy(financeTransactions.category)

  const trailingOutflows: TrailingOutflow[] = trailingRows.map((r) => ({
    category: r.category,
    weeklyAvg: round2(Number(r.totalAmount) / 8),
  }))

  // 6. Build the 13 weekly buckets
  const weeks = buildWeeks({
    startingCash,
    openInvoices: openInvoiceData,
    obligations: obligationData,
    trailingOutflows,
    clientLags,
    scenarioType,
  })

  return { scenarioType, weeks }
}
