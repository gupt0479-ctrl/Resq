import { NextResponse } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { getFeedbackPageData } from "@/lib/queries/feedback"

export async function GET() {
  try {
    const client = createServerSupabaseClient()
    const data = await getFeedbackPageData(client, DEMO_ORG_ID)
    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
