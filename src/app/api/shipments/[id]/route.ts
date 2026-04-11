import { NextRequest, NextResponse } from "next/server"
import { shipments } from "@/lib/data/shipments"
import type { ShipmentStatus } from "@/lib/types"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const shipment = shipments.find((s) => s.id === id)
  if (!shipment) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(shipment)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const shipment = shipments.find((s) => s.id === id)
  if (!shipment) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json() as {
    status?: ShipmentStatus
    notes?: string
    lineItems?: { id: string; quantityOrdered: number }[]
  }

  if (body.status) shipment.status = body.status
  if (body.notes !== undefined) shipment.notes = body.notes
  if (body.lineItems) {
    for (const patch of body.lineItems) {
      const li = shipment.lineItems.find((l) => l.id === patch.id)
      if (li) {
        li.quantityOrdered = patch.quantityOrdered
        li.totalCost = Math.round(li.unitCost * patch.quantityOrdered * 100) / 100
      }
    }
    shipment.totalCost = Math.round(
      shipment.lineItems.reduce((sum, l) => sum + l.totalCost, 0) * 100
    ) / 100
  }

  return NextResponse.json(shipment)
}
