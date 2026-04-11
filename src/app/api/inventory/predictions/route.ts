import { NextRequest, NextResponse } from "next/server"
import { generatePredictions } from "@/lib/inventory/generate-predictions"
import { inventoryItems } from "@/lib/data/inventory"
import { menuInventoryUsage } from "@/lib/data/menu-inventory-usage"
import { reservations } from "@/lib/data/reservations"
import { shipments } from "@/lib/data/shipments"
import { z } from "zod"

const querySchema = z.object({
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  asOfDate: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const raw = Object.fromEntries(req.nextUrl.searchParams)
  const parsed = querySchema.safeParse(raw)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { riskLevel, limit = 50, asOfDate = "2026-04-11" } = parsed.data

  let predictions = generatePredictions({
    items: inventoryItems,
    usages: menuInventoryUsage,
    reservations,
    shipments,
    asOfDate,
  })

  if (riskLevel) {
    predictions = predictions.filter((p) => p.riskLevel === riskLevel)
  }

  predictions = predictions
    .sort((a, b) => a.daysToStockout - b.daysToStockout)
    .slice(0, limit)

  return NextResponse.json({ predictionDate: asOfDate, items: predictions })
}
