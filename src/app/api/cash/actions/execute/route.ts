import { NextRequest, NextResponse } from "next/server"
import { createUserSupabaseServerClient } from "@/lib/auth/create-user-supabase-server-client"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { runForecast, logForecastRun } from "@/lib/services/cash/forecast-engine"
import { getObligations, getReceivables, getRefundExposure } from "@/lib/data/cash-forecast-config"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST /api/cash/actions/execute
 * Execute a forecast action and log the result.
 *
 * Body: { actionId, forecastRunId?, notes? }
 *
 * Supported actions:
 * - action-accelerate-*  → marks receivable confidence to 1.0 and shifts expected date earlier
 * - action-defer-*       → defers the obligation by 14 days
 * - action-reduce-discretionary → no data mutation, advisory only
 * - action-bridge-financing     → no data mutation, advisory only
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getUserOrg()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json().catch(() => ({})) as {
      actionId: string
      forecastRunId?: string
      notes?: string
    }

    if (!body.actionId) {
      return NextResponse.json({ error: "actionId is required" }, { status: 400 })
    }

    const actionId = body.actionId
    const organizationId = ctx.organizationId
    let mutationType = "advisory"
    let mutationDetail = ""

    // Clone current config for override
    const obligations = getObligations().map(o => ({ ...o }))
    const receivables = getReceivables().map(r => ({ ...r }))
    const refundExposure = getRefundExposure().map(r => ({ ...r }))

    // Apply the action
    if (actionId.startsWith("action-accelerate-")) {
      const rcvId = actionId.replace("action-accelerate-", "")
      const rcv = receivables.find(r => r.id === rcvId)
      if (rcv) {
        const oldDate = rcv.expectedDate
        // Shift expected date back by collection lag (accelerate)
        const shiftDays = Math.min(rcv.collectionLagDays, 7)
        const newDate = new Date(rcv.expectedDate)
        newDate.setDate(newDate.getDate() - shiftDays)
        rcv.expectedDate = newDate.toISOString().slice(0, 10)
        rcv.confidence = Math.min(1.0, rcv.confidence + 0.10)
        rcv.collectionLagDays = Math.max(0, rcv.collectionLagDays - shiftDays)
        mutationType = "accelerate_collection"
        mutationDetail = `Shifted ${rcv.description} from ${oldDate} to ${rcv.expectedDate}, confidence ${rcv.confidence.toFixed(2)}`
      }
    } else if (actionId.startsWith("action-defer-")) {
      const oblId = actionId.replace("action-defer-", "")
      const obl = obligations.find(o => o.id === oblId)
      if (obl && obl.isDeferrable) {
        const oldDate = obl.dueAt
        const newDate = new Date(obl.deferredTo ?? obl.dueAt)
        newDate.setDate(newDate.getDate() + 14)
        obl.deferredTo = newDate.toISOString().slice(0, 10)
        mutationType = "defer_payment"
        mutationDetail = `Deferred ${obl.description} from ${oldDate} to ${obl.deferredTo}`
      }
    } else if (actionId === "action-reduce-discretionary") {
      mutationType = "reduce_discretionary"
      mutationDetail = "Advisory action — operator should review non-essential spending"
    } else if (actionId === "action-bridge-financing") {
      mutationType = "bridge_financing_advisory"
      mutationDetail = "Advisory action — operator should contact bank for credit line options"
    } else {
      return NextResponse.json({ error: `Unknown action: ${actionId}` }, { status: 400 })
    }

    // Re-run forecast with the mutation applied
    const newForecast = await runForecast({
      organizationId,
      scenario: "base",
      overrides: { obligations, receivables, refundExposure },
    })

    // Log the new forecast run
    let newRunId = ""
    try {
      newRunId = await logForecastRun(newForecast, organizationId)
    } catch { /* best effort */ }

    // Log the action execution to ai_actions (best effort)
    try {
      const supabase = await createUserSupabaseServerClient()
      await supabase.from("ai_actions").insert({
        organization_id: organizationId,
        entity_type: "forecast",
        entity_id: body.forecastRunId ?? newRunId ?? "unknown",
        trigger_type: "operator_action",
        action_type: "cash_action_executed",
        input_summary: `Action: ${actionId} — ${mutationType}`,
        output_payload_json: {
          actionId,
          mutationType,
          mutationDetail,
          notes: body.notes ?? null,
          newBreakpointWeek: newForecast.breakpointWeek,
          newEndingCash: newForecast.endingCash,
          newRunId,
        },
        status: "executed",
      })
    } catch { /* best effort */ }

    return NextResponse.json({
      data: {
        actionId,
        mutationType,
        mutationDetail,
        newForecast: {
          startingCash: newForecast.startingCash,
          endingCash: newForecast.endingCash,
          breakpointWeek: newForecast.breakpointWeek,
          runwayWeeks: newForecast.runwayWeeks,
          payloadHash: newForecast.payloadHash,
        },
        runId: newRunId,
        notes: body.notes ?? null,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Action execution failed" },
      { status: 500 },
    )
  }
}
