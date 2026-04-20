import { type NextRequest } from "next/server"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { cancelAppointment } from "@/lib/services/appointments"

export async function PATCH(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const ctxOrg = await getUserOrg()
    if (!ctxOrg) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await ctx.params
    await cancelAppointment(id, ctxOrg.organizationId)
    return Response.json({ data: { status: "cancelled" } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return Response.json({ error: message }, { status: 400 })
  }
}
