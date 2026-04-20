import { NextRequest, NextResponse } from "next/server"
import { createUserSupabaseServerClient } from "@/lib/auth/create-user-supabase-server-client"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { applyOperatorAction } from "@/lib/services/kyc"
import { OperatorActionSchema } from "@/lib/schemas/kyc"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const ctx = await getUserOrg()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { requestId } = await params
    const body: unknown = await req.json().catch(() => ({}))
    const parsed = OperatorActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 422 })
    }

    const supabase = await createUserSupabaseServerClient()

    // Confirm request exists
    const { data: req_ } = await supabase
      .from("kyc_verification_requests")
      .select("id, status")
      .eq("id", requestId)
      .eq("organization_id", ctx.organizationId)
      .single()

    if (!req_) {
      return NextResponse.json({ error: "KYC request not found" }, { status: 404 })
    }

    await applyOperatorAction(
      supabase,
      requestId,
      ctx.organizationId,
      parsed.data.action,
      parsed.data.notes,
      parsed.data.actorId
    )

    const actionLabels = {
      escalate_to_legal:       "Escalated to legal team",
      override_and_approve:    "Manually approved — agent activated",
      decline_and_blacklist:   "Declined and blacklisted — agent permanently blocked",
    }

    return NextResponse.json({
      data: {
        requestId,
        action:  parsed.data.action,
        message: actionLabels[parsed.data.action],
        timestamp: new Date().toISOString(),
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    )
  }
}
