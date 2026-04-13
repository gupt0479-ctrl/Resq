import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import {
  analyzeAndPersistFeedback,
  ingestFeedbackRow,
} from "@/lib/services/feedback"

/** Live demo / n8n entrypoint — mirrors internal feedback submit (CLAUDE.md). */
const ReviewBodySchema = z.object({
  guestName: z.string().min(1).max(200),
  score:     z.number().int().min(1).max(5),
  comment:   z.string().max(8000).default(""),
  source:    z.string().max(40).default("internal"),
  guestId:   z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = ReviewBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 422 }
    )
  }

  const { guestName, score, comment, source, guestId } = parsed.data

  try {
    const client = createServerSupabaseClient()
    const { feedbackId } = await ingestFeedbackRow(client, {
      organizationId: DEMO_ORG_ID,
      customerId:     guestId ?? null,
      appointmentId:  null,
      guestName,
      score,
      comment,
      source,
      externalReviewId: null,
      externalSource:   null,
    })

    await analyzeAndPersistFeedback(client, DEMO_ORG_ID, feedbackId, {
      guestName,
      score,
      comment,
      source,
      customerId: guestId ?? null,
    })

    const { data: row } = await client
      .from("feedback")
      .select("sentiment, urgency, safety_flag, follow_up_status, manager_summary, analysis_json")
      .eq("id", feedbackId)
      .single()

    return NextResponse.json({
      data: {
        feedbackId,
        ...(row as Record<string, unknown>),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
