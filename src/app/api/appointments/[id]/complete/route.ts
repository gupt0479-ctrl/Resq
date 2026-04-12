import { NextRequest, NextResponse } from "next/server"
import { completeReservation, markFollowUpSent, createFollowUpRecord } from "@/lib/services/reservation.service"
import { generateInvoice } from "@/lib/services/invoice.service"
import { generateFollowUp } from "@/lib/ai/generate-followup"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  const completedResult = await completeReservation(id)
  if (completedResult.error || !completedResult.data) {
    return NextResponse.json({ error: completedResult.error ?? "Failed to complete." }, { status: 500 })
  }

  const reservation = completedResult.data
  let invoice = null
  if (body.line_items?.length) {
    const invoiceResult = await generateInvoice({
      reservation_id: id,
      line_items: body.line_items,
      tax_rate: body.tax_rate,
      discount_amount: body.discount_amount,
    })
    invoice = invoiceResult.data ?? null
  }

  let followUpMessage = null
  try {
    followUpMessage = await generateFollowUp(reservation)
    if (reservation.customer_id) {
      await createFollowUpRecord(id, reservation.customer_id, followUpMessage)
    }
    await markFollowUpSent(id)
  } catch {
    // non-blocking
  }

  return NextResponse.json({ reservation, invoice, follow_up_message: followUpMessage })
}