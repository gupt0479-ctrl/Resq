import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { markFeedbackReplyApproved } from "@/lib/services/feedback"

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  try {
    const client = createServerSupabaseClient()
    await markFeedbackReplyApproved(client, DEMO_ORG_ID, id)
    return NextResponse.json({ data: { feedbackId: id, approved: true } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
