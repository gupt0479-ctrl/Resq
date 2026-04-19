import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { getKycRequestWithChecks } from "@/lib/services/kyc"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params
    const supabase = createServerSupabaseClient()
    const result   = await getKycRequestWithChecks(supabase, requestId, DEMO_ORG_ID)

    if (!result) {
      return NextResponse.json({ error: "KYC request not found" }, { status: 404 })
    }

    return NextResponse.json({ data: result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    )
  }
}
