import { NextRequest, NextResponse } from "next/server"
import { getShipments } from "@/lib/supabase/queries"
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
