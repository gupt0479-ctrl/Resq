import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { getKycRequest } from "@/lib/services/kyc"
import { runSingleCheck, mapRowToRequest } from "@/lib/services/kyc/orchestrator"
import { RunCheckOverrideSchema } from "@/lib/schemas/kyc"
import type { KycCheckType } from "@/lib/types/kyc"
import { KYC_CHECK_ORDER } from "@/lib/types/kyc"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string; checkType: string }> }
) {
  try {
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

    const supabase = createServerSupabaseClient()
    const request  = await getKycRequest(supabase, requestId, DEMO_ORG_ID)
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
    const { requestId, checkType } = await params

    const supabase = createServerSupabaseClient()
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
