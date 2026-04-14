import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
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
  const supabase = createServerSupabaseClient()

  // 2. Fetch customer and build guestHistory
  let customerId: string | null = guestId ?? null
  let guestHistory = null

  if (guestId) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id, full_name, lifetime_value, last_visit_at, avg_feedback_score, notes")
      .eq("id", guestId)
      .eq("organization_id", DEMO_ORG_ID)
      .maybeSingle()

    if (customer) {
      customerId = customer.id
      guestHistory = {
        lifetimeSpend: customer.lifetime_value,
        lastVisit: customer.last_visit_at,
        dietaryNotes: customer.notes ?? null,
        // Derive vip from high lifetime value or high avg score
        vip: (customer.lifetime_value ?? 0) > 1000 || (customer.avg_feedback_score ?? 0) >= 4.9,
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
  const { data: feedbackRow, error: feedbackError } = await supabase
    .from("feedback")
    .insert({
      organization_id: DEMO_ORG_ID,
      customer_id: customerId,
      source,
      guest_name_snapshot: guestName,
      score,
      comment,
      sentiment: analysis.sentiment,
      topics: analysis.topics,
      urgency: analysis.urgency,
      safety_flag: analysis.safety_flag,
      follow_up_status: analysis.follow_up_status,
      flagged,
      reply_draft: analysis.reply_draft ?? null,
      internal_note: analysis.internal_note ?? null,
      manager_summary: analysis.manager_summary ?? null,
      analysis_json: {
        churn_risk: analysis.churn_risk,
        recovery_action: analysis.recovery_action,
      },
      analysis_source: "claude_api",
      received_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (feedbackError) {
    return NextResponse.json(
      { error: "Failed to save feedback", detail: feedbackError.message },
      { status: 500 }
    )
  }

  const feedbackId = feedbackRow.id

  // 5. Insert into ai_actions
  await supabase.from("ai_actions").insert({
    organization_id: DEMO_ORG_ID,
    entity_type: "feedback",
    entity_id: feedbackId,
    trigger_type: "feedback.received",
    action_type: "customer_service.analyze_review",
    input_summary: `${guestName} · score ${score} · ${source}`,
    output_payload_json: {
      urgency: analysis.urgency,
      sentiment: analysis.sentiment,
      safety_flag: analysis.safety_flag,
      churn_risk: analysis.churn_risk,
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
      await supabase
        .from("customers")
        .update({ risk_status: newRisk })
        .eq("id", customerId)
        .eq("organization_id", DEMO_ORG_ID)
    }
  }

  return NextResponse.json({
    feedbackId,
    ...analysis,
  })
}
