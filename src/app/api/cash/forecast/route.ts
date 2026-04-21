import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { cashForecastSnapshots } from "@/lib/db/schema"
import { generate } from "@/lib/services/forecast-engine"
import { detect } from "@/lib/services/breakpoint-detector"
import type { ForecastResponse } from "@/lib/schemas/cash"

export async function GET(request: Request) {
  const ctx = await getUserOrg()
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const orgId = ctx.organizationId
  const persistSnapshot = searchParams.get("persistSnapshot") === "true"

  try {
    // Generate all 3 scenarios in parallel
    const [base, stress, upside] = await Promise.all([
      generate(orgId, "base"),
      generate(orgId, "stress"),
      generate(orgId, "upside"),
    ])

    // Detect breakpoint on base scenario for snapshot
    const breakpoint = await detect(base)

    // Persist snapshot only when explicitly requested
    if (persistSnapshot) {
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
      { error: "Forecast generation failed" },
      { status: 500 },
    )
  }
}
