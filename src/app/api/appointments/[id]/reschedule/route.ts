import { type NextRequest } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { rescheduleAppointment } from "@/lib/services/appointments"
import { RescheduleBodySchema } from "@/lib/schemas/appointment"

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    const body = await request.json()
    const parsed = RescheduleBodySchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", details: parsed.error.issues }, { status: 422 })
    }
    const client = createServerSupabaseClient()
    await rescheduleAppointment(client, id, DEMO_ORG_ID, parsed.data.startsAt, parsed.data.endsAt)
    return Response.json({ data: { status: "rescheduled", startsAt: parsed.data.startsAt, endsAt: parsed.data.endsAt } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return Response.json({ error: message }, { status: 400 })
  }
}
