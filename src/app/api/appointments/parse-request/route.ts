import { NextRequest, NextResponse } from "next/server"
import { parseReservationRequest } from "@/lib/ai/parse-reservation"

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.natural_language) {
    return NextResponse.json({ error: "natural_language is required." }, { status: 400 })
  }
  const result = await parseReservationRequest(body.natural_language, body.existing_reservation_id)
  return NextResponse.json({ parsed: result })
}