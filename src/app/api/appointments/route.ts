import { type NextRequest } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { listAppointmentsQuery } from "@/lib/queries/appointments"
import { createAppointment } from "@/lib/services/appointments"
import { APPOINTMENT_STATUS } from "@/lib/constants/enums"
import type { AppointmentStatus } from "@/lib/constants/enums"
import { CreateBookingBodySchema } from "@/lib/schemas/appointment"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const rawStatus = searchParams.get("status")
    const limit     = Number(searchParams.get("limit") ?? "50")
    const offset    = Number(searchParams.get("offset") ?? "0")

    const status: AppointmentStatus | undefined =
      rawStatus && APPOINTMENT_STATUS.includes(rawStatus as AppointmentStatus)
        ? (rawStatus as AppointmentStatus)
        : undefined

    const client = createServerSupabaseClient()
    const appointments = await listAppointmentsQuery(client, DEMO_ORG_ID, {
      status,
      limit,
      offset,
    })
    return Response.json({ data: appointments, count: appointments.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = CreateBookingBodySchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", details: parsed.error.issues }, { status: 422 })
    }

    const { startsAt, ...rest } = parsed.data
    const startsDate = new Date(startsAt)
    const endsDate   = new Date(startsDate.getTime() + 2 * 60 * 60 * 1000)

    const client = createServerSupabaseClient()
    const appointmentId = await createAppointment(client, DEMO_ORG_ID, {
      ...rest,
      startsAt,
      endsAt: endsDate.toISOString(),
    })

    return Response.json({ data: { appointmentId } }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return Response.json({ error: message }, { status: 500 })
  }
}
