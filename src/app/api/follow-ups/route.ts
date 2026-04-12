import { NextRequest, NextResponse } from "next/server"
import { getReservation, markFollowUpSent, createFollowUpRecord } from "@/lib/services/reservation.service"
import { generateFollowUp } from "@/lib/ai/generate-followup"

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.reservation_id) {
    return NextResponse.json({ error: "reservation_id is required." }, { status: 400 })
  }

  const result = await getReservation(body.reservation_id)
  if (result.error || !result.data) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 })
  }

  const message = await generateFollowUp(result.data)
  await createFollowUpRecord(body.reservation_id, result.data.customer_id, message)
  await markFollowUpSent(body.reservation_id)

  return NextResponse.json({ message, customer_name: result.data.customer?.name ?? "Guest" })
}