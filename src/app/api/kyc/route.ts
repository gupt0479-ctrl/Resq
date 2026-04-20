import { NextRequest, NextResponse } from "next/server"
import { createUserSupabaseServerClient } from "@/lib/auth/create-user-supabase-server-client"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { createKycRequest, listKycRequests } from "@/lib/services/kyc"
import { CreateKycRequestSchema } from "@/lib/schemas/kyc"

export async function GET(req: NextRequest) {
  try {
    const ctx = await getUserOrg()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") ?? undefined
    const limit  = Number(searchParams.get("limit") ?? 50)
    const offset = Number(searchParams.get("offset") ?? 0)

    const supabase = await createUserSupabaseServerClient()
    const requests = await listKycRequests(supabase, ctx.organizationId, { status, limit, offset })

    return NextResponse.json({ data: requests })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getUserOrg()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body: unknown = await req.json().catch(() => ({}))
    const parsed = CreateKycRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 422 })
    }

    const supabase = await createUserSupabaseServerClient()
    const request  = await createKycRequest(supabase, ctx.organizationId, parsed.data)

    return NextResponse.json({ data: request }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    )
  }
}
