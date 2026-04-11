import { NextResponse } from "next/server"
import { generatePredictions } from "@/lib/inventory/generate-predictions"
import { inventoryItems } from "@/lib/data/inventory"
import { menuInventoryUsage } from "@/lib/data/menu-inventory-usage"
import { reservations } from "@/lib/data/reservations"
import { shipments } from "@/lib/data/shipments"

const AS_OF_DATE = "2026-04-11"

export async function GET() {
  const predictions = generatePredictions({
    items: inventoryItems,
    usages: menuInventoryUsage,
    reservations,
    shipments,
    asOfDate: AS_OF_DATE,
  })

  const high = predictions.filter((p) => p.riskLevel === "high")
  const medium = predictions.filter((p) => p.riskLevel === "medium")
  const low = predictions.filter((p) => p.riskLevel === "low")

  const topItems = predictions
    .sort((a, b) => a.daysToStockout - b.daysToStockout)
    .slice(0, 5)
    .map((p) => ({
      itemId: p.itemId,
      itemName: p.itemName,
      riskLevel: p.riskLevel,
      daysToStockout: p.daysToStockout,
      recommendedReorderQty: p.recommendedReorderQty,
    }))

  return NextResponse.json({
    predictionDate: AS_OF_DATE,
    highRiskCount: high.length,
    mediumRiskCount: medium.length,
    lowRiskCount: low.length,
    topItems,
  })
}
