import "server-only"
import { db } from "@/lib/db"
import { financeTransactions, cashObligations, cashForecastSnapshots } from "@/lib/db/schema"
import { eq, and, sql, desc } from "drizzle-orm"
import { recordAiAction } from "@/lib/services/ai-actions"
import type { ForecastScenario, BreakpointResult, WeeklyBucket, DeviationRecord } from "@/lib/schemas/cash"

// ── Pure threshold computation — exported for property tests ───────────────

export function computeDefaultThreshold(
  trailing4WeekAvgOutflows: number,
  nextPayrollAmount: number,
): number {
  return Math.max(trailing4WeekAvgOutflows, nextPayrollAmount)
}

// ── Pure detection — exported for property tests ───────────────────────────

export function detectPure(
  weeks: WeeklyBucket[],
  threshold: number,
): BreakpointResult {
  if (weeks.length === 0) {
    return {
      detected: false,
      weekNumber: null,
      shortfallAmount: null,
      thresholdUsed: threshold,
      minimumProjectedBalance: 0,
      label: "No risk",
    }
  }

  const minBalance = Math.min(...weeks.map((w) => w.endingBalance))
  const roundedMinBalance = Math.round(minBalance * 100) / 100

  for (const week of weeks) {
    if (week.endingBalance < threshold) {
      return {
        detected: true,
        weekNumber: week.weekNumber,
        shortfallAmount: Math.round((threshold - week.endingBalance) * 100) / 100,
        thresholdUsed: threshold,
        minimumProjectedBalance: roundedMinBalance,
        label: `Week ${week.weekNumber}`,
      }
    }
  }

  return {
    detected: false,
    weekNumber: null,
    shortfallAmount: null,
    thresholdUsed: threshold,
    minimumProjectedBalance: roundedMinBalance,
    label: "No risk",
  }
}


// ── DB-backed detect function ──────────────────────────────────────────────

export async function detect(
  forecast: ForecastScenario,
  threshold?: number,
): Promise<BreakpointResult> {
  let effectiveThreshold = threshold

  if (effectiveThreshold == null) {
    // 1. Query trailing 4-week average outflows
    const trailingResult = await db
      .select({
        totalOutflows: sql<string>`coalesce(sum(${financeTransactions.amount}), 0)`,
      })
      .from(financeTransactions)
      .where(
        and(
          eq(financeTransactions.direction, "out"),
          sql`${financeTransactions.occurredAt} >= now() - interval '4 weeks'`,
        ),
      )

    const trailing4WeekAvg = Number(trailingResult[0]?.totalOutflows ?? 0) / 4

    // 2. Query next payroll obligation
    const payrollResult = await db
      .select({
        amount: cashObligations.amount,
      })
      .from(cashObligations)
      .where(
        and(
          eq(cashObligations.category, "payroll"),
          sql`${cashObligations.dueAt} >= now()`,
        ),
      )
      .orderBy(sql`${cashObligations.dueAt} asc`)
      .limit(1)

    const nextPayroll = Number(payrollResult[0]?.amount ?? 0)

    // 3. Default threshold = max(trailing4WeekAvg, nextPayroll)
    effectiveThreshold = computeDefaultThreshold(trailing4WeekAvg, nextPayroll)
  }

  return detectPure(forecast.weeks, effectiveThreshold)
}


// ── Pure deviation computation — exported for property tests ───────────────

export function computeDeviation(
  oldWeek: number | null,
  newWeek: number | null,
  triggerEvent: string,
): DeviationRecord | null {
  // No deviation if both are the same
  if (oldWeek === newWeek) return null
  // No deviation if both are null (no breakpoint before or after)
  if (oldWeek === null && newWeek === null) return null

  const urgency = newWeek !== null && newWeek <= 2 ? "critical" : "normal"

  let summary: string
  if (oldWeek === null && newWeek !== null) {
    summary = `New breakpoint detected at week ${newWeek}`
  } else if (oldWeek !== null && newWeek === null) {
    summary = `Breakpoint resolved — previously at week ${oldWeek}`
  } else {
    summary = `Breakpoint shifted from week ${oldWeek} to week ${newWeek}`
  }

  return {
    oldBreakpointWeek: oldWeek,
    newBreakpointWeek: newWeek,
    triggerEvent,
    summary,
    urgency,
    createdAt: new Date().toISOString(),
  }
}

// ── DB-backed deviation detection ──────────────────────────────────────────

export async function detectDeviation(
  orgId: string,
  currentBreakpoint: BreakpointResult,
  triggerEvent: string = "forecast_refresh",
): Promise<DeviationRecord | null> {
  // Query most recent snapshot for this org (base scenario)
  const [recentSnapshot] = await db
    .select({ breakpointWeek: cashForecastSnapshots.breakpointWeek })
    .from(cashForecastSnapshots)
    .where(
      and(
        eq(cashForecastSnapshots.organizationId, orgId),
        eq(cashForecastSnapshots.scenarioType, "base"),
      ),
    )
    .orderBy(desc(cashForecastSnapshots.createdAt))
    .limit(1)

  const oldWeek = recentSnapshot?.breakpointWeek ?? null
  const newWeek = currentBreakpoint.weekNumber

  const deviation = computeDeviation(oldWeek, newWeek, triggerEvent)
  if (!deviation) return null

  // Write audit entry
  try {
    await recordAiAction({
      organizationId: orgId,
      entityType: "forecast",
      entityId: orgId,
      triggerType: "deviation_detected",
      actionType: "receivable_risk_detected",
      inputSummary: deviation.summary,
      outputPayload: { ...deviation },
      status: "executed",
    })
  } catch (err) {
    console.error("[breakpoint-detector] Failed to record deviation audit:", err)
  }

  return deviation
}
