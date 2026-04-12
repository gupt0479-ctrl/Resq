import Anthropic from "@anthropic-ai/sdk"
import type { InventoryItem, InventoryPrediction, AiInventoryReport, VendorInsight } from "@/lib/types"
import type { MenuItemInventoryUsage, HistoricalReservation as Reservation, Shipment, VendorPerformanceStat } from "@/lib/types"
import { buildDemandFeatures } from "./feature-engineering"
import { baselineForecast } from "./baseline-forecast"
import {
  computeDaysToStockout,
  computeSafetyStock,
  computeReorderQty,
  assignRiskLevel,
  computeTopDrivers,
} from "./risk"
import { computeVendorPerformance } from "./vendor-performance"

// ── Date helpers ─────────────────────────────────────────────────────────────

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function dayName(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-AU", {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

// ── Restaurant-level context ─────────────────────────────────────────────────

type RestaurantContext = {
  past7dReservations: number
  past7dCovers: number
  past30dWeeklyAvgReservations: number
  past30dWeeklyAvgCovers: number
  demandTrendPct: number        // vs 30-day weekly average
  upcoming7dReservations: number
  upcoming7dCovers: number
  peakDays: { date: string; dayLabel: string; covers: number }[]
}

function computeRestaurantContext(
  reservations: Reservation[],
  asOfDate: string
): RestaurantContext {
  const today = new Date(asOfDate)
  const past7Start  = toISODate(addDays(today, -7))
  const past30Start = toISODate(addDays(today, -30))
  const next7End    = toISODate(addDays(today, 7))

  const past7d  = reservations.filter((r) => r.date >= past7Start  && r.date < asOfDate)
  const past30d = reservations.filter((r) => r.date >= past30Start && r.date < asOfDate)
  const next7d  = reservations.filter((r) => r.date >= asOfDate    && r.date <= next7End)

  const past7dCovers  = past7d.reduce((s, r) => s + r.covers, 0)
  const past30dCovers = past30d.reduce((s, r) => s + r.covers, 0)

  const past30dWeeklyAvgReservations = (past30d.length / 30) * 7
  const past30dWeeklyAvgCovers = (past30dCovers / 30) * 7

  const demandTrendPct =
    past30dWeeklyAvgCovers > 0
      ? Math.round(((past7dCovers - past30dWeeklyAvgCovers) / past30dWeeklyAvgCovers) * 100)
      : 0

  const upcoming7dCovers  = next7d.reduce((s, r) => s + r.covers, 0)

  // Identify peak days: top 3 by covers in the upcoming window
  const coversByDate = new Map<string, number>()
  for (const r of next7d) {
    coversByDate.set(r.date, (coversByDate.get(r.date) ?? 0) + r.covers)
  }
  const peakDays = Array.from(coversByDate.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([date, covers]) => ({ date, dayLabel: dayName(date), covers }))

  return {
    past7dReservations: past7d.length,
    past7dCovers,
    past30dWeeklyAvgReservations: Math.round(past30dWeeklyAvgReservations * 10) / 10,
    past30dWeeklyAvgCovers: Math.round(past30dWeeklyAvgCovers * 10) / 10,
    demandTrendPct,
    upcoming7dReservations: next7d.length,
    upcoming7dCovers,
    peakDays,
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

export type PredictionInput = {
  items: InventoryItem[]
  usages: MenuItemInventoryUsage[]
  reservations: Reservation[]
  shipments: Shipment[]
  asOfDate: string
}

type ExplanationResponse = {
  summaryText: string
  itemExplanations: {
    itemId: string
    explanationText: string
    reorderAction: string
    confidenceScore: number
  }[]
  vendorInsights: {
    vendorName: string
    performanceSummary: string
    negotiationSuggestion: string | null
    priority: "high" | "medium" | "low"
  }[]
}

// ── Prediction pipeline ───────────────────────────────────────────────────────

export function generatePredictions(input: PredictionInput): InventoryPrediction[] {
  const { items, usages, reservations, asOfDate } = input
  const today = new Date(asOfDate)

  return items
    .filter((item) => item.issueStatus !== "discontinued")
    .map((item) => {
      const features = buildDemandFeatures(item, reservations, usages, asOfDate)
      const forecast = baselineForecast(features)

      const safetyStock = computeSafetyStock(features.rollingAvg7)
      const daysToStockout = computeDaysToStockout(item.quantityOnHand, forecast.predictedDailyUsage)
      const recommendedReorderQty = computeReorderQty(
        forecast.predictedUsage14d,
        safetyStock,
        item.quantityOnHand
      )
      const riskLevel = assignRiskLevel(daysToStockout)
      const topDrivers = computeTopDrivers(features)

      // Order-by date: stockout date minus 2-day lead time buffer
      const orderByDate =
        daysToStockout < 999
          ? toISODate(addDays(today, Math.max(Math.floor(daysToStockout) - 2, 0)))
          : null

      // Item-level demand trend: last 7d daily rate vs last 30d daily rate
      const demandTrendPct =
        features.rollingAvg30 > 0
          ? Math.round(((features.rollingAvg7 - features.rollingAvg30) / features.rollingAvg30) * 100)
          : 0

      return {
        itemId: item.id,
        itemName: item.itemName,
        category: item.category,
        vendorName: item.vendorName,
        expiresAt: item.expiresAt ?? null,
        quantityOnHand: item.quantityOnHand,
        reorderLevel: item.reorderLevel,
        predictedUsage7d: Math.round(forecast.predictedUsage7d * 100) / 100,
        predictedUsage14d: Math.round(forecast.predictedUsage14d * 100) / 100,
        predictedDailyUsage: Math.round(forecast.predictedDailyUsage * 1000) / 1000,
        safetyStock,
        daysToStockout: Math.round(daysToStockout * 10) / 10,
        orderByDate,
        recommendedReorderQty,
        demandTrendPct,
        riskLevel,
        confidenceScore: null,
        topDrivers,
        explanationText: null,
      } satisfies InventoryPrediction
    })
}

// ── AI explanation layer ──────────────────────────────────────────────────────

export async function generateWithExplanations(
  input: PredictionInput
): Promise<AiInventoryReport> {
  const predictions = generatePredictions(input)
  const restaurantCtx = computeRestaurantContext(input.reservations, input.asOfDate)
  const vendorStats = computeVendorPerformance(input.shipments, input.items)

  const highMedium = predictions.filter(
    (p) => p.riskLevel === "high" || p.riskLevel === "medium"
  )

  const fallbackVendorInsights = buildFallbackVendorInsights(vendorStats)

  let explanations: ExplanationResponse = {
    summaryText: buildFallbackSummary(predictions, restaurantCtx),
    itemExplanations: [],
    vendorInsights: fallbackVendorInsights,
  }

  if (highMedium.length > 0 || vendorStats.some((v) => v.negotiationPriority !== "low")) {
    try {
      explanations = await callClaudeForExplanations(
        highMedium, restaurantCtx, vendorStats, input.asOfDate
      )
    } catch {
      explanations.summaryText = buildFallbackSummary(predictions, restaurantCtx)
      explanations.vendorInsights = fallbackVendorInsights
    }
  }

  const explMap = new Map(
    explanations.itemExplanations.map((e) => [e.itemId, e])
  )

  const enriched = predictions.map((p) => {
    const expl = explMap.get(p.itemId)
    const reorderAction = expl?.reorderAction ?? null
    return {
      ...p,
      explanationText: expl
        ? `${expl.explanationText}${reorderAction ? `\n\n→ ${reorderAction}` : ""}`
        : null,
      confidenceScore: expl?.confidenceScore ?? null,
    }
  })

  return {
    predictionDate: input.asOfDate,
    highRiskCount: enriched.filter((p) => p.riskLevel === "high").length,
    mediumRiskCount: enriched.filter((p) => p.riskLevel === "medium").length,
    lowRiskCount: enriched.filter((p) => p.riskLevel === "low").length,
    predictions: enriched,
    summaryText: explanations.summaryText,
    vendorInsights: explanations.vendorInsights,
    generatedAt: new Date().toISOString(),
  }
}

function buildFallbackVendorInsights(vendorStats: VendorPerformanceStat[]): VendorInsight[] {
  return vendorStats
    .filter((v) => v.negotiationPriority !== "low")
    .map((v) => {
      const performanceSummary =
        v.lateCount > 0
          ? `${v.lateCount} of ${v.totalDeliveries} deliveries were late (avg ${v.avgDaysLate}d, worst ${v.maxDaysLate}d)`
          : `${v.totalDeliveries} deliveries, all on time or early`
      return {
        vendorName: v.vendorName,
        performanceSummary,
        negotiationSuggestion: null,
        priority: v.negotiationPriority,
      }
    })
}

async function callClaudeForExplanations(
  items: InventoryPrediction[],
  ctx: RestaurantContext,
  vendorStats: VendorPerformanceStat[],
  asOfDate: string
): Promise<ExplanationResponse> {
  const client = new Anthropic()

  const trendWord =
    ctx.demandTrendPct > 0
      ? `up ${ctx.demandTrendPct}%`
      : ctx.demandTrendPct < 0
        ? `down ${Math.abs(ctx.demandTrendPct)}%`
        : "flat"

  const peakSummary = ctx.peakDays
    .map((d) => `${d.dayLabel} (${d.covers} covers)`)
    .join(", ")

  const systemPrompt = `You are the head chef and operations manager at Bistro Nova, a busy restaurant.
You analyse kitchen inventory forecasts and write clear, specific, manager-ready reports.

Your writing style:
- Direct and factual, no marketing fluff
- Always reference the specific data given (trend %, cover counts, vendor names, dates, delivery stats)
- Per-item reorder actions include: quantity to order, vendor to call, and the deadline date
- Overall summary is 2–3 sentences max
- Per-item explanation is 2 sentences max
- Per-item reorder action is one sentence: "Order X [unit] from [Vendor] by [date]"
- If an item also expires soon, mention it
- Vendor negotiation suggestions are 1–2 sentences: name the specific issue (late rate %, price spike), then a concrete action (e.g. request credit clause, benchmark alternatives, lock in pricing)`

  const userMessage = `Today: ${asOfDate} (${dayName(asOfDate)})
Restaurant: Bistro Nova

=== DEMAND CONTEXT ===
Past 7 days: ${ctx.past7dReservations} reservations, ${ctx.past7dCovers} covers
30-day weekly average: ${ctx.past30dWeeklyAvgReservations} reservations, ${ctx.past30dWeeklyAvgCovers} covers
Current demand trend: ${trendWord} vs 30-day average
Upcoming 7 days: ${ctx.upcoming7dReservations} reservations, ${ctx.upcoming7dCovers} covers booked
Peak days ahead: ${peakSummary || "none identified"}

=== VENDOR DELIVERY PERFORMANCE ===
${vendorStats.map((v) => {
  const latePct = v.totalDeliveries > 0
    ? Math.round((v.lateCount / v.totalDeliveries) * 100)
    : 0
  return `${v.vendorName}: ${v.totalDeliveries} deliveries, ${v.onTimePct}% on-time, ${latePct}% late (avg ${v.avgDaysLate}d late, worst ${v.maxDaysLate}d)${v.hasPriceIncrease ? " — HAS PRICE INCREASES" : ""} | spend $${v.totalSpend30d.toFixed(0)} | priority: ${v.negotiationPriority}`
}).join("\n")}

=== ITEMS NEEDING ATTENTION ===
${JSON.stringify(
    items.map((p) => ({
      itemId: p.itemId,
      itemName: p.itemName,
      category: p.category,
      vendor: p.vendorName,
      unit: p.itemName.match(/\(([^)]+)\)/)?.[1] ?? "units",
      quantityOnHand: p.quantityOnHand,
      predictedDailyUsage: p.predictedDailyUsage,
      predictedUsage7d: p.predictedUsage7d,
      daysToStockout: p.daysToStockout,
      orderByDate: p.orderByDate ? dayName(p.orderByDate) : null,
      recommendedReorderQty: p.recommendedReorderQty,
      demandTrendPct: p.demandTrendPct,
      riskLevel: p.riskLevel,
      expiresAt: p.expiresAt ?? null,
    })),
    null,
    2
  )}

Respond with valid JSON only (no markdown fences):
{
  "summaryText": "<2-3 sentence overall summary for the manager, referencing demand trend and peak days>",
  "itemExplanations": [
    {
      "itemId": "<string>",
      "explanationText": "<2 sentences: why it's at risk, referencing trend % and cover count>",
      "reorderAction": "<one sentence: Order X [unit] from [Vendor] by [date]>",
      "confidenceScore": <0.0-1.0>
    }
  ],
  "vendorInsights": [
    {
      "vendorName": "<string>",
      "performanceSummary": "<e.g. '5 of 9 deliveries were late (avg 2.1d, worst 5d)'>",
      "negotiationSuggestion": "<1-2 sentences with specific action, or null if vendor is reliable>",
      "priority": "<high|medium|low>"
    }
  ]
}`

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  })

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")

  const json = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim()
  return JSON.parse(json) as ExplanationResponse
}

function buildFallbackSummary(
  predictions: InventoryPrediction[],
  ctx: RestaurantContext
): string {
  const high = predictions.filter((p) => p.riskLevel === "high")
  const medium = predictions.filter((p) => p.riskLevel === "medium")

  if (high.length === 0 && medium.length === 0) {
    return `All inventory levels are healthy. ${ctx.upcoming7dReservations} reservations booked for the next 7 days — no immediate reorders required.`
  }

  const trendWord =
    ctx.demandTrendPct > 0
      ? `demand is up ${ctx.demandTrendPct}% vs the 30-day average`
      : ctx.demandTrendPct < 0
        ? `demand is down ${Math.abs(ctx.demandTrendPct)}% vs the 30-day average`
        : "demand is tracking at the 30-day average"

  const parts: string[] = [
    `With ${ctx.upcoming7dCovers} covers booked over the next 7 days and ${trendWord},`,
  ]
  if (high.length > 0) {
    parts.push(`${high.length} item${high.length > 1 ? "s" : ""} need urgent reorder: ${high.map((p) => p.itemName).join(", ")}.`)
  }
  if (medium.length > 0) {
    parts.push(`${medium.length} item${medium.length > 1 ? "s" : ""} require attention soon: ${medium.map((p) => p.itemName).join(", ")}.`)
  }
  return parts.join(" ")
}
