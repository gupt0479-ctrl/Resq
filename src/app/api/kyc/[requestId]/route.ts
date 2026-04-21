import { NextRequest, NextResponse } from "next/server"
import { createUserSupabaseServerClient } from "@/lib/auth/create-user-supabase-server-client"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { getKycRequestWithChecks } from "@/lib/services/kyc"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const ctx = await getUserOrg()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { requestId } = await params
    const supabase = await createUserSupabaseServerClient()
    const result   = await getKycRequestWithChecks(supabase, requestId, ctx.organizationId)

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
