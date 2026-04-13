import { NextRequest, NextResponse } from "next/server"
import { getShipmentById } from "@/lib/supabase/queries"

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

  await req.json().catch(() => ({}))

  if (shipment.ledgerBacked) {
    return NextResponse.json(
      { error: "Ledger-backed procurement rows cannot be cancelled from this API." },
      { status: 409 }
    )
  }

  return NextResponse.json(
    { error: "Shipment cancel is not available without legacy shipment tables." },
    { status: 501 }
  )
}

