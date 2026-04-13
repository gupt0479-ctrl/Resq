import { type NextRequest } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { listAppointmentsQuery } from "@/lib/queries/appointments"
import { APPOINTMENT_STATUS } from "@/lib/constants/enums"
import type { AppointmentStatus } from "@/lib/constants/enums"

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
