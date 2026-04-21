import { NextRequest, NextResponse } from "next/server"
import { createUserSupabaseServerClient } from "@/lib/auth/create-user-supabase-server-client"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { listOperatorAlerts } from "@/lib/services/kyc"

export async function GET(req: NextRequest) {
  try {
    const ctx = await getUserOrg()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") ?? undefined

    const supabase = await createUserSupabaseServerClient()
    const alerts   = await listOperatorAlerts(supabase, ctx.organizationId, { status })

    return NextResponse.json({ data: alerts })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    )
  }
}
