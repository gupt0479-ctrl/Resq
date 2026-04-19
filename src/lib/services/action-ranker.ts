import "server-only"

import Anthropic from "@anthropic-ai/sdk"
import { db } from "@/lib/db"
import { invoices, customers } from "@/lib/db/schema"
import { eq, and, inArray } from "drizzle-orm"
import { search as tinyFishSearch } from "@/lib/tinyfish/client"
import { isTinyFishMockMode } from "@/lib/env"
import { FINANCING_OFFERS } from "@/lib/tinyfish/mock-data"
import { recordAiAction } from "@/lib/services/ai-actions"
import { computeForClient } from "@/lib/services/collection-lag"
import type {
  BreakpointResult,
  RiskDriver,
  Intervention,
  ClientSummaryBoxes,
} from "@/lib/schemas/cash"

// ── Types ──────────────────────────────────────────────────────────────────

interface ExternalFindings {
  newsSummary: string
  rawSnippets: string[]
  distressFlag: boolean
  dataSource: "live" | "mock"
}

interface RankResult {
  interventions: Intervention[]
  recommendedAction: Intervention | null
  aiSummary: string
  externalFindings: ExternalFindings
  clientSummary: ClientSummaryBoxes
  mode: "live" | "mock"
  degradedFromLive: boolean
  warning: string | null
}

// ── Claude client (lazy, same pattern as collections-decision-agent) ──────

const anthropic = new Anthropic()

// ── Helpers ────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function compositeScore(intervention: Intervention): number {
  const cashNorm = Math.min(intervention.cashImpactEstimate / 50_000, 1)
  const speedNorm = intervention.speedDays > 0 ? 1 / intervention.speedDays : 1
  return cashNorm * 0.4 + speedNorm * 0.3 + intervention.confidenceScore * 0.3
}

// ── External signals (replicates fetchExternalSignals pattern) ─────────────

async function fetchExternalSignals(customerName: string): Promise<ExternalFindings> {
  let degradedFromLive = false
  try {
    const result = await tinyFishSearch(
      `"${customerName}" financial distress bankruptcy late payments 2025 2026`,
    )
    const articles = result.results ?? []
    const rawSnippets = articles
      .slice(0, 3)
      .map((a) => a.snippet ?? a.title ?? "")
      .filter(Boolean)
    const combinedText = rawSnippets.join(" ").toLowerCase()
    const distressFlag =
      combinedText.includes("bankrupt") ||
      combinedText.includes("insolvency") ||
      combinedText.includes("layoff") ||
      combinedText.includes("shutdown") ||
      combinedText.includes("closure")

    const rawMode = (result as { mode?: string }).mode ?? "mock"
    const dataSource: "live" | "mock" =
      rawMode === "live" ? "live" : "mock"
    degradedFromLive = (result as { degradedFromLive?: boolean }).degradedFromLive ?? false

    if (rawSnippets.length === 0) {
      return {
        newsSummary: "No notable news found for this customer.",
        rawSnippets: [],
        distressFlag: false,
        dataSource,
      }
    }

    // Attempt Claude summarization
    let newsSummary = ""
    try {
      const msg = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 150,
        messages: [
          {
            role: "user",
            content: `You are summarizing web search results for a collections agent. Given these snippets about "${customerName}", write 1-2 sentences summarizing what's in the news — focus on any financial risk, legal trouble, or business health signals. Be direct and factual.\n\n${rawSnippets.join("\n\n")}`,
          },
        ],
      })
      newsSummary =
        msg.content[0]?.type === "text" ? msg.content[0].text.trim() : ""
    } catch (err) {
      console.error("[action-ranker] Claude news summary failed:", err)
    }

    if (!newsSummary) {
      newsSummary =
        rawSnippets.length > 0
          ? `Found ${rawSnippets.length} result(s) for "${customerName}" — no clear financial risk signals detected.`
          : "No notable news found for this customer."
    }

    return { newsSummary, rawSnippets, distressFlag, dataSource }
  } catch {
    return {
      newsSummary: "External signal search unavailable.",
      rawSnippets: [],
      distressFlag: false,
      dataSource: "mock",
    }
  }
}

