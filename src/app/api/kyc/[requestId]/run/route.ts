import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { getKycRequest } from "@/lib/services/kyc"
import { runAllPendingChecks } from "@/lib/services/kyc/orchestrator"
import { RunAllChecksSchema } from "@/lib/schemas/kyc"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params
    const body: unknown = await req.json().catch(() => ({}))
    const parsed = RunAllChecksSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 422 })
    }

    const supabase = createServerSupabaseClient()
    const existing = await getKycRequest(supabase, requestId, DEMO_ORG_ID)
    if (!existing) {
      return NextResponse.json({ error: "KYC request not found" }, { status: 404 })
    }

    if (existing.status === "completed_verified") {
      return NextResponse.json({
        data: { message: "KYC already verified", status: existing.status, score: existing.riskScore },
      })
    }

    const result = await runAllPendingChecks(supabase, requestId, parsed.data.startFromCheck)

    return NextResponse.json({ data: result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    )
  }
}
