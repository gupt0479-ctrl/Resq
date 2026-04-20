import { NextRequest, NextResponse } from "next/server"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { FeedbackFollowUpDecisionBodySchema } from "@/lib/schemas/feedback"
import { setFollowUpActionDecision } from "@/lib/services/feedback"

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ actionId: string }> }
) {
  const { actionId } = await ctx.params
  const ctxOrg = await getUserOrg()
  if (!ctxOrg) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = FeedbackFollowUpDecisionBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 422 }
    )
  }

  try {
    await setFollowUpActionDecision(ctxOrg.organizationId, actionId, parsed.data.decision)
    return NextResponse.json({ data: { actionId, decision: parsed.data.decision } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
