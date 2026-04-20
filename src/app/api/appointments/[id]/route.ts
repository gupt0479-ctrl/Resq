import { type NextRequest } from "next/server"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { getAppointmentDetailQuery } from "@/lib/queries/appointments"

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const ctxOrg = await getUserOrg()
    if (!ctxOrg) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await ctx.params
    const data    = await getAppointmentDetailQuery(id, ctxOrg.organizationId)

    return Response.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    const status  = message.includes("not found") ? 404 : 500
    return Response.json({ error: message }, { status })
  }
}
