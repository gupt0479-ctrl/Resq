import "server-only"
import { db } from "@/lib/db"
import { invoices, customers, cashObligations, financeTransactions } from "@/lib/db/schema"
import { eq, and, sql, inArray } from "drizzle-orm"
import type {
  ForecastScenario,
  BreakpointResult,
  RiskDriver,
  RiskDriverCategory,
} from "@/lib/schemas/cash"

// ── Pure ranking — exported for property tests ─────────────────────────────

export function rankDrivers(drivers: RiskDriver[]): RiskDriver[] {
  return [...drivers].sort((a, b) => b.cashImpact - a.cashImpact)
}

// ── Category mapping helper ────────────────────────────────────────────────

function mapObligationCategory(
  category: string,
): RiskDriverCategory {
  switch (category) {
    case "tax":
      return "tax_obligation"
    case "payroll":
    case "rent":
    case "insurance":
    case "loan_payment":
      return "recurring_obligation_increase"
    case "vendor_bill":
      return "expense_spike"
    default:
      return "expense_spike"
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ── Main analyze function ──────────────────────────────────────────────────

export async function analyze(
  orgId: string,
  forecast: ForecastScenario,
  breakpoint: BreakpointResult,
): Promise<RiskDriver[]> {
  const drivers: RiskDriver[] = []

  // Determine the window: if breakpoint detected, use breakpoint week; otherwise all 13 weeks
  const windowWeeks = breakpoint.detected && breakpoint.weekNumber != null
    ? breakpoint.weekNumber
    : 13

  // ── 1. Check open receivables (receivable slippage) ──────────────────────

  const openInvoiceRows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      customerId: invoices.customerId,
      clientName: customers.fullName,
      totalAmount: invoices.totalAmount,
      amountPaid: invoices.amountPaid,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .where(
      and(
        eq(invoices.organizationId, orgId),
        inArray(invoices.status, ["sent", "pending", "overdue"]),
      ),
    )

  for (const row of openInvoiceRows) {
    const outstanding = round2(Number(row.totalAmount) - Number(row.amountPaid))
    if (outstanding <= 0) continue

    drivers.push({
      category: "receivable_slippage",
      description: `${row.invoiceNumber} from ${row.clientName} — $${outstanding.toLocaleString()} outstanding`,
      cashImpact: outstanding,
      entityRef: row.id,
    })
  }

  // ── 2. Check cash obligations within the breakpoint window ─────────────

  // Get the week start/end dates from the forecast for the window
  const windowEndDate = forecast.weeks[windowWeeks - 1]?.endDate
  const obligationRows = await db
    .select({
      id: cashObligations.id,
      category: cashObligations.category,
      description: cashObligations.description,
      amount: cashObligations.amount,
      dueAt: cashObligations.dueAt,
    })
    .from(cashObligations)
    .where(
      and(
        eq(cashObligations.organizationId, orgId),
        eq(cashObligations.isActive, true),
        windowEndDate
          ? sql`${cashObligations.dueAt} <= ${windowEndDate}::timestamptz`
          : sql`1=1`,
      ),
    )

  for (const row of obligationRows) {
    const amount = round2(Number(row.amount))
    if (amount <= 0) continue

    const driverCategory = mapObligationCategory(row.category)

    drivers.push({
      category: driverCategory,
      description: `${row.description} — $${amount.toLocaleString()} due`,
      cashImpact: amount,
      entityRef: row.id,
    })
  }

  // ── 3. Check expense spikes (recent 4-week avg > 8-week avg by >15%) ────

  const trailing8WeekRows = await db
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

  const trailing4WeekRows = await db
    .select({
      category: financeTransactions.category,
      totalAmount: sql<string>`coalesce(sum(${financeTransactions.amount}), 0)`,
    })
    .from(financeTransactions)
    .where(
      and(
        eq(financeTransactions.organizationId, orgId),
        eq(financeTransactions.direction, "out"),
        sql`${financeTransactions.occurredAt} >= now() - interval '4 weeks'`,
      ),
    )
    .groupBy(financeTransactions.category)

  // Build lookup maps
  const trailing8WeekAvgMap = new Map<string, number>()
  for (const row of trailing8WeekRows) {
    trailing8WeekAvgMap.set(row.category, Number(row.totalAmount) / 8)
  }

  const trailing4WeekAvgMap = new Map<string, number>()
  for (const row of trailing4WeekRows) {
    trailing4WeekAvgMap.set(row.category, Number(row.totalAmount) / 4)
  }

  for (const [category, recent4WeekAvg] of trailing4WeekAvgMap) {
    const trailing8WeekAvg = trailing8WeekAvgMap.get(category) ?? 0
    if (trailing8WeekAvg <= 0) continue

    const pctIncrease = ((recent4WeekAvg - trailing8WeekAvg) / trailing8WeekAvg) * 100

    if (pctIncrease > 15) {
      const weeklyDelta = round2(recent4WeekAvg - trailing8WeekAvg)
      const totalImpact = round2(weeklyDelta * windowWeeks)

      drivers.push({
        category: "expense_spike",
        description: `${category} spending up ${Math.round(pctIncrease)}% vs 8-week average`,
        cashImpact: totalImpact,
        entityRef: category,
      })
    }
  }

  // ── 4. Rank by cash impact descending ──────────────────────────────────

  return rankDrivers(drivers)
}
