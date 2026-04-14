import { connection, NextResponse } from "next/server"
import { generatePredictions } from "@/lib/inventory/generate-predictions"
import { getInventoryItems, getMenuInventoryUsage, getReservations, getShipments } from "@/lib/supabase/queries"

export async function GET() {
  await connection()
  const asOfDate = new Date().toISOString().slice(0, 10)

  const [items, usages, reservations, shipments] = await Promise.all([
    getInventoryItems(),
    getMenuInventoryUsage(),
    getReservations(),
    getShipments(),
  ])

  const predictions = generatePredictions({
    items,
    usages,
    reservations,
    shipments,
    asOfDate,
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
    predictionDate: asOfDate,
    highRiskCount: high.length,
    mediumRiskCount: medium.length,
    lowRiskCount: low.length,
    topItems,
  })
}