// ── Client info from DB ────────────────────────────────────────────────────

interface ClientInfo {
  clientName: string
  totalOutstanding: number
  openInvoiceCount: number
  avgDaysToPay: number
  onTimePercent: number
}

async function fetchClientInfo(
  orgId: string,
  clientId: string,
): Promise<ClientInfo> {
  // Client name
  const [cust] = await db
    .select({ fullName: customers.fullName })
    .from(customers)
    .where(eq(customers.id, clientId))
    .limit(1)
  const clientName = cust?.fullName ?? "Unknown"

  // Open invoices
  const openRows = await db
    .select({
      totalAmount: invoices.totalAmount,
      amountPaid: invoices.amountPaid,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.organizationId, orgId),
        eq(invoices.customerId, clientId),
        inArray(invoices.status, ["sent", "pending", "overdue"]),
      ),
    )

  const totalOutstanding = round2(
    openRows.reduce(
      (sum, r) => sum + (Number(r.totalAmount) - Number(r.amountPaid)),
      0,
    ),
  )

  // Collection lag for this client
  const lag = await computeForClient(orgId, clientId)

  return {
    clientName,
    totalOutstanding,
    openInvoiceCount: openRows.length,
    avgDaysToPay: lag.avgDaysToCollect,
    onTimePercent: lag.onTimePercent,
  }
}

// ── Intervention generation ────────────────────────────────────────────────

function generateInterventions(
  breakpoint: BreakpointResult,
  drivers: RiskDriver[],
  clientInfo: ClientInfo,
  externalFindings: ExternalFindings,
): Intervention[] {
  const interventions: Intervention[] = []

  // 1. For each receivable_slippage driver → accelerate_collection
  for (const driver of drivers.filter(
    (d) => d.category === "receivable_slippage",
  )) {
    interventions.push({
      id: crypto.randomUUID(),
      category: "accelerate_collection",
      description: `Send structured payment plan offer for ${driver.description}`,
      cashImpactEstimate: driver.cashImpact,
      speedDays: 7,
      riskLevel: "low",
      confidenceScore: 0.85,
      sourceAttribution: null,
      executable: true,
    })
  }

  // If no receivable drivers but client has outstanding, add a generic collection action
  if (
    interventions.length === 0 &&
    clientInfo.totalOutstanding > 0
  ) {
    interventions.push({
      id: crypto.randomUUID(),
      category: "accelerate_collection",
      description: `Follow up with ${clientInfo.clientName} on $${clientInfo.totalOutstanding.toLocaleString()} outstanding`,
      cashImpactEstimate: clientInfo.totalOutstanding,
      speedDays: 14,
      riskLevel: "low",
      confidenceScore: 0.75,
      sourceAttribution: null,
      executable: true,
    })
  }

  // 2. If breakpoint detected → secure_financing from FINANCING_OFFERS
  if (breakpoint.detected) {
    const topOffer = FINANCING_OFFERS[0]
    interventions.push({
      id: crypto.randomUUID(),
      category: "secure_financing",
      description: `${topOffer.product} from ${topOffer.lender} — up to $${topOffer.maxAmountUsd.toLocaleString()} at ${topOffer.aprPercent}% APR, ${topOffer.decisionSpeed} decision`,
      cashImpactEstimate: Math.min(
        topOffer.maxAmountUsd,
        breakpoint.shortfallAmount ?? 0,
      ),
      speedDays: topOffer.decisionSpeed.includes("48") ? 2 : 14,
      riskLevel: "medium",
      confidenceScore: topOffer.confidence,
      sourceAttribution: isTinyFishMockMode()
        ? "mock financing data"
        : topOffer.sourceUrl,
      executable: false,
    })
  }

  // 3. For expense_spike / recurring_obligation_increase → reduce_expense or defer_payment
  for (const driver of drivers.filter(
    (d) =>
      d.category === "expense_spike" ||
      d.category === "recurring_obligation_increase",
  )) {
    const isExpense = driver.category === "expense_spike"
    interventions.push({
      id: crypto.randomUUID(),
      category: isExpense ? "reduce_expense" : "defer_payment",
      description: isExpense
        ? `Review and reduce: ${driver.description}`
        : `Negotiate deferral: ${driver.description}`,
      cashImpactEstimate: driver.cashImpact,
      speedDays: isExpense ? 14 : 30,
      riskLevel: isExpense ? "low" : "medium",
      confidenceScore: 0.7,
      sourceAttribution: null,
      executable: false,
    })
  }

  // 4. If distress flag from external signals, add a cautious collection note
  if (externalFindings.distressFlag && interventions.length > 0) {
    // Adjust confidence on collection actions downward
    for (const iv of interventions) {
      if (iv.category === "accelerate_collection") {
        iv.confidenceScore = round2(iv.confidenceScore * 0.8)
        iv.riskLevel = "medium"
      }
    }
  }

  return interventions
}

