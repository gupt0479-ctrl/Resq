import { NextRequest, NextResponse } from "next/server"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { ensureInvoiceForCompletedAppointment, getInvoiceDetail } from "@/lib/services/invoices"

export async function POST(req: NextRequest) {
  const ctx = await getUserOrg()
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: {
    appointmentId?: string
    reservation_id?: string
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const appointmentId = body.appointmentId ?? body.reservation_id
  if (!appointmentId) {
    return NextResponse.json({ error: "appointmentId required." }, { status: 400 })
  }

  try {
    const { invoiceId, created } = await ensureInvoiceForCompletedAppointment(appointmentId, ctx.organizationId)
    const invoice = await getInvoiceDetail(invoiceId, ctx.organizationId)
    return NextResponse.json({ invoice, created }, { status: created ? 201 : 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate invoice"
    const status = message.includes("not found") ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
