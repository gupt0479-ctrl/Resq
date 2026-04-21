import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { cashForecastSnapshots } from "@/lib/db/schema"
import { eq, and, sql, desc } from "drizzle-orm"
import { computePosition } from "@/lib/services/cash-model"
import { generate } from "@/lib/services/forecast-engine"
import { detect } from "@/lib/services/breakpoint-detector"
import { analyze } from "@/lib/services/risk-driver-analyzer"
import type { CashSummaryResponse } from "@/lib/schemas/cash"

function fmtUsd(n: number): string {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 })
}

export async function GET(request: Request) {
  const ctx = await getUserOrg()
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get("organizationId") ?? ctx.organizationId

  try {
    const position = await computePosition(orgId)
    const forecast = await generate(orgId, "base")
    const breakpoint = await detect(forecast)
    const drivers = await analyze(orgId, forecast, breakpoint)

    // Query most recent deviation within last 24 hours
    let deviation: CashSummaryResponse["deviation"] = null
    try {
      const [recentSnapshot] = await db
        .select({
          breakpointWeek: cashForecastSnapshots.breakpointWeek,
          createdAt: cashForecastSnapshots.createdAt,
        })
        .from(cashForecastSnapshots)
        .where(
          and(
            eq(cashForecastSnapshots.organizationId, orgId),
            eq(cashForecastSnapshots.scenarioType, "base"),
            sql`${cashForecastSnapshots.createdAt} >= now() - interval '24 hours'`,
          ),
        )
        .orderBy(desc(cashForecastSnapshots.createdAt))
        .limit(1)

      if (recentSnapshot && recentSnapshot.breakpointWeek !== null) {
        const oldWeek = recentSnapshot.breakpointWeek
        const newWeek = breakpoint.weekNumber
        if (newWeek !== null && oldWeek !== newWeek) {
          const urgency = newWeek <= 2 ? "critical" as const : "normal" as const
          deviation = {
            oldBreakpointWeek: oldWeek,
            newBreakpointWeek: newWeek,
            triggerEvent: "forecast_refresh",
            summary: `Breakpoint shifted from week ${oldWeek} to week ${newWeek}`,
            urgency,
            createdAt: new Date().toISOString(),
          }
        }
      }
    } catch (err) {
      console.error("[cash/summary] Deviation query failed:", err)
    }

    const response: CashSummaryResponse = {
      currentCashPosition: {
        label: "Current Cash Position",
        value: fmtUsd(position.currentCash),
        numericValue: position.currentCash,
        detail: "Cleared ledger only",
      },
      cashCollected: {
        label: "Cash Collected (90d)",
        value: fmtUsd(position.cashCollected90d),
        numericValue: position.cashCollected90d,
        detail: "Last 90 days",
      },
      breakpointWeek: {
        label: "Breakpoint Week",
        value: breakpoint.label,
        numericValue: breakpoint.weekNumber,
        detail: breakpoint.detected
          ? `Shortfall: ${fmtUsd(breakpoint.shortfallAmount ?? 0)} below threshold`
          : "No cash risk in 13-week horizon",
      },
      largestRiskDriver: {
        label: "Largest Risk Driver",
        value: drivers.length > 0 ? drivers[0].category.replace(/_/g, " ") : "None",
        numericValue: drivers.length > 0 ? drivers[0].cashImpact : null,
        detail: drivers.length > 0 ? drivers[0].description : null,
      },
      deviation,
      organizationId: orgId,
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error("[cash/summary] Error:", err)
    return NextResponse.json({
      currentCashPosition: { label: "Current Cash Position", value: "$0", numericValue: 0, detail: "No financial data available" },
      cashCollected: { label: "Cash Collected (90d)", value: "$0", numericValue: 0, detail: "No financial data available" },
      breakpointWeek: { label: "Breakpoint Week", value: "No risk", numericValue: null, detail: "No financial data available" },
      largestRiskDriver: { label: "Largest Risk Driver", value: "None", numericValue: null, detail: "No financial data available" },
      deviation: null,
      organizationId: orgId,
      generatedAt: new Date().toISOString(),
    })
  }
}
