import { NextRequest, NextResponse } from "next/server"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { runForecast, logForecastRun } from "@/lib/services/cash/forecast-engine"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const ctx = await getUserOrg()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json().catch(() => ({})) as {
      scenario?: "base" | "stress" | "upside"
      organizationId?: string
      asOfDate?: string
    }

    const scenario = body.scenario ?? "base"
    const orgId = body.organizationId ?? ctx.organizationId

    if (!["base", "stress", "upside"].includes(scenario)) {
      return NextResponse.json({ error: "Invalid scenario. Use: base, stress, upside" }, { status: 400 })
    }

    const result = await runForecast({
      organizationId: orgId,
      scenario,
      asOfDate: body.asOfDate,
    })

    // Log to audit trail (best-effort)
    let runId = ""
    try {
      runId = await logForecastRun(result, orgId)
    } catch (e) {
      console.error("Audit log failed:", e)
    }

    return NextResponse.json({
      data: {
        ...result,
        runId,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Forecast failed" },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest) {
  const ctx = await getUserOrg()
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const scenario = (searchParams.get("scenario") ?? "base") as "base" | "stress" | "upside"

  try {
    const result = await runForecast({ organizationId: ctx.organizationId, scenario })
    return NextResponse.json({ data: result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Forecast failed" },
      { status: 500 },
    )
  }
}
