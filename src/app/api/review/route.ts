import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db, DEMO_ORG_ID } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { analyzeReview } from "../../../../agents/customer-service/agent.js"

const ReviewInputSchema = z.object({
  guestName: z.string().min(1),
  score: z.number().int().min(1).max(5),
  comment: z.string().min(1),
  source: z.enum(["internal", "google", "yelp", "opentable"]).default("internal"),
  guestId: z.string().uuid().optional().nullable(),
})

export async function POST(req: NextRequest) {
  // 1. Validate input
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = ReviewInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { guestName, score, comment, source, guestId } = parsed.data

  // 2. Fetch customer and build guestHistory
  let customerId: string | null = guestId ?? null
  let guestHistory = null

  if (guestId) {
    const [customer] = await db
      .select({
        id:               schema.customers.id,
        fullName:         schema.customers.fullName,
        lifetimeValue:    schema.customers.lifetimeValue,
        lastVisitAt:      schema.customers.lastVisitAt,
        avgFeedbackScore: schema.customers.avgFeedbackScore,
        notes:            schema.customers.notes,
      })
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.id, guestId),
          eq(schema.customers.organizationId, DEMO_ORG_ID),
        ),
      )
      .limit(1)

    if (customer) {
      customerId = customer.id
      guestHistory = {
        lifetimeSpend: Number(customer.lifetimeValue),
        lastVisit: customer.lastVisitAt?.toISOString() ?? null,
        dietaryNotes: customer.notes ?? null,
        vip: Number(customer.lifetimeValue ?? 0) > 1000 || Number(customer.avgFeedbackScore ?? 0) >= 4.9,
      }
    }
  }

  // 3. Call analyzeReview
  let analysis: Record<string, unknown>
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    analysis = await (analyzeReview as any)({ guestName, score, comment, source, guestHistory })
  } catch (err) {
    return NextResponse.json(
      { error: "Analysis failed", detail: String(err) },
      { status: 502 }
    )
  }

  const flagged =
    (analysis.urgency as number) >= 4 || analysis.safety_flag === true

  // 4. Insert into feedback
  const [feedbackRow] = await db
    .insert(schema.feedback)
    .values({
      organizationId:    DEMO_ORG_ID,
      customerId,
      source,
      guestNameSnapshot: guestName,
      score,
      comment,
      sentiment:      analysis.sentiment as string,
      topics:         analysis.topics as unknown[],
      urgency:        analysis.urgency as number,
      safetyFlag:     analysis.safety_flag as boolean,
      followUpStatus: analysis.follow_up_status as string,
      flagged,
      replyDraft:     (analysis.reply_draft as string) ?? null,
      internalNote:   (analysis.internal_note as string) ?? null,
      managerSummary: (analysis.manager_summary as string) ?? null,
      analysisJson: {
        churn_risk:      analysis.churn_risk,
        recovery_action: analysis.recovery_action,
      },
      analysisSource: "claude_api",
      receivedAt:     new Date(),
    })
    .returning({ id: schema.feedback.id })

  if (!feedbackRow) {
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    )
  }

  const feedbackId = feedbackRow.id

  // 5. Insert into ai_actions
  await db.insert(schema.aiActions).values({
    organizationId: DEMO_ORG_ID,
    entityType:     "feedback",
    entityId:       feedbackId,
    triggerType:    "feedback.received",
    actionType:     "customer_service.analyze_review",
    inputSummary:   `${guestName} · score ${score} · ${source}`,
    outputPayloadJson: {
      urgency:         analysis.urgency,
      sentiment:       analysis.sentiment,
      safety_flag:     analysis.safety_flag,
      churn_risk:      analysis.churn_risk,
      recovery_action: (analysis.recovery_action as Record<string, unknown>)?.type,
    },
    status: "executed",
  })

  // 6. PATCH customers.risk_status (only if we have a customer)
  if (customerId && analysis.risk_status_update) {
    const riskMap: Record<string, string> = {
      healthy: "none",
      at_risk: "at_risk",
      churned: "churned",
    }
    const newRisk = riskMap[analysis.risk_status_update as string]
    if (newRisk) {
      await db
        .update(schema.customers)
        .set({ riskStatus: newRisk })
        .where(
          and(
            eq(schema.customers.id, customerId),
            eq(schema.customers.organizationId, DEMO_ORG_ID),
          ),
        )
    }
  }

  return NextResponse.json({
    feedbackId,
    ...analysis,
  })
}
