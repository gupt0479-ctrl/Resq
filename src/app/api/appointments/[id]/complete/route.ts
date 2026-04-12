import { type NextRequest } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { completeAppointment } from "@/lib/services/appointments"
import { CompleteAppointmentBodySchema } from "@/lib/schemas/appointment"

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params

    let body: unknown = {}
    try {
      body = await request.json()
    } catch {
      // empty body is fine
    }

    const parsed = CompleteAppointmentBodySchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 422 }
      )
    }

    const client = createServerSupabaseClient()
    const result = await completeAppointment(
      client,
      id,
      DEMO_ORG_ID,
      parsed.data.notes
    )

    return Response.json(
      {
        data: {
          appointmentId: result.appointment.id,
          invoiceId:     result.invoiceId,
          status:        result.appointment.status,
        },
      },
      { status: 200 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    const status  = message.includes("not found") ? 404 : 400
    return Response.json({ error: message }, { status })
  }
}
