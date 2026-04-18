import { NextRequest, NextResponse } from "next/server"
import { generateWithExplanations } from "@/lib/inventory/generate-predictions"
import { getInventoryItems, getMenuInventoryUsage, getReservations, getShipments } from "@/lib/supabase/queries"
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

  const today = new Date().toISOString().slice(0, 10)
  const { predictionDate = today, includeExplanation = true } = parsed.data

  const [items, usages, reservations, shipments] = await Promise.all([
    getInventoryItems(),
    getMenuInventoryUsage(),
    getReservations(),
    getShipments(),
  ])

  if (!includeExplanation) {
    const predictions = (await import("@/lib/inventory/generate-predictions")).generatePredictions({
      items,
      usages,
      reservations,
      shipments,
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
    items,
    usages,
    reservations,
    shipments,
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
