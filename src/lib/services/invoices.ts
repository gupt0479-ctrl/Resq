import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { eq, and, count, inArray, lt, gte, desc, asc } from "drizzle-orm"
import {
  computeInvoiceTotals,
  buildServiceLines,
  generateInvoiceNumber,
} from "@/lib/domain/invoice-calculator"
import { canSendInvoice, canMarkInvoicePaid } from "@/lib/domain/status-guards"
import { createRevenueTransaction } from "@/lib/services/finance"
import { DOMAIN_EVENT } from "@/lib/constants/enums"
import type { InvoiceStatus } from "@/lib/constants/enums"

// ─── Types for internal use ───────────────────────────────────────────────

interface AppointmentForInvoice {
  id:              string
  organization_id: string
  customer_id:     string
  service_id:      string
  covers:          number
  notes:           string | null
  status?:         string
  customLineItems?: Array<{ description: string; qty: number; unitPrice: number }>
}

// ─── Generate invoice from completed appointment ──────────────────────────

/**
 * Creates an invoice deterministically from a completed appointment.
 * Line items and totals are derived solely from the services catalog.
 * AI must not produce or override these values.
 *
 * Returns the newly created invoice ID.
 */
export async function generateInvoiceFromAppointment(
  appt: AppointmentForInvoice
): Promise<string> {
  // 1. Build line items — use custom items if provided, otherwise fall back to service catalog
  let lines: import("@/lib/domain/invoice-calculator").InvoiceLineInput[]

  if (appt.customLineItems && appt.customLineItems.length > 0) {
    lines = appt.customLineItems.map((li) => ({
      serviceId:   null,
      description: li.description,
      quantity:    li.qty,
      unitPrice:   li.unitPrice,
    }))
  } else {
    const [service] = await db
      .select({
        id:             schema.services.id,
        name:           schema.services.name,
        pricePerPerson: schema.services.pricePerPerson,
      })
      .from(schema.services)
      .where(eq(schema.services.id, appt.service_id))
      .limit(1)

    if (!service) {
      throw new Error("Service not found — cannot price invoice")
    }
    lines = buildServiceLines(
      { id: service.id, name: service.name, price_per_person: Number(service.pricePerPerson) },
      appt.covers,
    )
  }

  // 3. Compute totals deterministically
  const totals = computeInvoiceTotals(lines)

  // 4. Generate sequential invoice number
  const year = new Date().getFullYear()
  const [countResult] = await db
    .select({ count: count() })
    .from(schema.invoices)
    .where(
      and(
        eq(schema.invoices.organizationId, appt.organization_id),
        gte(schema.invoices.createdAt, new Date(`${year}-01-01T00:00:00Z`)),
      ),
    )

  const invoiceNumber = generateInvoiceNumber(Number(countResult?.count ?? 0))
  const now = new Date()

  // 5. Insert invoice row
  const [invoice] = await db
    .insert(schema.invoices)
    .values({
      organizationId: appt.organization_id,
      appointmentId:  appt.id,
      customerId:     appt.customer_id,
      invoiceNumber,
      currency:       "USD",
      subtotal:       String(totals.subtotal),
      taxRate:        String(totals.taxRate),
      taxAmount:      String(totals.taxAmount),
      discountAmount: String(totals.discountAmount),
      totalAmount:    String(totals.totalAmount),
      amountPaid:     "0",
      dueAt:          totals.dueAt,
      status:         "draft",
      notes:          appt.notes,
      createdAt:      now,
      updatedAt:      now,
    })
    .returning({ id: schema.invoices.id })

  if (!invoice) {
    throw new Error("Failed to create invoice")
  }

  // 6. Insert line items
  const lineRows = lines.map((l) => ({
    invoiceId:      invoice.id,
    organizationId: appt.organization_id,
    serviceId:      l.serviceId,
    description:    l.description,
    quantity:       l.quantity,
    unitPrice:      String(l.unitPrice),
    amount:         String(Math.round(l.quantity * l.unitPrice * 100) / 100),
  }))

  await db.insert(schema.invoiceItems).values(lineRows)

  // 7. Insert audit event on the appointment
  await db.insert(schema.appointmentEvents).values({
    appointmentId:  appt.id,
    organizationId: appt.organization_id,
    eventType:      DOMAIN_EVENT.INVOICE_GENERATED,
    fromStatus:     "completed",
    toStatus:       "completed",
    notes:          `Invoice ${invoiceNumber} generated`,
    metadata:       { invoice_id: invoice.id, invoice_number: invoiceNumber },
  })

  return invoice.id
}

// ─── Send invoice ─────────────────────────────────────────────────────────

