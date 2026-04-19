import { NextResponse } from "next/server"
import { DEMO_ORG_ID } from "@/lib/db"
import { getFeedbackPageData } from "@/lib/queries/feedback"

export async function GET() {
  try {
    const data = await getFeedbackPageData(DEMO_ORG_ID)
    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
