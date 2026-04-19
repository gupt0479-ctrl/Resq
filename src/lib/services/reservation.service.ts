import { db } from "@/lib/db"
import { reservations, customers, followUps } from "@/lib/db/schema"
import { eq, ne, and, lt, gt, gte, lte, inArray } from "drizzle-orm"
import type {
  BookReservationRequest,
  Customer,
  FollowUp,
  Reservation,
  RescheduleReservationRequest,
  ServiceResult,
} from "@/lib/types"

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

  try {
    const conditions = [
      inArray(reservations.status, ["confirmed", "completed"]),
      lt(reservations.startsAt, new Date(ends_at)),
      gt(reservations.endsAt, new Date(starts_at)),
    ]

    if (exclude_id) {
      conditions.push(ne(reservations.id, exclude_id))
    }

    const rows = await db
      .select()
      .from(reservations)
      .leftJoin(customers, eq(reservations.customerId, customers.id))
      .where(and(...conditions))

    const data = rows.map((r) => ({
      ...r.reservations,
      customer: r.customers,
    }))
    return { data: data as unknown as Reservation[] }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

async function findOrCreateCustomer(
  req: BookReservationRequest
): Promise<ServiceResult<Customer>> {
  try {
    const existing = await db
      .select()
      .from(customers)
      .where(eq(customers.email, req.customer_email))
      .limit(1)

    if (existing[0]) return { data: existing[0] as unknown as Customer }

    const [created] = await db
      .insert(customers)
      .values({
        fullName: req.customer_name,
        email: req.customer_email,
        phone: req.customer_phone ?? null,
        organizationId: "00000000-0000-0000-0000-000000000001",
      })
      .returning()

    return { data: created as unknown as Customer }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
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

  try {
    const [data] = await db
      .insert(reservations)
      .values({
        customerId: customerResult.data.id,
        partySize: req.party_size ?? 2,
        startsAt: new Date(req.starts_at),
        endsAt: new Date(req.ends_at),
        notes: req.notes ?? null,
        occasion: req.occasion ?? null,
        status: "confirmed",
        reminderSent: false,
        followUpSent: false,
      })
      .returning()

    // Re-fetch with customer join
    const rows = await db
      .select()
      .from(reservations)
      .leftJoin(customers, eq(reservations.customerId, customers.id))
      .where(eq(reservations.id, data.id))
      .limit(1)

    const row = rows[0]
    return { data: { ...row?.reservations, customer: row?.customers } as unknown as Reservation }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export async function getReservations(): Promise<ServiceResult<Reservation[]>> {
  try {
    const rows = await db
      .select()
      .from(reservations)
      .leftJoin(customers, eq(reservations.customerId, customers.id))
      .orderBy(reservations.startsAt)

    const data = rows.map((r) => ({
      ...r.reservations,
      customer: r.customers,
    }))
    return { data: data as unknown as Reservation[] }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export async function getReservation(id: string): Promise<ServiceResult<Reservation>> {
  try {
    const rows = await db
      .select()
      .from(reservations)
      .leftJoin(customers, eq(reservations.customerId, customers.id))
      .where(eq(reservations.id, id))
      .limit(1)

    const row = rows[0]
    if (!row) return { error: "Reservation not found." }
    return { data: { ...row.reservations, customer: row.customers } as unknown as Reservation }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
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

  try {
    await db
      .update(reservations)
      .set({
        startsAt: new Date(req.starts_at),
        endsAt: new Date(req.ends_at),
        notes: req.notes ?? existing.data.notes,
        occasion: req.occasion ?? existing.data.occasion,
        partySize: req.party_size ?? existing.data.party_size,
      })
      .where(eq(reservations.id, id))

    const rows = await db
      .select()
      .from(reservations)
      .leftJoin(customers, eq(reservations.customerId, customers.id))
      .where(eq(reservations.id, id))
      .limit(1)

    const row = rows[0]
    return { data: { ...row?.reservations, customer: row?.customers } as unknown as Reservation }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export async function cancelReservation(id: string): Promise<ServiceResult<Reservation>> {
  try {
    await db
      .update(reservations)
      .set({ status: "cancelled" })
      .where(eq(reservations.id, id))

    const rows = await db
      .select()
      .from(reservations)
      .leftJoin(customers, eq(reservations.customerId, customers.id))
      .where(eq(reservations.id, id))
      .limit(1)

    const row = rows[0]
    return { data: { ...row?.reservations, customer: row?.customers } as unknown as Reservation }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export async function completeReservation(id: string): Promise<ServiceResult<Reservation>> {
  const existing = await getReservation(id)
  if (existing.error || !existing.data) return { error: existing.error ?? "Not found." }
  if (existing.data.status === "completed") return { data: existing.data }
  if (existing.data.status === "cancelled") {
    return { error: "Cancelled reservations cannot be completed." }
  }

  try {
    await db
      .update(reservations)
      .set({ status: "completed" })
      .where(eq(reservations.id, id))

    const rows = await db
      .select()
      .from(reservations)
      .leftJoin(customers, eq(reservations.customerId, customers.id))
      .where(eq(reservations.id, id))
      .limit(1)

    const row = rows[0]

    // Update visit count
    const visits = (existing.data as unknown as Record<string, unknown>)?.visit_count as number ?? 0
    if (existing.data.customer_id) {
      await db
        .update(customers)
        .set({ lifetimeValue: String(visits + 1) })
        .where(eq(customers.id, existing.data.customer_id))
    }

    return { data: { ...row?.reservations, customer: row?.customers } as unknown as Reservation }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export async function markReminderSent(id: string): Promise<void> {
  await db
    .update(reservations)
    .set({ reminderSent: true })
    .where(eq(reservations.id, id))
}

export async function markFollowUpSent(id: string): Promise<void> {
  await db
    .update(reservations)
    .set({ followUpSent: true })
    .where(eq(reservations.id, id))
}

export async function createFollowUpRecord(
  reservationId: string,
  customerId: string,
  message: string
): Promise<ServiceResult<FollowUp>> {
  try {
    const [data] = await db
      .insert(followUps)
      .values({
        reservationId,
        customerId,
        message,
        sentAt: new Date(),
      })
      .returning()

    return { data: data as unknown as FollowUp }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export async function getReservationsNeedingReminder(): Promise<Reservation[]> {
  const from = new Date(Date.now() + 23 * 60 * 60 * 1000)
  const to = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const rows = await db
    .select()
    .from(reservations)
    .leftJoin(customers, eq(reservations.customerId, customers.id))
    .where(
      and(
        eq(reservations.status, "confirmed"),
        eq(reservations.reminderSent, false),
        gte(reservations.startsAt, from),
        lte(reservations.startsAt, to)
      )
    )

  return rows.map((r) => ({
    ...r.reservations,
    customer: r.customers,
  })) as unknown as Reservation[]
}

export async function getReservationsNeedingFollowUp(): Promise<Reservation[]> {
  const rows = await db
    .select()
    .from(reservations)
    .leftJoin(customers, eq(reservations.customerId, customers.id))
    .where(
      and(
        eq(reservations.status, "completed"),
        eq(reservations.followUpSent, false)
      )
    )

  return rows.map((r) => ({
    ...r.reservations,
    customer: r.customers,
  })) as unknown as Reservation[]
}
