import { type NextRequest } from "next/server"
import { db, DEMO_ORG_ID } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { eq } from "drizzle-orm"
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

    const appointments = await listAppointmentsQuery(DEMO_ORG_ID, {
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

    const { starts_at, ends_at, customer_name, customer_email, customer_phone, party_size, occasion, notes } = parsed.data
    const startsDate = new Date(starts_at)
    const endsDate = ends_at ? new Date(ends_at) : new Date(startsDate.getTime() + 2 * 60 * 60 * 1000)

    const appointmentId = await createAppointment(DEMO_ORG_ID, {
      customerName: customer_name,
      customerEmail: customer_email,
      customerPhone: customer_phone,
      covers: party_size,
      startsAt: starts_at,
      endsAt: endsDate.toISOString(),
      occasion,
      notes,
    })

    const [reservation] = await db
      .select({
        id:       schema.appointments.id,
        status:   schema.appointments.status,
        startsAt: schema.appointments.startsAt,
        endsAt:   schema.appointments.endsAt,
        covers:   schema.appointments.covers,
      })
      .from(schema.appointments)
      .where(eq(schema.appointments.id, appointmentId))
      .limit(1)

    return Response.json({ data: reservation || { id: appointmentId } }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return Response.json({ error: message }, { status: 500 })
  }
}
