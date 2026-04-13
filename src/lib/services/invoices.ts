import type { SupabaseClient } from "@supabase/supabase-js"
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
  client: SupabaseClient,
  appt: AppointmentForInvoice
): Promise<string> {
  // 1. Fetch the service catalog entry (pricing source of truth)
  const { data: service, error: svcErr } = await client
    .from("services")
    .select("id, name, price_per_person")
    .eq("id", appt.service_id)
    .single()

  if (svcErr || !service) {
    throw new Error(svcErr?.message ?? "Service not found — cannot price invoice")
  }

  // 2. Build line items from catalog price × covers
  const lines = buildServiceLines(service, appt.covers)

  // 3. Compute totals deterministically
  const totals = computeInvoiceTotals(lines)

  // 4. Generate sequential invoice number
  const year = new Date().getFullYear()
  const { count } = await client
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", appt.organization_id)
    .gte("created_at", `${year}-01-01T00:00:00Z`)

  const invoiceNumber = generateInvoiceNumber(count ?? 0)
  const now = new Date().toISOString()

  // 5. Insert invoice row
  const { data: invoice, error: invErr } = await client
    .from("invoices")
    .insert({
      organization_id: appt.organization_id,
      appointment_id:  appt.id,
      customer_id:     appt.customer_id,
      invoice_number:  invoiceNumber,
      currency:        "USD",
      subtotal:        totals.subtotal,
      tax_rate:        totals.taxRate,
      tax_amount:      totals.taxAmount,
      discount_amount: totals.discountAmount,
      total_amount:    totals.totalAmount,
      amount_paid:     0,
      due_at:          totals.dueAt.toISOString(),
      status:          "draft",
      notes:           appt.notes,
      created_at:      now,
      updated_at:      now,
    })
    .select("id")
    .single()

  if (invErr || !invoice) {
    throw new Error(invErr?.message ?? "Failed to create invoice")
  }

  // 6. Insert line items
  const lineRows = lines.map((l) => ({
    invoice_id:      invoice.id,
    organization_id: appt.organization_id,
    service_id:      l.serviceId,
    description:     l.description,
    quantity:        l.quantity,
    unit_price:      l.unitPrice,
    amount:          Math.round(l.quantity * l.unitPrice * 100) / 100,
  }))

  const { error: itemErr } = await client.from("invoice_items").insert(lineRows)
  if (itemErr) {
    throw new Error(`Failed to create invoice items: ${itemErr.message}`)
  }

  // 7. Insert audit event on the appointment
  await client.from("appointment_events").insert({
    appointment_id:  appt.id,
    organization_id: appt.organization_id,
    event_type:      DOMAIN_EVENT.INVOICE_GENERATED,
    from_status:     "completed",
    to_status:       "completed",
    notes:           `Invoice ${invoiceNumber} generated`,
    metadata:        { invoice_id: invoice.id, invoice_number: invoiceNumber },
  })

  return invoice.id
}

// ─── Send invoice ─────────────────────────────────────────────────────────

