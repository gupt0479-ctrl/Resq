import { listAppointments, getAppointment } from "@/lib/services/appointments"
import type { AppointmentStatus } from "@/lib/constants/enums"
import type { AppointmentResponse } from "@/lib/schemas/appointment"

type AppointmentJoinRow = Record<string, unknown> & {
  id: string
  organizationId: string
  customerId: string
  staffId: string | null
  serviceId: string
  covers: number
  startsAt: Date
  endsAt: Date
  status: AppointmentStatus
  bookingSource?: string | null
  notes?: string | null
  createdAt: Date
  occasion?: string | null
  followUpSent?: boolean
  customers?: { full_name?: string | null; email?: string | null; phone?: string | null } | null
  staff?: { full_name?: string | null } | null
  services?: { name?: string | null; category?: string | null } | null
}

export async function listAppointmentsQuery(
  organizationId: string,
  opts: {
    status?: AppointmentStatus
    limit?: number
    offset?: number
  } = {}
): Promise<AppointmentResponse[]> {
  const rows = await listAppointments(organizationId, opts)
  return rows.map((row) => mapAppointmentRow(row as unknown as AppointmentJoinRow))
}

export async function getAppointmentDetailQuery(
  appointmentId: string,
  organizationId: string
) {
  const row = await getAppointment(appointmentId, organizationId)
  const mapped = mapAppointmentRow(row as unknown as AppointmentJoinRow)

  return {
    ...mapped,
    customerEmail: (row as unknown as AppointmentJoinRow).customers?.email ?? null,
    customerPhone: (row as unknown as AppointmentJoinRow).customers?.phone ?? null,
    serviceCategory: (row as unknown as AppointmentJoinRow).services?.category ?? null,
  }
}

function mapAppointmentRow(row: AppointmentJoinRow): AppointmentResponse {
  return {
    id: row.id,
    organizationId: row.organizationId,
    customerId: row.customerId,
    customerName: row.customers?.full_name ?? "Unknown",
    staffId: row.staffId,
    staffName: row.staff?.full_name ?? null,
    serviceId: row.serviceId,
    serviceName: row.services?.name ?? "Unknown",
    covers: row.covers,
    startsAt: row.startsAt instanceof Date ? row.startsAt.toISOString() : String(row.startsAt),
    endsAt: row.endsAt instanceof Date ? row.endsAt.toISOString() : String(row.endsAt),
    status: row.status,
    bookingSource: row.bookingSource ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    occasion: row.occasion ?? null,
    followUpSent: row.followUpSent ?? false,
  }
}