export async function sendInvoice(
  invoiceId: string,
  organizationId: string,
  notes?: string
): Promise<void> {
  const [inv] = await db
    .select({
      id:             schema.invoices.id,
      status:         schema.invoices.status,
      appointmentId:  schema.invoices.appointmentId,
      organizationId: schema.invoices.organizationId,
    })
    .from(schema.invoices)
    .where(
      and(
        eq(schema.invoices.id, invoiceId),
        eq(schema.invoices.organizationId, organizationId),
      ),
    )
    .limit(1)

  if (!inv) {
    throw new Error("Invoice not found")
  }

  if (!canSendInvoice(inv.status as InvoiceStatus)) {
    throw new Error(
      `Cannot send invoice with status '${inv.status}'. Only draft invoices can be sent.`
    )
  }

  const now = new Date()
  await db
    .update(schema.invoices)
    .set({ status: "sent", sentAt: now, notes: notes ?? null, updatedAt: now })
    .where(
      and(
        eq(schema.invoices.id, invoiceId),
        eq(schema.invoices.organizationId, organizationId),
      ),
    )

  if (inv.appointmentId) {
    await db.insert(schema.appointmentEvents).values({
      appointmentId:  inv.appointmentId,
      organizationId,
      eventType:      DOMAIN_EVENT.INVOICE_SENT,
      fromStatus:     null,
      toStatus:       null,
      notes:          "Invoice sent to guest",
      metadata:       { invoice_id: invoiceId },
    })
  }
}

// ─── Mark invoice paid ────────────────────────────────────────────────────

export interface MarkPaidOptions {
  paymentMethod?: string
  amountPaid?:    number
  notes?:         string
}

export async function markInvoicePaid(
  invoiceId: string,
  organizationId: string,
  opts: MarkPaidOptions = {}
): Promise<void> {
  const [inv] = await db
    .select({
      id:            schema.invoices.id,
      status:        schema.invoices.status,
      totalAmount:   schema.invoices.totalAmount,
      appointmentId: schema.invoices.appointmentId,
      customerId:    schema.invoices.customerId,
      invoiceNumber: schema.invoices.invoiceNumber,
    })
    .from(schema.invoices)
    .where(
      and(
        eq(schema.invoices.id, invoiceId),
        eq(schema.invoices.organizationId, organizationId),
      ),
    )
    .limit(1)

  if (!inv) {
    throw new Error("Invoice not found")
  }

  if (!canMarkInvoicePaid(inv.status as InvoiceStatus)) {
    throw new Error(
      `Cannot mark invoice '${inv.status}' as paid. ` +
        "Only sent, pending, or overdue invoices can be marked paid."
    )
  }

  const amountPaid = opts.amountPaid ?? Number(inv.totalAmount)
  const now = new Date()

  await db
    .update(schema.invoices)
    .set({
      status:     "paid",
      paidAt:     now,
      amountPaid: String(amountPaid),
      updatedAt:  now,
    })
    .where(
      and(
        eq(schema.invoices.id, invoiceId),
        eq(schema.invoices.organizationId, organizationId),
      ),
    )

  // Create idempotent revenue transaction (unique index guards against duplication)
  await createRevenueTransaction({
    organizationId,
    invoiceId,
    amount:        amountPaid,
    paymentMethod: opts.paymentMethod,
    notes:         opts.notes ?? `Payment for invoice ${inv.invoiceNumber}`,
  })

  if (inv.appointmentId) {
    await db.insert(schema.appointmentEvents).values({
      appointmentId:  inv.appointmentId,
      organizationId,
      eventType:      DOMAIN_EVENT.INVOICE_PAID,
      fromStatus:     null,
      toStatus:       null,
      notes:          `Invoice ${inv.invoiceNumber} paid`,
      metadata:       { invoice_id: invoiceId, amount: amountPaid },
    })
  }
}

// ─── List invoices ────────────────────────────────────────────────────────

export async function listInvoices(
  organizationId: string,
  opts: {
    status?: InvoiceStatus
    limit?: number
    offset?: number
  } = {}
) {
  const conditions = [eq(schema.invoices.organizationId, organizationId)]
  if (opts.status) {
    conditions.push(eq(schema.invoices.status, opts.status))
  }

  const rows = await db
    .select()
    .from(schema.invoices)
    .leftJoin(schema.customers, eq(schema.invoices.customerId, schema.customers.id))
    .where(and(...conditions))
    .orderBy(desc(schema.invoices.createdAt))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0)

  return rows.map((r) => ({
    ...r.invoices,
    customers: r.customers
      ? { id: r.customers.id, full_name: r.customers.fullName, email: r.customers.email }
      : null,
  }))
}

// ─── Get invoice detail (with line items) ────────────────────────────────

