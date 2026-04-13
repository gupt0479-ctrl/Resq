import { NextRequest, NextResponse } from "next/server"
import { getShipmentById } from "@/lib/supabase/queries"

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

  await req.json().catch(() => ({}))

  if (shipment.ledgerBacked) {
    return NextResponse.json(
      {
        error:
          "Procurement rows are read-only. They are backed by finance_transactions (ledger), not the legacy shipments tables.",
      },
      { status: 409 }
    )
  }

  return NextResponse.json(
    { error: "Shipment updates are not available without legacy shipment tables." },
    { status: 501 }
  )
}

