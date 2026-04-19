import { NextResponse } from "next/server"
import { DEMO_ORG_ID } from "@/lib/db"
import { getCashSummary } from "@/lib/queries/cash"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const summary = await getCashSummary(DEMO_ORG_ID)
    return NextResponse.json(summary)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to compute cash summary" },
      { status: 500 },
    )
  }
}
