import { NextRequest, NextResponse } from "next/server"
import { generateWithExplanations } from "@/lib/inventory/generate-predictions"
import { inventoryItems } from "@/lib/data/inventory"
import { menuInventoryUsage } from "@/lib/data/menu-inventory-usage"
import { reservations } from "@/lib/data/reservations"
import { z } from "zod"

const bodySchema = z.object({
  predictionDate: z.string().optional(),
  includeExplanation: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { predictionDate = "2026-04-11", includeExplanation = true } = parsed.data

  if (!includeExplanation) {
    const predictions = (await import("@/lib/inventory/generate-predictions")).generatePredictions({
      items: inventoryItems,
      usages: menuInventoryUsage,
      reservations,
      asOfDate: predictionDate,
    })
    return NextResponse.json({
      ok: true,
      predictionDate,
      itemsProcessed: predictions.length,
      fallbackCount: 0,
    })
  }

  const report = await generateWithExplanations({
    items: inventoryItems,
    usages: menuInventoryUsage,
    reservations,
    asOfDate: predictionDate,
  })

  return NextResponse.json({
    ok: true,
    predictionDate,
    itemsProcessed: report.predictions.length,
    fallbackCount: 0,
    report,
  })
}
