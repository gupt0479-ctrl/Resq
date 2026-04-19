import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { listOperatorAlerts } from "@/lib/services/kyc"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") ?? undefined

    const supabase = createServerSupabaseClient()
    const alerts   = await listOperatorAlerts(supabase, DEMO_ORG_ID, { status })

    return NextResponse.json({ data: alerts })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    )
  }
}
