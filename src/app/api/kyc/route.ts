import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { createKycRequest, listKycRequests } from "@/lib/services/kyc"
import { CreateKycRequestSchema } from "@/lib/schemas/kyc"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") ?? undefined
    const limit  = Number(searchParams.get("limit") ?? 50)
    const offset = Number(searchParams.get("offset") ?? 0)

    const supabase = createServerSupabaseClient()
    const requests = await listKycRequests(supabase, DEMO_ORG_ID, { status, limit, offset })

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
    const body: unknown = await req.json().catch(() => ({}))
    const parsed = CreateKycRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 422 })
    }

    const supabase = createServerSupabaseClient()
    const request  = await createKycRequest(supabase, DEMO_ORG_ID, parsed.data)

    return NextResponse.json({ data: request }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    )
  }
}
