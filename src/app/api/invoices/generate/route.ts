import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { ensureInvoiceForCompletedAppointment } from "@/lib/services/invoices"
import { GenerateInvoiceFromAppointmentBodySchema } from "@/lib/schemas/invoice"

/**
 * POST /api/invoices/generate
 * Body: { appointmentId } — creates a ledger invoice from a completed appointment
 * using catalog pricing only (no arbitrary line items from the client).
 */
export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = GenerateInvoiceFromAppointmentBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.issues },
      { status: 422 }
    )
  }

  try {
    const client = createServerSupabaseClient()
    const result = await ensureInvoiceForCompletedAppointment(
      client,
      parsed.data.appointmentId,
      DEMO_ORG_ID
    )
    return NextResponse.json(
      {
        invoiceId: result.invoiceId,
        created:   result.created,
      },
      { status: result.created ? 201 : 200 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    const status = message.toLowerCase().includes("not found") ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
