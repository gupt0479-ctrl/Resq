import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { eq, and, inArray, lt, desc, asc } from "drizzle-orm"
import { canSendInvoice, canMarkInvoicePaid } from "@/lib/domain/status-guards"
import { createRevenueTransaction } from "@/lib/services/finance"
import type { InvoiceStatus } from "@/lib/constants/enums"

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
