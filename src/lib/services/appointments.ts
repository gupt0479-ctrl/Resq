import type { SupabaseClient } from "@supabase/supabase-js"
import { canCompleteAppointment } from "@/lib/domain/status-guards"
import { generateInvoiceFromAppointment } from "@/lib/services/invoices"
import { DOMAIN_EVENT } from "@/lib/constants/enums"
import type { AppointmentStatus } from "@/lib/constants/enums"

// ─── Types for internal service use ──────────────────────────────────────

interface AppointmentRow {
  id:              string
  organization_id: string
  customer_id:     string
  staff_id:        string | null
  service_id:      string
  covers:          number
  starts_at:       string
  ends_at:         string
  status:          AppointmentStatus
  notes:           string | null
}

// ─── Complete appointment ─────────────────────────────────────────────────

export interface CompleteAppointmentResult {
  appointment: AppointmentRow
  invoiceId:   string
}

/**
 * Marks a reservation as completed, emits an audit event, and
 * deterministically generates an invoice from the service catalog.
 * All mutations run within a single Supabase round-trip sequence.
 */
export async function completeAppointment(
  client: SupabaseClient,
  appointmentId: string,
  organizationId: string,
  notes?: string
): Promise<CompleteAppointmentResult> {
  // 1. Fetch the appointment
  const { data: appt, error: fetchErr } = await client
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .eq("organization_id", organizationId)
    .single()

  if (fetchErr || !appt) {
    throw new Error(fetchErr?.message ?? "Appointment not found")
  }

  if (!canCompleteAppointment(appt.status as AppointmentStatus)) {
    throw new Error(
      `Cannot complete appointment with status '${appt.status}'. ` +
        "Only scheduled, confirmed, or in_progress reservations can be completed."
    )
  }

  const fromStatus = appt.status as AppointmentStatus

  // 2. Mark appointment as completed
  const now = new Date().toISOString()
  const { error: updateErr } = await client
    .from("appointments")
    .update({ status: "completed", updated_at: now })
    .eq("id", appointmentId)
    .eq("organization_id", organizationId)

  if (updateErr) {
    throw new Error(`Failed to complete appointment: ${updateErr.message}`)
  }

  // 3. Insert audit event
  await client.from("appointment_events").insert({
    appointment_id:  appointmentId,
    organization_id: organizationId,
    event_type:      DOMAIN_EVENT.RESERVATION_COMPLETED,
    from_status:     fromStatus,
    to_status:       "completed",
    notes:           notes ?? null,
    metadata:        { source: "api" },
  })

  // 4. Generate invoice deterministically from the service catalog
  const invoiceId = await generateInvoiceFromAppointment(client, {
    ...appt,
    status: "completed",
  })

  return { appointment: { ...appt, status: "completed" }, invoiceId }
}

// ─── List appointments ────────────────────────────────────────────────────

export async function listAppointments(
  client: SupabaseClient,
  organizationId: string,
  opts: {
    status?: AppointmentStatus
    limit?: number
    offset?: number
    orderBy?: "starts_at" | "created_at"
    orderDir?: "asc" | "desc"
  } = {}
) {
  let query = client
    .from("appointments")
    .select(`
      *,
      customers ( id, full_name, email ),
      staff     ( id, full_name, role ),
      services  ( id, name, price_per_person )
    `)
    .eq("organization_id", organizationId)

  if (opts.status) {
    query = query.eq("status", opts.status)
  }

  query = query.order(opts.orderBy ?? "starts_at", {
    ascending: opts.orderDir !== "desc",
  })

  if (opts.limit) {
    query = query.limit(opts.limit)
  }
  if (opts.offset) {
    query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

// ─── Get single appointment ───────────────────────────────────────────────

export async function getAppointment(
  client: SupabaseClient,
  appointmentId: string,
  organizationId: string
) {
  const { data, error } = await client
    .from("appointments")
    .select(`
      *,
      customers ( id, full_name, email, phone ),
      staff     ( id, full_name, role ),
      services  ( id, name, description, price_per_person, category )
    `)
    .eq("id", appointmentId)
    .eq("organization_id", organizationId)
    .single()

  if (error) throw new Error(error.message)
  return data
}
