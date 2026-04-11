import Anthropic from "@anthropic-ai/sdk"
import type { InventoryItem, InventoryPrediction, AiInventoryReport } from "@/lib/types"
import type { MenuItemInventoryUsage, Reservation } from "@/lib/types"
import { buildDemandFeatures } from "./feature-engineering"
import { baselineForecast } from "./baseline-forecast"
import {
  computeDaysToStockout,
  computeSafetyStock,
  computeReorderQty,
  assignRiskLevel,
  computeTopDrivers,
} from "./risk"

const ANTHROPIC_SYSTEM_PROMPT = `You are a restaurant inventory analyst for Bistro Nova.
You receive structured forecast data for kitchen ingredients and generate concise,
actionable inventory summaries and per-item explanations for the restaurant manager.

Your summaries:
- Are plain, direct, and professional (no fluff)
- Prioritise items with high or medium risk
- Reference upcoming reservation volume when relevant
- Express quantities in the same unit as the item (kg, L, dozen, tin, etc.)
- Are under 60 words for the overall summary
- Are under 40 words per item explanation`

type PredictionInput = {
  items: InventoryItem[]
  usages: MenuItemInventoryUsage[]
  reservations: Reservation[]
  asOfDate: string
}

type ExplanationResponse = {
  summaryText: string
  itemExplanations: {
    itemId: string
    explanationText: string
    confidenceScore: number
  }[]
}

/**
 * Run the full prediction pipeline for all items as of `asOfDate`.
 * Returns stored predictions without calling the AI.
 * Call `generateWithExplanations` if you want Claude-generated explanations too.
 */
export function generatePredictions(input: PredictionInput): InventoryPrediction[] {
  const { items, usages, reservations, asOfDate } = input

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

      return {
        itemId: item.id,
        itemName: item.itemName,
        category: item.category,
        quantityOnHand: item.quantityOnHand,
        reorderLevel: item.reorderLevel,
        predictedUsage7d: Math.round(forecast.predictedUsage7d * 100) / 100,
        predictedUsage14d: Math.round(forecast.predictedUsage14d * 100) / 100,
        predictedDailyUsage: Math.round(forecast.predictedDailyUsage * 1000) / 1000,
        safetyStock,
        daysToStockout: Math.round(daysToStockout * 10) / 10,
        recommendedReorderQty,
        riskLevel,
        confidenceScore: null,
        topDrivers,
        explanationText: null,
      } satisfies InventoryPrediction
    })
}

/**
 * Generate predictions AND call Claude for natural-language explanations.
 * Only sends high/medium risk items to the model to save tokens.
 */
export async function generateWithExplanations(
  input: PredictionInput
): Promise<AiInventoryReport> {
  const predictions = generatePredictions(input)

  const highMedium = predictions.filter(
    (p) => p.riskLevel === "high" || p.riskLevel === "medium"
  )

  let explanations: ExplanationResponse = {
    summaryText: buildFallbackSummary(predictions),
    itemExplanations: [],
  }

  if (highMedium.length > 0) {
    try {
      explanations = await callClaudeForExplanations(highMedium, input.asOfDate)
    } catch {
      // Fallback: use deterministic summary if AI call fails
      explanations.summaryText = buildFallbackSummary(predictions)
    }
  }

  // Merge AI explanations back into predictions
  const explMap = new Map(
    explanations.itemExplanations.map((e) => [e.itemId, e])
  )

  const enriched = predictions.map((p) => {
    const expl = explMap.get(p.itemId)
    return {
      ...p,
      explanationText: expl?.explanationText ?? null,
      confidenceScore: expl?.confidenceScore ?? null,
    }
  })

  const highCount = enriched.filter((p) => p.riskLevel === "high").length
  const medCount = enriched.filter((p) => p.riskLevel === "medium").length
  const lowCount = enriched.filter((p) => p.riskLevel === "low").length

  return {
    predictionDate: input.asOfDate,
    highRiskCount: highCount,
    mediumRiskCount: medCount,
    lowRiskCount: lowCount,
    predictions: enriched,
    summaryText: explanations.summaryText,
    generatedAt: new Date().toISOString(),
  }
}

async function callClaudeForExplanations(
  items: InventoryPrediction[],
  asOfDate: string
): Promise<ExplanationResponse> {
  const client = new Anthropic()

  const userMessage = `
Prediction date: ${asOfDate}
Restaurant: Bistro Nova

Items requiring attention (high or medium risk only):
${JSON.stringify(
    items.map((p) => ({
      itemId: p.itemId,
      itemName: p.itemName,
      category: p.category,
      quantityOnHand: p.quantityOnHand,
      reorderLevel: p.reorderLevel,
      predictedUsage7d: p.predictedUsage7d,
      predictedUsage14d: p.predictedUsage14d,
      daysToStockout: p.daysToStockout,
      recommendedReorderQty: p.recommendedReorderQty,
      riskLevel: p.riskLevel,
      topDrivers: p.topDrivers,
    })),
    null,
    2
  )}

Respond with valid JSON matching this schema exactly:
{
  "summaryText": "<overall 1-2 sentence manager summary>",
  "itemExplanations": [
    {
      "itemId": "<string>",
      "explanationText": "<under 40 words, plain English, actionable>",
      "confidenceScore": <number 0.0–1.0>
    }
  ]
}`

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: ANTHROPIC_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  })

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")

  // Strip markdown code fences if present
  const json = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim()
  return JSON.parse(json) as ExplanationResponse
}

function buildFallbackSummary(predictions: InventoryPrediction[]): string {
  const high = predictions.filter((p) => p.riskLevel === "high")
  const medium = predictions.filter((p) => p.riskLevel === "medium")

  if (high.length === 0 && medium.length === 0) {
    return "All inventory levels are healthy. No immediate reorders required."
  }

  const parts: string[] = []
  if (high.length > 0) {
    parts.push(`${high.length} item${high.length > 1 ? "s" : ""} at high risk: ${high.map((p) => p.itemName).join(", ")}.`)
  }
  if (medium.length > 0) {
    parts.push(`${medium.length} item${medium.length > 1 ? "s" : ""} at medium risk: ${medium.map((p) => p.itemName).join(", ")}.`)
  }
  return parts.join(" ")
}
