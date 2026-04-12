import type { SupabaseClient } from "@supabase/supabase-js"
import { listAppointments, getAppointment } from "@/lib/services/appointments"
import type { AppointmentStatus } from "@/lib/constants/enums"
import type { AppointmentResponse } from "@/lib/schemas/appointment"

type AppointmentJoinRow = Record<string, unknown> & {
  id: string
  organization_id: string
  customer_id: string
  staff_id: string | null
  service_id: string
  covers: number
  starts_at: string
  ends_at: string
  status: AppointmentStatus
  booking_source?: string | null
  notes?: string | null
  created_at: string
  customers?: { full_name?: string | null; email?: string | null; phone?: string | null } | null
  staff?: { full_name?: string | null } | null
  services?: { name?: string | null; category?: string | null } | null
}

export async function listAppointmentsQuery(
  client: SupabaseClient,
  organizationId: string,
  opts: {
    status?: AppointmentStatus
    limit?: number
    offset?: number
  } = {}
): Promise<AppointmentResponse[]> {
  const rows = await listAppointments(client, organizationId, opts)
  return rows.map((row) => mapAppointmentRow(row as AppointmentJoinRow))
}

export async function getAppointmentDetailQuery(
  client: SupabaseClient,
  appointmentId: string,
  organizationId: string
) {
  const row = await getAppointment(client, appointmentId, organizationId)
  const mapped = mapAppointmentRow(row as AppointmentJoinRow)

  return {
    ...mapped,
    customerEmail: (row as AppointmentJoinRow).customers?.email ?? null,
    customerPhone: (row as AppointmentJoinRow).customers?.phone ?? null,
    serviceCategory: (row as AppointmentJoinRow).services?.category ?? null,
  }
}

function mapAppointmentRow(row: AppointmentJoinRow): AppointmentResponse {
  return {
    id: row.id,
    organizationId: row.organization_id,
    customerId: row.customer_id,
    customerName: row.customers?.full_name ?? "Unknown",
    staffId: row.staff_id,
    staffName: row.staff?.full_name ?? null,
    serviceId: row.service_id,
    serviceName: row.services?.name ?? "Unknown",
    covers: row.covers,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    bookingSource: row.booking_source ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
  }
}
