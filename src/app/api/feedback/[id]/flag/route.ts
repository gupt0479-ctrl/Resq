import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { FeedbackFlagBodySchema } from "@/lib/schemas/feedback"
import { setFeedbackFlagged } from "@/lib/services/feedback"

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    /* empty */
  }
  const parsed = FeedbackFlagBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 422 }
    )
  }

  try {
    const client = createServerSupabaseClient()
    await setFeedbackFlagged(client, DEMO_ORG_ID, id, parsed.data.flagged)
    return NextResponse.json({ data: { feedbackId: id, flagged: parsed.data.flagged } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
