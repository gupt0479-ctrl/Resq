import { NextRequest, NextResponse } from "next/server"
import { DEMO_ORG_ID } from "@/lib/db"
import { ensureInvoiceForCompletedAppointment, getInvoiceDetail } from "@/lib/services/invoices"

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    appointmentId?: string
    reservation_id?: string
  }

  const appointmentId = body.appointmentId ?? body.reservation_id
  if (!appointmentId) {
    return NextResponse.json({ error: "appointmentId required." }, { status: 400 })
  }

  try {
    const { invoiceId, created } = await ensureInvoiceForCompletedAppointment(appointmentId, DEMO_ORG_ID)
    const invoice = await getInvoiceDetail(invoiceId, DEMO_ORG_ID)
    return NextResponse.json({ invoice, created }, { status: created ? 201 : 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate invoice"
    const status = message.includes("not found") ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