// ── Ranking ────────────────────────────────────────────────────────────────

function rankInterventions(interventions: Intervention[]): Intervention[] {
  return [...interventions].sort(
    (a, b) => compositeScore(b) - compositeScore(a),
  )
}

// ── Claude summary generation ──────────────────────────────────────────────

async function generateAiSummary(
  clientInfo: ClientInfo,
  breakpoint: BreakpointResult,
  drivers: RiskDriver[],
  externalFindings: ExternalFindings,
  recommended: Intervention | null,
): Promise<string> {
  try {
    const driverSummary = drivers
      .slice(0, 3)
      .map((d) => `- ${d.category}: ${d.description} ($${d.cashImpact.toLocaleString()} impact)`)
      .join("\n")

    const prompt = `You are a CFO cash advisor. Summarize this client analysis in 2-3 sentences. Be direct and factual. Reference specific dollar amounts.

Client: ${clientInfo.clientName}
Outstanding: $${clientInfo.totalOutstanding.toLocaleString()} across ${clientInfo.openInvoiceCount} invoice(s)
Avg days to pay: ${clientInfo.avgDaysToPay} days
On-time payment rate: ${clientInfo.onTimePercent}%
Breakpoint: ${breakpoint.detected ? `Week ${breakpoint.weekNumber} (shortfall $${breakpoint.shortfallAmount?.toLocaleString()})` : "No risk detected"}
Top risk drivers:
${driverSummary || "None identified"}
External signals: ${externalFindings.newsSummary}
Recommended action: ${recommended?.description ?? "No action recommended"}`

    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 250,
      messages: [{ role: "user", content: prompt }],
    })

    const text =
      msg.content[0]?.type === "text" ? msg.content[0].text.trim() : ""
    if (text) return text
  } catch (err) {
    console.error("[action-ranker] Claude summary generation failed:", err)
  }

  // Template fallback
  return buildTemplateSummary(clientInfo, breakpoint, drivers, recommended)
}

function buildTemplateSummary(
  clientInfo: ClientInfo,
  breakpoint: BreakpointResult,
  drivers: RiskDriver[],
  recommended: Intervention | null,
): string {
  const parts: string[] = []

  parts.push(
    `${clientInfo.clientName} owes $${clientInfo.totalOutstanding.toLocaleString()} across ${clientInfo.openInvoiceCount} invoice(s).`,
  )
  parts.push(
    `Average payment time is ${clientInfo.avgDaysToPay} days (${clientInfo.onTimePercent}% on-time rate).`,
  )

  if (breakpoint.detected) {
    parts.push(
      `Cash breakpoint detected at week ${breakpoint.weekNumber} with a $${breakpoint.shortfallAmount?.toLocaleString()} shortfall.`,
    )
  } else {
    parts.push("No cash breakpoint detected within the 13-week horizon.")
  }

  if (drivers.length > 0) {
    parts.push(
      `Largest risk driver: ${drivers[0].description}.`,
    )
  }

  if (recommended) {
    parts.push(`Recommended action: ${recommended.description}.`)
  }

  return parts.join(" ")
}

