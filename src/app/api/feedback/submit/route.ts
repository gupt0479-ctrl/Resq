import { NextRequest, NextResponse } from "next/server"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { FeedbackSubmitBodySchema } from "@/lib/schemas/feedback"
import {
  analyzeAndPersistFeedback,
  ingestFeedbackRow,
} from "@/lib/services/feedback"

export async function POST(request: NextRequest) {
  const ctx = await getUserOrg()
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = FeedbackSubmitBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 422 }
    )
  }

  const {
    guestName,
    score,
    comment,
    source,
    customerId,
    appointmentId,
    analyze,
  } = parsed.data

  try {
    const { feedbackId, created } = await ingestFeedbackRow({
      organizationId: ctx.organizationId,
      customerId:     customerId ?? null,
      appointmentId:  appointmentId ?? null,
      guestName,
      score,
      comment,
      source,
      externalReviewId: null,
      externalSource:   null,
    })

    if (analyze) {
      await analyzeAndPersistFeedback(ctx.organizationId, feedbackId, {
        guestName,
        score,
        comment,
        source,
        customerId: customerId ?? null,
      })
    }

    return NextResponse.json({
      data: { feedbackId, created, analyzed: Boolean(analyze) },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
