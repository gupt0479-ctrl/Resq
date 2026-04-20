import { NextRequest, NextResponse } from "next/server"
import { createUserSupabaseServerClient } from "@/lib/auth/create-user-supabase-server-client"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { getKycRequest } from "@/lib/services/kyc"
import { runSingleCheck } from "@/lib/services/kyc/orchestrator"
import { RunCheckOverrideSchema } from "@/lib/schemas/kyc"
import type { KycCheckType } from "@/lib/types/kyc"
import { KYC_CHECK_ORDER } from "@/lib/types/kyc"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string; checkType: string }> }
) {
  try {
    const ctx = await getUserOrg()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { requestId, checkType } = await params

    if (!KYC_CHECK_ORDER.includes(checkType as KycCheckType)) {
      return NextResponse.json(
        { error: `Unknown check type: ${checkType}. Valid: ${KYC_CHECK_ORDER.join(", ")}` },
        { status: 400 }
      )
    }

    const body: unknown = await req.json().catch(() => ({}))
    const parsed = RunCheckOverrideSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 422 })
    }

    const supabase = await createUserSupabaseServerClient()
    const request  = await getKycRequest(supabase, requestId, ctx.organizationId)
    if (!request) {
      return NextResponse.json({ error: "KYC request not found" }, { status: 404 })
    }

    // Check if already completed (unless forceRerun)
    if (!parsed.data.forceRerun) {
      const { data: existing } = await supabase
        .from("kyc_checks")
        .select("status, points_earned, result_summary")
        .eq("request_id", requestId)
        .eq("check_type", checkType)
        .single()

      if (existing && !["pending", "running"].includes(existing.status as string)) {
        return NextResponse.json({
          data: { message: "Check already completed. Pass forceRerun:true to re-run.", ...existing },
        })
      }
    }

    const result = await runSingleCheck(supabase, request, checkType as KycCheckType)

    return NextResponse.json({ data: result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    )
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ requestId: string; checkType: string }> }
) {
  try {
    const ctx = await getUserOrg()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { requestId, checkType } = await params

    const supabase = await createUserSupabaseServerClient()
    const { data, error } = await supabase
      .from("kyc_checks")
      .select("*")
      .eq("request_id", requestId)
      .eq("check_type", checkType)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Check not found" }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    )
  }
}
