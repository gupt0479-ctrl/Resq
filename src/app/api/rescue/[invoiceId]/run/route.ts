import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { recordAiAction } from "@/lib/services/ai-actions"
import { runCollectionsDecision } from "@/lib/services/collections-decision-agent"
import type { AiActionType } from "@/lib/constants/enums"

const ACTION_MAP: Record<string, AiActionType> = {
  reminder:       "customer_followup_sent",
  payment_plan:   "payment_plan_suggested",
  escalation:     "rescue_case_resolved",
  clarification:  "dispute_clarification_sent",
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params
  const client = createServerSupabaseClient()

  let decision
  try {
    decision = await runCollectionsDecision(client, invoiceId, DEMO_ORG_ID)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }

  const actionType: AiActionType =
    ACTION_MAP[decision.selectedAction] ?? "receivable_risk_detected"

  const summary = `[${decision.classification.replace("_", " ")} · ${decision.confidence}% confidence] ${decision.outreachDraft.slice(0, 120)}`

  const actionId = await recordAiAction(client, {
    organizationId: DEMO_ORG_ID,
    entityType:     "invoice",
    entityId:       invoiceId,
    triggerType:    "manual_rescue",
    actionType,
    inputSummary:   summary,
    outputPayload:  {
      detail:               decision.outreachDraft,
      nextRecommendedStep:  decision.responsePlan.noReply,
      decision,
    },
    status: "executed",
  })

  return NextResponse.json({
    actionId,
    actionType,
    summary,
    detail:              decision.outreachDraft,
    nextRecommendedStep: decision.responsePlan.noReply,
    decision,
  })
}
