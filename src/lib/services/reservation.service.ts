import "server-only"
import type {
  BookReservationRequest,
  Customer,
  FollowUp,
  Reservation,
  RescheduleReservationRequest,
  ServiceResult,
} from "@/lib/types"
import { createServerSupabaseClient } from "@/lib/db/supabase-server"

function admin() {
  return createServerSupabaseClient()
}

function isValidTimeRange(startsAt: string, endsAt: string): boolean {
  return new Date(startsAt).getTime() < new Date(endsAt).getTime()
}

export async function checkConflict(
  starts_at: string,
  ends_at: string,
  exclude_id?: string
): Promise<ServiceResult<Reservation[]>> {
  if (!isValidTimeRange(starts_at, ends_at)) {
    return { error: "End time must be after start time." }
  }

  let query = admin()
    .from("reservations")
    .select("*, customer:customers(*)")
    .in("status", ["confirmed", "completed"])
    .lt("starts_at", ends_at)
    .gt("ends_at", starts_at)

  if (exclude_id) query = query.neq("id", exclude_id)

  const { data, error } = await query
  if (error) return { error: error.message }
  return { data: (data ?? []) as Reservation[] }
}

async function findOrCreateCustomer(
  req: BookReservationRequest
): Promise<ServiceResult<Customer>> {
  const { data: existing } = await admin()
    .from("customers")
    .select("*")
    .eq("email", req.customer_email)
    .maybeSingle()

  if (existing) return { data: existing as Customer }

  const { data, error } = await admin()
    .from("customers")
    .insert({
      name: req.customer_name,
      email: req.customer_email,
      phone: req.customer_phone ?? null,
    })
    .select("*")
    .single()

  if (error) return { error: error.message }
  return { data: data as Customer }
}

export async function bookReservation(
  req: BookReservationRequest
): Promise<ServiceResult<Reservation>> {
  if (!isValidTimeRange(req.starts_at, req.ends_at)) {
    return { error: "End time must be after start time." }
  }

  const conflict = await checkConflict(req.starts_at, req.ends_at)
  if (conflict.error) return { error: conflict.error }
  if ((conflict.data?.length ?? 0) > 0) {
    return { error: "This time slot overlaps with an existing reservation." }
  }

  const customerResult = await findOrCreateCustomer(req)
  if (customerResult.error || !customerResult.data) {
    return { error: customerResult.error ?? "Could not create customer." }
  }

  const { data, error } = await admin()
    .from("reservations")
    .insert({
      customer_id: customerResult.data.id,
      party_size: req.party_size ?? 2,
      starts_at: req.starts_at,
      ends_at: req.ends_at,
      notes: req.notes ?? null,
      occasion: req.occasion ?? null,
      status: "confirmed",
      reminder_sent: false,
      follow_up_sent: false,
    })
    .select("*, customer:customers(*)")
    .single()

  if (error) return { error: error.message }
  return { data: data as Reservation }
}

export async function getReservations(): Promise<ServiceResult<Reservation[]>> {
  const { data, error } = await admin()
    .from("reservations")
    .select("*, customer:customers(*)")
    .order("starts_at", { ascending: true })

  if (error) return { error: error.message }
  return { data: (data ?? []) as Reservation[] }
}

export async function getReservation(id: string): Promise<ServiceResult<Reservation>> {
  const { data, error } = await admin()
    .from("reservations")
    .select("*, customer:customers(*)")
    .eq("id", id)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: "Reservation not found." }
  return { data: data as Reservation }
}

export async function rescheduleReservation(
  id: string,
  req: RescheduleReservationRequest
): Promise<ServiceResult<Reservation>> {
  const existing = await getReservation(id)
  if (existing.error || !existing.data) return { error: existing.error ?? "Not found." }
  if (existing.data.status === "cancelled") {
    return { error: "Cancelled reservations cannot be rescheduled." }
  }

  const conflict = await checkConflict(req.starts_at, req.ends_at, id)
  if (conflict.error) return { error: conflict.error }
  if ((conflict.data?.length ?? 0) > 0) {
    return { error: "This time slot overlaps with an existing reservation." }
  }

  const { data, error } = await admin()
    .from("reservations")
    .update({
      starts_at: req.starts_at,
      ends_at: req.ends_at,
      notes: req.notes ?? existing.data.notes,
      occasion: req.occasion ?? existing.data.occasion,
      party_size: req.party_size ?? existing.data.party_size,
    })
    .eq("id", id)
    .select("*, customer:customers(*)")
    .single()

  if (error) return { error: error.message }
  return { data: data as Reservation }
}

export async function cancelReservation(id: string): Promise<ServiceResult<Reservation>> {
  const { data, error } = await admin()
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("id", id)
    .select("*, customer:customers(*)")
    .single()

  if (error) return { error: error.message }
  return { data: data as Reservation }
}

export async function completeReservation(id: string): Promise<ServiceResult<Reservation>> {
  const existing = await getReservation(id)
  if (existing.error || !existing.data) return { error: existing.error ?? "Not found." }
  if (existing.data.status === "completed") return { data: existing.data }
  if (existing.data.status === "cancelled") {
    return { error: "Cancelled reservations cannot be completed." }
  }

  const { data, error } = await admin()
    .from("reservations")
    .update({ status: "completed" })
    .eq("id", id)
    .select("*, customer:customers(*)")
    .single()

  if (error) return { error: error.message }

  const visits = existing.data.customer?.visit_count ?? 0
  await admin()
    .from("customers")
    .update({ visit_count: visits + 1 })
    .eq("id", existing.data.customer_id)

  return { data: data as Reservation }
}

export async function markReminderSent(id: string): Promise<void> {
  await admin()
    .from("reservations")
    .update({ reminder_sent: true })
    .eq("id", id)
}

export async function markFollowUpSent(id: string): Promise<void> {
  await admin()
    .from("reservations")
    .update({ follow_up_sent: true })
    .eq("id", id)
}

export async function createFollowUpRecord(
  reservationId: string,
  customerId: string,
  message: string
): Promise<ServiceResult<FollowUp>> {
  const { data, error } = await admin()
    .from("follow_ups")
    .insert({
      reservation_id: reservationId,
      customer_id: customerId,
      message,
      sent_at: new Date().toISOString(),
    })
    .select("*")
    .single()

  if (error) return { error: error.message }
  return { data: data as FollowUp }
}

export async function getReservationsNeedingReminder(): Promise<Reservation[]> {
  const from = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString()
  const to = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data } = await admin()
    .from("reservations")
    .select("*, customer:customers(*)")
    .eq("status", "confirmed")
    .eq("reminder_sent", false)
    .gte("starts_at", from)
    .lte("starts_at", to)

  return (data ?? []) as Reservation[]
}

export async function getReservationsNeedingFollowUp(): Promise<Reservation[]> {
  const { data } = await admin()
    .from("reservations")
    .select("*, customer:customers(*)")
    .eq("status", "completed")
    .eq("follow_up_sent", false)

  return (data ?? []) as Reservation[]
}