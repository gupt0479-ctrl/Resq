import { NextRequest, NextResponse } from "next/server"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { FeedbackFollowUpBodySchema } from "@/lib/schemas/feedback"
import { enqueueFollowUpFromBody } from "@/lib/services/feedback"

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const ctxOrg = await getUserOrg()
  if (!ctxOrg) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = FeedbackFollowUpBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 422 }
    )
  }

  try {
    await enqueueFollowUpFromBody(ctxOrg.organizationId, id, {
      actionType:   parsed.data.actionType,
      channel:      parsed.data.channel,
      priority:     parsed.data.priority,
      messageDraft: parsed.data.messageDraft,
    })
    return NextResponse.json({ data: { feedbackId: id, queued: true } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
