import { NextResponse } from "next/server"
import { db, DEMO_ORG_ID } from "@/lib/db"
import { cashForecastSnapshots } from "@/lib/db/schema"
import { generate } from "@/lib/services/forecast-engine"
import { detect } from "@/lib/services/breakpoint-detector"
import type { ForecastResponse } from "@/lib/schemas/cash"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get("organizationId") ?? DEMO_ORG_ID

  try {
    // Generate all 3 scenarios in parallel
    const [base, stress, upside] = await Promise.all([
      generate(orgId, "base"),
      generate(orgId, "stress"),
      generate(orgId, "upside"),
    ])

    // Detect breakpoint on base scenario for snapshot
    const breakpoint = await detect(base)

    // Save snapshot to cash_forecast_snapshots
    try {
      await db.insert(cashForecastSnapshots).values({
        organizationId: orgId,
        forecastJson: { base, stress, upside },
        breakpointWeek: breakpoint.weekNumber,
        breakpointAmount: breakpoint.shortfallAmount?.toString() ?? null,
        thresholdUsed: breakpoint.thresholdUsed.toString(),
        scenarioType: "base",
      })
    } catch (err) {
      console.error("[cash/forecast] Failed to save snapshot:", err)
    }

    const response: ForecastResponse = {
      base,
      stress,
      upside,
      generatedAt: new Date().toISOString(),
      organizationId: orgId,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error("[cash/forecast] Error:", err)
    return NextResponse.json(
      { error: "Forecast generation failed", detail: String(err) },
      { status: 500 },
    )
  }
}
