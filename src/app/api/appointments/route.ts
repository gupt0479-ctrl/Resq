import { NextRequest, NextResponse } from "next/server"
import { bookReservation, getReservations } from "@/lib/services/reservation.service"

export async function GET() {
  const result = await getReservations()
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ reservations: result.data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.customer_email || !body.starts_at || !body.ends_at) {
    return NextResponse.json({ error: "customer_email, starts_at, ends_at required." }, { status: 400 })
  }
  const result = await bookReservation(body)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 409 })
  return NextResponse.json({ reservation: result.data }, { status: 201 })
}