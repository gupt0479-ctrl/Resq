import { type NextRequest } from "next/server"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { completeAppointment } from "@/lib/services/appointments"
import { CompleteAppointmentBodySchema } from "@/lib/schemas/appointment"
import { generateFollowUp } from "@/lib/ai/generate-followup"

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const ctxOrg = await getUserOrg()
    if (!ctxOrg) return Response.json({ error: "Unauthorized" }, { status: 401 })

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

    const result = await completeAppointment(id, ctxOrg.organizationId, parsed.data.notes, parsed.data.lineItems)

    // Fetch customer for personalised follow-up
    const [customer] = await db
      .select({ fullName: schema.customers.fullName, email: schema.customers.email })
      .from(schema.customers)
      .where(eq(schema.customers.id, result.appointment.customer_id))
      .limit(1)

    const apptWithExtras = result.appointment as typeof result.appointment & {
      occasion?: string | null
    }

    // Generate AI follow-up message
    const followUpMessage = await generateFollowUp({
      id:          result.appointment.id,
      customer_id: result.appointment.customer_id,
      customer: customer
        ? { id: result.appointment.customer_id, name: customer.fullName, email: customer.email ?? "", visit_count: 1, created_at: "" }
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
    await db
      .update(schema.appointments)
      .set({ followUpSent: true })
      .where(eq(schema.appointments.id, id))

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