export async function sendInvoice(
  client: SupabaseClient,
  invoiceId: string,
  organizationId: string,
  notes?: string
): Promise<void> {
  const { data: inv, error: fetchErr } = await client
    .from("invoices")
    .select("id, status, appointment_id, organization_id")
    .eq("id", invoiceId)
    .eq("organization_id", organizationId)
    .single()

  if (fetchErr || !inv) {
    throw new Error(fetchErr?.message ?? "Invoice not found")
  }

  if (!canSendInvoice(inv.status as InvoiceStatus)) {
    throw new Error(
      `Cannot send invoice with status '${inv.status}'. Only draft invoices can be sent.`
    )
  }

  const now = new Date().toISOString()
  const { error: updateErr } = await client
    .from("invoices")
    .update({ status: "sent", sent_at: now, notes: notes ?? null, updated_at: now })
    .eq("id", invoiceId)
    .eq("organization_id", organizationId)

  if (updateErr) {
    throw new Error(`Failed to send invoice: ${updateErr.message}`)
  }

  if (inv.appointment_id) {
    await client.from("appointment_events").insert({
      appointment_id:  inv.appointment_id,
      organization_id: organizationId,
      event_type:      DOMAIN_EVENT.INVOICE_SENT,
      from_status:     null,
      to_status:       null,
      notes:           "Invoice sent to guest",
      metadata:        { invoice_id: invoiceId },
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
  client: SupabaseClient,
  invoiceId: string,
  organizationId: string,
  opts: MarkPaidOptions = {}
): Promise<void> {
  const { data: inv, error: fetchErr } = await client
    .from("invoices")
    .select("id, status, total_amount, appointment_id, customer_id, invoice_number")
    .eq("id", invoiceId)
    .eq("organization_id", organizationId)
    .single()

  if (fetchErr || !inv) {
    throw new Error(fetchErr?.message ?? "Invoice not found")
  }

  if (!canMarkInvoicePaid(inv.status as InvoiceStatus)) {
    throw new Error(
      `Cannot mark invoice '${inv.status}' as paid. ` +
        "Only sent, pending, or overdue invoices can be marked paid."
    )
  }

  const amountPaid = opts.amountPaid ?? inv.total_amount
  const now = new Date().toISOString()

  const { error: updateErr } = await client
    .from("invoices")
    .update({
      status:       "paid",
      paid_at:      now,
      amount_paid:  amountPaid,
      updated_at:   now,
    })
    .eq("id", invoiceId)
    .eq("organization_id", organizationId)

  if (updateErr) {
    throw new Error(`Failed to mark invoice paid: ${updateErr.message}`)
  }

  // Create idempotent revenue transaction (unique index guards against duplication)
  await createRevenueTransaction(client, {
    invoiceId,
    amount:        amountPaid,
    paymentMethod: opts.paymentMethod,
    notes:         opts.notes ?? `Payment for invoice ${inv.invoice_number}`,
  })

  if (inv.appointment_id) {
    await client.from("appointment_events").insert({
      appointment_id:  inv.appointment_id,
      organization_id: organizationId,
      event_type:      DOMAIN_EVENT.INVOICE_PAID,
      from_status:     null,
      to_status:       null,
      notes:           `Invoice ${inv.invoice_number} paid`,
      metadata:        { invoice_id: invoiceId, amount: amountPaid },
    })
  }
}

// ─── List invoices ────────────────────────────────────────────────────────

export async function listInvoices(
  client: SupabaseClient,
  organizationId: string,
  opts: {
    status?: InvoiceStatus
    limit?: number
    offset?: number
  } = {}
) {
  let query = client
    .from("invoices")
    .select("*, customers ( id, full_name, email )")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })

  if (opts.status) {
    query = query.eq("status", opts.status)
  }

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

// ─── Get invoice detail (with line items) ────────────────────────────────

export async function getInvoiceDetail(
  client: SupabaseClient,
  invoiceId: string,
  organizationId: string
) {
  const { data: invoice, error: invErr } = await client
    .from("invoices")
    .select("*, customers ( id, full_name, email, phone )")
    .eq("id", invoiceId)
    .eq("organization_id", organizationId)
    .single()

  if (invErr || !invoice) throw new Error(invErr?.message ?? "Invoice not found")

  const { data: items, error: itemErr } = await client
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: true })

  if (itemErr) throw new Error(itemErr.message)

  return { ...invoice, invoice_items: items ?? [] }
}

// ─── Recompute overdue status (called by cron or scheduled job) ───────────

export async function markOverdueInvoices(
  client: SupabaseClient,
  organizationId: string
): Promise<number> {
  const now = new Date().toISOString()

  const { data, error } = await client
    .from("invoices")
    .update({ status: "overdue", updated_at: now })
    .eq("organization_id", organizationId)
    .in("status", ["sent", "pending"])
    .lt("due_at", now)
    .select("id")

  if (error) throw new Error(error.message)
  return data?.length ?? 0
}
