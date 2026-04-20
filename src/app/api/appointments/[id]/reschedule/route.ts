import { type NextRequest } from "next/server"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { rescheduleAppointment } from "@/lib/services/appointments"
import { RescheduleBodySchema } from "@/lib/schemas/appointment"

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const ctxOrg = await getUserOrg()
    if (!ctxOrg) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await ctx.params
    const body = await request.json()
    const parsed = RescheduleBodySchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", details: parsed.error.issues }, { status: 422 })
    }
    await rescheduleAppointment(id, ctxOrg.organizationId, parsed.data.startsAt, parsed.data.endsAt)
    return Response.json({ data: { status: "rescheduled", startsAt: parsed.data.startsAt, endsAt: parsed.data.endsAt } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return Response.json({ error: message }, { status: 400 })
  }
}
