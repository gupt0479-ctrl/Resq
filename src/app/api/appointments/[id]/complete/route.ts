import { type NextRequest } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { completeAppointment } from "@/lib/services/appointments"
import { CompleteAppointmentBodySchema } from "@/lib/schemas/appointment"
import { generateFollowUp } from "@/lib/ai/generate-followup"

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params

    let body: unknown = {}
    try { body = await request.json() } catch { /* empty body is fine */ }

    const parsed = CompleteAppointmentBodySchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 422 }
      )
    }

    const client = createServerSupabaseClient()
    const result = await completeAppointment(
      client, id, DEMO_ORG_ID, parsed.data.notes, parsed.data.lineItems
    )

    // Fetch customer for personalised follow-up
    const { data: customer } = await client
      .from("customers")
      .select("full_name, email")
      .eq("id", result.appointment.customer_id)
      .maybeSingle()

    const apptWithExtras = result.appointment as typeof result.appointment & {
      occasion?: string | null
    }

    // Generate AI follow-up message
    const followUpMessage = await generateFollowUp({
      id:          result.appointment.id,
      customer_id: result.appointment.customer_id,
      customer: customer
        ? { id: result.appointment.customer_id, name: customer.full_name, email: customer.email, visit_count: 1, created_at: "" }
        : undefined,
      party_size:     result.appointment.covers,
      starts_at:      result.appointment.starts_at,
      ends_at:        result.appointment.ends_at,
      status:         "completed",
      notes:          result.appointment.notes,
      occasion:       apptWithExtras.occasion ?? null,
      reminder_sent:  false,
      follow_up_sent: false,
      created_at:     new Date().toISOString(),
      updated_at:     new Date().toISOString(),
    })

    // Mark follow-up generated
    await client
      .from("appointments")
      .update({ follow_up_sent: true })
      .eq("id", id)

    return Response.json({
      data: {
        appointmentId:  result.appointment.id,
        invoiceId:      result.invoiceId,
        status:         result.appointment.status,
        followUpMessage,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    const status  = message.includes("not found") ? 404 : 400
    return Response.json({ error: message }, { status })
  }
}
