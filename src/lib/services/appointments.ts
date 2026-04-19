import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { eq, and, notInArray, asc, desc } from "drizzle-orm"
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
 * All mutations run within a single round-trip sequence.
 */
export async function completeAppointment(
  appointmentId: string,
  organizationId: string,
  notes?: string,
  customLineItems?: Array<{ description: string; qty: number; unitPrice: number }>
): Promise<CompleteAppointmentResult> {
  // 1. Fetch the appointment
  const [appt] = await db
    .select()
    .from(schema.appointments)
    .where(
      and(
        eq(schema.appointments.id, appointmentId),
        eq(schema.appointments.organizationId, organizationId),
      ),
    )
    .limit(1)

  if (!appt) {
    throw new Error("Appointment not found")
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
  await db
    .update(schema.appointments)
    .set({ status: "completed", updatedAt: new Date(now) })
    .where(
      and(
        eq(schema.appointments.id, appointmentId),
        eq(schema.appointments.organizationId, organizationId),
      ),
    )

  // 3. Insert audit event
  await db.insert(schema.appointmentEvents).values({
    appointmentId,
    organizationId,
    eventType:  DOMAIN_EVENT.RESERVATION_COMPLETED,
    fromStatus,
    toStatus:   "completed",
    notes:      notes ?? null,
    metadata:   { source: "api" },
  })

  // 4. Generate invoice from custom line items (if provided) or service catalog
  const invoiceId = await generateInvoiceFromAppointment({
    id:              appt.id,
    organization_id: appt.organizationId,
    customer_id:     appt.customerId,
    service_id:      appt.serviceId,
    covers:          appt.covers,
    notes:           appt.notes,
    status:          "completed",
    customLineItems: customLineItems && customLineItems.length > 0 ? customLineItems : undefined,
  })

  const result: AppointmentRow = {
    id:              appt.id,
    organization_id: appt.organizationId,
    customer_id:     appt.customerId,
    staff_id:        appt.staffId,
    service_id:      appt.serviceId,
    covers:          appt.covers,
    starts_at:       appt.startsAt.toISOString(),
    ends_at:         appt.endsAt.toISOString(),
    status:          "completed" as AppointmentStatus,
    notes:           appt.notes,
  }

  return { appointment: result, invoiceId }
}

// ─── List appointments ────────────────────────────────────────────────────

export async function listAppointments(
  organizationId: string,
  opts: {
    status?: AppointmentStatus
    limit?: number
    offset?: number
    orderBy?: "starts_at" | "created_at"
    orderDir?: "asc" | "desc"
  } = {}
) {
  const orderCol = opts.orderBy === "created_at" ? schema.appointments.createdAt : schema.appointments.startsAt
  const orderFn = opts.orderDir === "desc" ? desc : asc

  const conditions = [eq(schema.appointments.organizationId, organizationId)]
  if (opts.status) {
    conditions.push(eq(schema.appointments.status, opts.status))
  }

  const rows = await db
    .select()
    .from(schema.appointments)
    .leftJoin(schema.customers, eq(schema.appointments.customerId, schema.customers.id))
    .leftJoin(schema.staff, eq(schema.appointments.staffId, schema.staff.id))
    .leftJoin(schema.services, eq(schema.appointments.serviceId, schema.services.id))
    .where(and(...conditions))
    .orderBy(orderFn(orderCol))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0)

  return rows.map((r) => ({
    ...r.appointments,
    customers: r.customers
      ? { id: r.customers.id, full_name: r.customers.fullName, email: r.customers.email }
      : null,
    staff: r.staff
      ? { id: r.staff.id, full_name: r.staff.fullName, role: r.staff.role }
      : null,
    services: r.services
      ? { id: r.services.id, name: r.services.name, price_per_person: r.services.pricePerPerson }
      : null,
  }))
}

// ─── Cancel appointment ───────────────────────────────────────────────────

export async function cancelAppointment(
  appointmentId: string,
  organizationId: string
): Promise<void> {
  await db
    .update(schema.appointments)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(schema.appointments.id, appointmentId),
        eq(schema.appointments.organizationId, organizationId),
        notInArray(schema.appointments.status, ["completed", "cancelled"]),
      ),
    )
}

// ─── Reschedule appointment ───────────────────────────────────────────────

export async function rescheduleAppointment(
  appointmentId: string,
  organizationId: string,
  startsAt: string,
  endsAt: string
): Promise<void> {
  await db
    .update(schema.appointments)
    .set({
      status:    "rescheduled",
      startsAt:  new Date(startsAt),
      endsAt:    new Date(endsAt),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.appointments.id, appointmentId),
        eq(schema.appointments.organizationId, organizationId),
      ),
    )
}

// ─── Create appointment ───────────────────────────────────────────────────

export async function createAppointment(
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
  const [existing] = await db
    .select({ id: schema.customers.id })
    .from(schema.customers)
    .where(
      and(
        eq(schema.customers.organizationId, organizationId),
        eq(schema.customers.email, opts.customerEmail),
      ),
    )
    .limit(1)

  let customerId: string
  if (existing) {
    customerId = existing.id
  } else {
    const [created] = await db
      .insert(schema.customers)
      .values({
        organizationId,
        fullName: opts.customerName,
        email:    opts.customerEmail,
        phone:    opts.customerPhone ?? null,
      })
      .returning({ id: schema.customers.id })
    if (!created) throw new Error("Failed to create customer")
    customerId = created.id
  }

  // 2. Get first active service
  const [service] = await db
    .select({ id: schema.services.id })
    .from(schema.services)
    .where(
      and(
        eq(schema.services.organizationId, organizationId),
        eq(schema.services.isActive, true),
      ),
    )
    .orderBy(asc(schema.services.name))
    .limit(1)

  if (!service) throw new Error("No active services found for this organisation")

  // 3. Create appointment
  const [appt] = await db
    .insert(schema.appointments)
    .values({
      organizationId,
      customerId,
      serviceId:     service.id,
      covers:        opts.covers,
      startsAt:      new Date(opts.startsAt),
      endsAt:        new Date(opts.endsAt),
      status:        "confirmed",
      bookingSource: "manual",
      notes:         opts.notes ?? null,
    })
    .returning({ id: schema.appointments.id })

  if (!appt) throw new Error("Failed to create appointment")
  return appt.id
}

// ─── Get single appointment ───────────────────────────────────────────────

export async function getAppointment(
  appointmentId: string,
  organizationId: string
) {
  const rows = await db
    .select()
    .from(schema.appointments)
    .leftJoin(schema.customers, eq(schema.appointments.customerId, schema.customers.id))
    .leftJoin(schema.staff, eq(schema.appointments.staffId, schema.staff.id))
    .leftJoin(schema.services, eq(schema.appointments.serviceId, schema.services.id))
    .where(
      and(
        eq(schema.appointments.id, appointmentId),
        eq(schema.appointments.organizationId, organizationId),
      ),
    )
    .limit(1)

  const r = rows[0]
  if (!r) throw new Error("Appointment not found")

  return {
    ...r.appointments,
    customers: r.customers
      ? { id: r.customers.id, full_name: r.customers.fullName, email: r.customers.email, phone: r.customers.phone }
      : null,
    staff: r.staff
      ? { id: r.staff.id, full_name: r.staff.fullName, role: r.staff.role }
      : null,
    services: r.services
      ? {
          id:               r.services.id,
          name:             r.services.name,
          description:      r.services.description,
          price_per_person: r.services.pricePerPerson,
          category:         r.services.category,
        }
      : null,
  }
}