// ── Main rank function ─────────────────────────────────────────────────────

export async function rank(
  breakpoint: BreakpointResult,
  drivers: RiskDriver[],
  clientId: string,
  orgId: string,
): Promise<RankResult> {
  let degradedFromLive = false
  let warning: string | null = null
  const mode: "live" | "mock" = isTinyFishMockMode() ? "mock" : "live"

  // 1. Fetch client info from DB
  const clientInfo = await fetchClientInfo(orgId, clientId)

  // 2. Fetch external signals (TinyFish search — mock or live based on env)
  let externalFindings: ExternalFindings
  try {
    externalFindings = await fetchExternalSignals(clientInfo.clientName)
    if (
      externalFindings.dataSource === "mock" &&
      mode === "live"
    ) {
      degradedFromLive = true
      warning = "TinyFish external signals degraded to mock mode."
    }
  } catch {
    externalFindings = {
      newsSummary: "External signal search unavailable.",
      rawSnippets: [],
      distressFlag: false,
      dataSource: "mock",
    }
    if (mode === "live") {
      degradedFromLive = true
      warning = "TinyFish external signals failed; using fallback."
    }
  }

  // 3. Generate interventions based on breakpoint/drivers
  const rawInterventions = generateInterventions(
    breakpoint,
    drivers,
    clientInfo,
    externalFindings,
  )

  // 4. Rank by composite score
  const interventions = rankInterventions(rawInterventions)
  const recommendedAction = interventions.length > 0 ? interventions[0] : null

  // 5. Build client summary boxes — reuse lag data already fetched in fetchClientInfo
  const riskClassification = classifyClient(
    clientInfo.avgDaysToPay,
    clientInfo.onTimePercent,
    externalFindings.distressFlag,
  )

  const clientSummary: ClientSummaryBoxes = {
    totalOutstanding: clientInfo.totalOutstanding,
    avgDaysToPay: clientInfo.avgDaysToPay,
    paymentReliabilityPercent: clientInfo.onTimePercent,
    riskClassification,
  }

  // 6. Generate Claude summary (or template fallback)
  const aiSummary = await generateAiSummary(
    clientInfo,
    breakpoint,
    drivers,
    externalFindings,
    recommendedAction,
  )

  // 7. Record audit entry
  try {
    await recordAiAction({
      organizationId: orgId,
      entityType: "customer",
      entityId: clientId,
      triggerType: `cash_analysis_${Date.now()}`,
      actionType: "financing_options_scouted",
      inputSummary: `Action ranking for ${clientInfo.clientName}: ${interventions.length} interventions generated, breakpoint ${breakpoint.detected ? `week ${breakpoint.weekNumber}` : "none"}`,
      outputPayload: {
        interventionCount: interventions.length,
        recommendedCategory: recommendedAction?.category ?? null,
        breakpointDetected: breakpoint.detected,
        mode,
        degradedFromLive,
      },
      status: "executed",
    })
  } catch (err) {
    console.error("[action-ranker] Failed to record audit entry:", err)
  }

  return {
    interventions,
    recommendedAction,
    aiSummary,
    externalFindings,
    clientSummary,
    mode,
    degradedFromLive,
    warning,
  }
}

// ── Client classification helper ───────────────────────────────────────────

function classifyClient(
  avgDaysToPay: number,
  onTimePercent: number,
  distressFlag: boolean,
): "forgot" | "cash_flow" | "disputing" | "bad_actor" {
  if (distressFlag) return "cash_flow"
  if (avgDaysToPay <= 10 && onTimePercent >= 80) return "forgot"
  if (avgDaysToPay > 30 || onTimePercent < 40) return "bad_actor"
  return "cash_flow"
}
