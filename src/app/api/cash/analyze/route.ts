import { NextResponse } from "next/server"
import { DEMO_ORG_ID } from "@/lib/db"
import { generate } from "@/lib/services/forecast-engine"
import { detect } from "@/lib/services/breakpoint-detector"
import { analyze } from "@/lib/services/risk-driver-analyzer"
import { rank } from "@/lib/services/action-ranker"
import { computeForClient } from "@/lib/services/collection-lag"
import { recordAiAction } from "@/lib/services/ai-actions"
import type { ClientCollectionLag } from "@/lib/schemas/cash"

// Fallback lag when DB lookup fails
function fallbackLag(clientId: string): ClientCollectionLag {
  return {
    clientId,
    clientName: "Unknown",
    avgDaysToCollect: 30,
    tier: "slightly_late",
    paidInvoiceCount: 0,
    onTimePercent: 0,
  }
}

export async function POST(request: Request) {
  const body = await request.json()
  const orgId = body.organizationId ?? DEMO_ORG_ID
  const clientId = body.clientId

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 })
  }

  try {
    // Run deterministic path — collection lag is non-blocking (falls back on error)
    const [forecast, collectionLag] = await Promise.all([
      generate(orgId, "base"),
      computeForClient(orgId, clientId).catch((err) => {
        console.error("[cash/analyze] computeForClient failed, using fallback:", err)
        return fallbackLag(clientId)
      }),
    ])

    const breakpoint = await detect(forecast)
    const drivers = await analyze(orgId, forecast, breakpoint)

    // AI-assisted path: action ranker handles external signals, interventions, summary
    const rankResult = await rank(breakpoint, drivers, clientId, orgId)

    // Record audit entry — non-blocking, never 500 the route
    let auditRecordId = "00000000-0000-0000-0000-000000000000"
    try {
      auditRecordId = await recordAiAction({
        organizationId: orgId,
        entityType: "customer",
        entityId: clientId,
        triggerType: `cash_analysis_${Date.now()}`,
        actionType: "rescue_case_opened",
        inputSummary: `Full cash analysis for $${rankResult.clientSummary.totalOutstanding.toLocaleString()} outstanding from ${collectionLag.clientName}`,
        outputPayload: {
          breakpointDetected: breakpoint.detected,
          breakpointWeek: breakpoint.weekNumber,
          interventionCount: rankResult.interventions.length,
          mode: rankResult.mode,
          degradedFromLive: rankResult.degradedFromLive,
        },
        status: "executed",
      })
    } catch (auditErr) {
      console.error("[cash/analyze] Audit logging failed (non-blocking):", auditErr)
    }

    return NextResponse.json({
      organizationId: orgId,
      clientId,
      clientName: collectionLag.clientName,
      clientSummary: rankResult.clientSummary,
      collectionLag,
      aiSummary: rankResult.aiSummary,
      externalFindings: rankResult.externalFindings,
      interventions: rankResult.interventions,
      recommendedAction: rankResult.recommendedAction,
      breakpoint,
      riskDrivers: drivers,
      auditRecordId,
      mode: rankResult.mode,
      degradedFromLive: rankResult.degradedFromLive,
      warning: rankResult.warning,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error("[cash/analyze] Error:", err)
    return NextResponse.json(
      { error: "Analysis failed", detail: String(err) },
      { status: 500 },
    )
  }
}
