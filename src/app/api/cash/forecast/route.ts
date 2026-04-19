import { type NextRequest, NextResponse } from "next/server"
import { DEMO_ORG_ID } from "@/lib/db"
import { getCashForecast } from "@/lib/queries/cash"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const weeks = Number(url.searchParams.get("weeks")) || 13
    const threshold = Number(url.searchParams.get("threshold")) || 0

    const forecast = await getCashForecast(DEMO_ORG_ID, { weeks, threshold })
    return NextResponse.json(forecast)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to compute cash forecast" },
      { status: 500 },
    )
  }
}
