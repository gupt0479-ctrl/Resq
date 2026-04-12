import { NextRequest, NextResponse } from "next/server"
import { getShipmentById } from "@/lib/supabase/queries"
import { supabase } from "@/lib/supabase/client"
import type { ShipmentStatus } from "@/lib/types"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const shipment = await getShipmentById(id)
  if (!shipment) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(shipment)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const shipment = await getShipmentById(id)
  if (!shipment) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json() as {
    status?: ShipmentStatus
    notes?: string
    lineItems?: { id: string; quantityOrdered: number }[]
  }

  const shipmentUpdates: Record<string, unknown> = {}
  if (body.status) shipmentUpdates.status = body.status
  if (body.notes !== undefined) shipmentUpdates.notes = body.notes

  if (Object.keys(shipmentUpdates).length > 0) {
    await supabase.from("shipments").update(shipmentUpdates).eq("id", id)
  }

  if (body.lineItems) {
    for (const patch of body.lineItems) {
      const li = shipment.lineItems.find((l) => l.id === patch.id)
      if (li) {
        const newTotal = Math.round(li.unitCost * patch.quantityOrdered * 100) / 100
        await supabase
          .from("shipment_line_items")
          .update({ quantity_ordered: patch.quantityOrdered, total_cost: newTotal })
          .eq("id", patch.id)
      }
    }
    // recalculate shipment total
    const { data: lines } = await supabase
      .from("shipment_line_items")
      .select("total_cost")
      .eq("shipment_id", id)
    const newTotal = Math.round((lines ?? []).reduce((s, l) => s + Number(l.total_cost), 0) * 100) / 100
    await supabase.from("shipments").update({ total_cost: newTotal }).eq("id", id)
  }

  const updated = await getShipmentById(id)
  return NextResponse.json(updated)
}

