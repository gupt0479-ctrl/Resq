import { type NextRequest } from "next/server"
import { db, DEMO_ORG_ID } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { generateFollowUp } from "@/lib/ai/generate-followup"

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params

    // Fetch appointment with customer join
    const rows = await db
      .select()
      .from(schema.appointments)
      .leftJoin(schema.customers, eq(schema.appointments.customerId, schema.customers.id))
      .where(
        and(
          eq(schema.appointments.id, id),
          eq(schema.appointments.organizationId, DEMO_ORG_ID),
        ),
      )
      .limit(1)

    const row = rows[0]
    if (!row) {
      return Response.json({ error: "Appointment not found" }, { status: 404 })
    }

    const appt = row.appointments
    const customer = row.customers

    const followUpMessage = await generateFollowUp({
      id:          appt.id,
      customer_id: appt.customerId,
      customer: customer
        ? { id: appt.customerId, name: customer.fullName, email: customer.email ?? "", visit_count: 1, created_at: "" }
        : undefined,
      party_size:     appt.covers,
      starts_at:      appt.startsAt.toISOString(),
      ends_at:        appt.endsAt.toISOString(),
      status:         "completed",
      notes:          appt.notes ?? null,
      occasion:       appt.occasion ?? null,
      reminder_sent:  false,
      follow_up_sent: false,
      created_at:     appt.createdAt.toISOString(),
      updated_at:     new Date().toISOString(),
    })

    // Mark follow-up sent
    await db
      .update(schema.appointments)
      .set({ followUpSent: true })
      .where(eq(schema.appointments.id, id))

    return Response.json({ data: { followUpMessage } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return Response.json({ error: message }, { status: 500 })
  }
}
