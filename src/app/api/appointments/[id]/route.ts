import { NextRequest, NextResponse } from "next/server"
import { getReservation, rescheduleReservation, cancelReservation } from "@/lib/services/reservation.service"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await getReservation(id)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 404 })
  return NextResponse.json({ reservation: result.data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  if (!body.starts_at || !body.ends_at) {
    return NextResponse.json({ error: "starts_at and ends_at required." }, { status: 400 })
  }
  const result = await rescheduleReservation(id, body)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 409 })
  return NextResponse.json({ reservation: result.data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await cancelReservation(id)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ reservation: result.data })
}