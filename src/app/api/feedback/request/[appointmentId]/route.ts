import { NextResponse } from "next/server"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { getAppointment } from "@/lib/services/appointments"

/**
 * Acknowledges a post-visit feedback request for a reservation (advisory — no row until guest submits).
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ appointmentId: string }> }
) {
  const { appointmentId } = await ctx.params
  try {
    const ctxOrg = await getUserOrg()
    if (!ctxOrg) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await getAppointment(appointmentId, ctxOrg.organizationId)
    return NextResponse.json({
      data: {
        appointmentId,
        accepted: true,
        message:
          "Feedback request acknowledged. Guest submission should use POST /api/feedback/submit or the MCP feedback.received webhook.",
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    const status = message.toLowerCase().includes("not found") ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