export async function getInvoiceDetail(
  invoiceId: string,
  organizationId: string
) {
  const invRows = await db
    .select()
    .from(schema.invoices)
    .leftJoin(schema.customers, eq(schema.invoices.customerId, schema.customers.id))
    .where(
      and(
        eq(schema.invoices.id, invoiceId),
        eq(schema.invoices.organizationId, organizationId),
      ),
    )
    .limit(1)

  const invRow = invRows[0]
  if (!invRow) throw new Error("Invoice not found")

  const items = await db
    .select()
    .from(schema.invoiceItems)
    .where(eq(schema.invoiceItems.invoiceId, invoiceId))
    .orderBy(asc(schema.invoiceItems.createdAt))

  return {
    ...invRow.invoices,
    customers: invRow.customers
      ? { id: invRow.customers.id, full_name: invRow.customers.fullName, email: invRow.customers.email, phone: invRow.customers.phone }
      : null,
    invoice_items: items,
  }
}

// ─── Recompute overdue status (called by cron or scheduled job) ───────────

/**
 * When an appointment is already completed, ensure a ledger invoice exists
 * (idempotent — returns existing invoice if already generated).
 */
export async function ensureInvoiceForCompletedAppointment(
  appointmentId: string,
  organizationId: string
): Promise<{ invoiceId: string; created: boolean }> {
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

  if (appt.status !== "completed") {
    throw new Error(
      `Cannot create invoice: appointment status is '${appt.status}'. Only completed appointments can have invoices.`
    )
  }

  const [existing] = await db
    .select({ id: schema.invoices.id })
    .from(schema.invoices)
    .where(
      and(
        eq(schema.invoices.appointmentId, appointmentId),
        eq(schema.invoices.organizationId, organizationId),
      ),
    )
    .limit(1)

  if (existing?.id) {
    return { invoiceId: existing.id, created: false }
  }

  try {
    const invoiceId = await generateInvoiceFromAppointment({
      id:              appt.id,
      organization_id: appt.organizationId,
      customer_id:     appt.customerId,
      service_id:      appt.serviceId,
      covers:          appt.covers,
      notes:           appt.notes,
    })

    return { invoiceId, created: true }
  } catch (err) {
    // A concurrent request may have inserted the invoice between our read and
    // insert — re-fetch to handle the unique-violation case.
    const [concurrentExisting] = await db
      .select({ id: schema.invoices.id })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.appointmentId, appointmentId),
          eq(schema.invoices.organizationId, organizationId),
        ),
      )
      .limit(1)

    if (concurrentExisting?.id) {
      return { invoiceId: concurrentExisting.id, created: false }
    }

    throw err
  }
}

/** Record that a payment reminder was drafted/sent (increments reminder_count). */
export async function recordInvoiceReminderSent(
  invoiceId: string,
  organizationId: string
): Promise<number> {
  const now = new Date()
  const maxAttempts = 5

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const [inv] = await db
      .select({
        id:            schema.invoices.id,
        appointmentId: schema.invoices.appointmentId,
        reminderCount: schema.invoices.reminderCount,
        invoiceNumber: schema.invoices.invoiceNumber,
      })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.id, invoiceId),
          eq(schema.invoices.organizationId, organizationId),
        ),
      )
      .limit(1)

    if (!inv) {
      throw new Error("Invoice not found")
    }

    const current = Number(inv.reminderCount) || 0
    const next = current + 1

    // CAS-style update: only commit if reminder_count hasn't changed since we read it.
    const updated = await db
      .update(schema.invoices)
      .set({
        reminderCount:  next,
        lastRemindedAt: now,
        updatedAt:      now,
      })
      .where(
        and(
          eq(schema.invoices.id, invoiceId),
          eq(schema.invoices.organizationId, organizationId),
          eq(schema.invoices.reminderCount, current),
        ),
      )
      .returning({ reminderCount: schema.invoices.reminderCount })

    if (!updated.length) {
      // 0 rows matched — another concurrent update won the race; retry.
      continue
    }

    const finalCount = Number(updated[0].reminderCount) || next

    if (inv.appointmentId) {
      await db.insert(schema.appointmentEvents).values({
        appointmentId:  inv.appointmentId,
        organizationId,
        eventType:      DOMAIN_EVENT.INVOICE_REMINDER_SENT,
        fromStatus:     null,
        toStatus:       null,
        notes:          `Payment reminder #${finalCount} for invoice ${inv.invoiceNumber}`,
        metadata:       { invoice_id: invoiceId, reminder_count: finalCount },
      })
    }

    return finalCount
  }

  throw new Error("Failed to record invoice reminder after concurrent updates")
}

export async function markOverdueInvoices(
  organizationId: string
): Promise<number> {
  const now = new Date()

  const data = await db
    .update(schema.invoices)
    .set({ status: "overdue", updatedAt: now })
    .where(
      and(
        eq(schema.invoices.organizationId, organizationId),
        inArray(schema.invoices.status, ["sent", "pending"]),
        lt(schema.invoices.dueAt, now),
      ),
    )
    .returning({ id: schema.invoices.id })

  return data.length
}
