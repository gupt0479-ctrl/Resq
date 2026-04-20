import { NextRequest, NextResponse } from "next/server"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { markFeedbackReplyApproved } from "@/lib/services/feedback"

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  try {
    const ctxOrg = await getUserOrg()
    if (!ctxOrg) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await markFeedbackReplyApproved(ctxOrg.organizationId, id)
    return NextResponse.json({ data: { feedbackId: id, approved: true } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
