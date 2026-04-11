import { NextRequest, NextResponse } from "next/server"
import { shipments } from "@/lib/data/shipments"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const shipment = shipments.find((s) => s.id === id)
  if (!shipment) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (shipment.status === "delivered") {
    return NextResponse.json({ error: "Cannot cancel a delivered shipment" }, { status: 422 })
  }

  const body = await req.json().catch(() => ({})) as { reason?: string }
  shipment.status = "cancelled"
  if (body.reason) shipment.notes = body.reason

  return NextResponse.json(shipment)
}
