import { NextRequest, NextResponse } from "next/server"
import { generateInvoice } from "@/lib/services/invoice.service"

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.reservation_id || !body.line_items?.length) {
    return NextResponse.json({ error: "reservation_id and line_items required." }, { status: 400 })
  }
  const result = await generateInvoice(body)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ invoice: result.data }, { status: 201 })
}