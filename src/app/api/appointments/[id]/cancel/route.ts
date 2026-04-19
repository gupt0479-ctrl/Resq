import { type NextRequest } from "next/server"
import { DEMO_ORG_ID } from "@/lib/db"
import { cancelAppointment } from "@/lib/services/appointments"

export async function PATCH(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    await cancelAppointment(id, DEMO_ORG_ID)
    return Response.json({ data: { status: "cancelled" } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return Response.json({ error: message }, { status: 400 })
  }
}
