import { NextRequest, NextResponse } from "next/server"
import { runInventoryAgent } from "@/lib/inventory/inventory-agent"
import { getInventoryItems, getShipments } from "@/lib/supabase/queries"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const asOfDate: string =
    typeof body?.asOfDate === "string" ? body.asOfDate : "2026-04-11"

  try {
    const [inventoryItems, shipments] = await Promise.all([
      getInventoryItems(),
      getShipments(),
    ])
    const report = await runInventoryAgent(shipments, inventoryItems, asOfDate)
    return NextResponse.json({ ok: true, report })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
