import { NextRequest, NextResponse } from "next/server"
import { getShipmentById, cancelShipment } from "@/lib/supabase/queries"
import { supabase } from "@/lib/supabase/client"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const shipment = await getShipmentById(id)
  if (!shipment) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (shipment.status === "delivered") {
    return NextResponse.json({ error: "Cannot cancel a delivered shipment" }, { status: 422 })
  }

  const body = await req.json().catch(() => ({})) as { reason?: string }
  await cancelShipment(id)
  if (body.reason) {
    await supabase.from("shipments").update({ notes: body.reason }).eq("id", id)
  }

  const updated = await getShipmentById(id)
  return NextResponse.json(updated)
}

