import { NextRequest, NextResponse } from "next/server"
import { createUserSupabaseServerClient } from "@/lib/auth/create-user-supabase-server-client"
import { getUserOrg } from "@/lib/auth/get-user-org"
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
  const ctx = await getUserOrg()
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { invoiceId } = await params
  const client = await createUserSupabaseServerClient()

  let decision
  try {
    decision = await runCollectionsDecision(client, invoiceId, ctx.organizationId)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }

  const actionType: AiActionType =
    ACTION_MAP[decision.selectedAction] ?? "receivable_risk_detected"

  const summary = `[${decision.classification.replace("_", " ")} · ${decision.confidence}% confidence] ${decision.outreachDraft.slice(0, 120)}`

  const actionId = await recordAiAction({
    organizationId: ctx.organizationId,
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
