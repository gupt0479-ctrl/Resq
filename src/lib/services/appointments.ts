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

// ─── Cancel appointment ───────────────────────────────────────────────────

export async function cancelAppointment(
  client: SupabaseClient,
  appointmentId: string,
  organizationId: string
): Promise<void> {
  const { error } = await client
    .from("appointments")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", appointmentId)
    .eq("organization_id", organizationId)
    .not("status", "in", '("completed","cancelled")')
  if (error) throw new Error(error.message)
}

// ─── Reschedule appointment ───────────────────────────────────────────────

export async function rescheduleAppointment(
  client: SupabaseClient,
  appointmentId: string,
  organizationId: string,
  startsAt: string,
  endsAt: string
): Promise<void> {
  const { error } = await client
    .from("appointments")
    .update({ status: "rescheduled", starts_at: startsAt, ends_at: endsAt, updated_at: new Date().toISOString() })
    .eq("id", appointmentId)
    .eq("organization_id", organizationId)
  if (error) throw new Error(error.message)
}

// ─── Create appointment ───────────────────────────────────────────────────

export async function createAppointment(
  client: SupabaseClient,
  organizationId: string,
  opts: {
    customerName:  string
    customerEmail: string
    customerPhone?: string
    covers:        number
    startsAt:      string
    endsAt:        string
    occasion?:     string
    notes?:        string
  }
): Promise<string> {
  // 1. Upsert customer by email
  const { data: existing } = await client
    .from("customers")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("email", opts.customerEmail)
    .maybeSingle()

  let customerId: string
  if (existing) {
    customerId = existing.id as string
  } else {
    const { data: created, error: custErr } = await client
      .from("customers")
      .insert({
        organization_id: organizationId,
        full_name: opts.customerName,
        email: opts.customerEmail,
        phone: opts.customerPhone ?? null,
      })
      .select("id")
      .single()
    if (custErr || !created) throw new Error(custErr?.message ?? "Failed to create customer")
    customerId = created.id as string
  }

  // 2. Get first active service
  const { data: service } = await client
    .from("services")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("name")
    .limit(1)
    .maybeSingle()

  if (!service) throw new Error("No active services found for this organisation")

  // 3. Create appointment
  const { data: appt, error: apptErr } = await client
    .from("appointments")
    .insert({
      organization_id: organizationId,
      customer_id:     customerId,
      service_id:      service.id,
      covers:          opts.covers,
      starts_at:       opts.startsAt,
      ends_at:         opts.endsAt,
      status:          "confirmed",
      booking_source:  "manual",
      occasion:        opts.occasion ?? null,
      notes:           opts.notes ?? null,
    })
    .select("id")
    .single()

  if (apptErr || !appt) throw new Error(apptErr?.message ?? "Failed to create appointment")
  return appt.id as string
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
