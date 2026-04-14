import { NextRequest, NextResponse } from "next/server"
import { getShipments, createShipment } from "@/lib/supabase/queries"
import type { ShipmentStatus } from "@/lib/types"

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") as ShipmentStatus | null
  const date   = req.nextUrl.searchParams.get("date")

  let result = await getShipments()
  if (status) result = result.filter((s) => s.status === status)
  if (date)   result = result.filter((s) => s.expectedDeliveryDate === date)

  result.sort((a, b) => a.expectedDeliveryDate.localeCompare(b.expectedDeliveryDate))
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const { vendorName, status, expectedDeliveryDate, lineItems } = body
    if (!vendorName || typeof vendorName !== "string" || !vendorName.trim())
      return NextResponse.json({ error: "vendorName is required" }, { status: 400 })
    if (!expectedDeliveryDate || typeof expectedDeliveryDate !== "string")
      return NextResponse.json({ error: "expectedDeliveryDate is required" }, { status: 400 })
    if (!Array.isArray(lineItems) || lineItems.length === 0)
      return NextResponse.json({ error: "At least one line item is required" }, { status: 400 })

    const validStatuses: ShipmentStatus[] = ["pending", "confirmed", "in_transit", "delivered", "cancelled"]
    const resolvedStatus: ShipmentStatus = validStatuses.includes(status) ? status : "pending"

    const shipment = await createShipment({
      vendorName: vendorName.trim(),
      status: resolvedStatus,
      expectedDeliveryDate,
      actualDeliveryDate: body.actualDeliveryDate ?? null,
      orderedAt: body.orderedAt ?? undefined,
      trackingNumber: body.trackingNumber ?? null,
      trackingUrl: body.trackingUrl ?? null,
      notes: body.notes ?? null,
      lineItems: lineItems.map((li: { itemName: string; quantityOrdered: number; unitCost: number }) => ({
        itemName: String(li.itemName),
        quantityOrdered: Number(li.quantityOrdered),
        unitCost: Number(li.unitCost),
      })),
    })

    return NextResponse.json(shipment, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
