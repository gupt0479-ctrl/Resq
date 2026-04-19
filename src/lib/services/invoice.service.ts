import { db } from "@/lib/db"
import { reservations } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import type { CreateInvoiceRequest, Invoice, InvoiceLineItem, ServiceResult } from "@/lib/types"

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateTotals(
  line_items: InvoiceLineItem[],
  tax_rate: number,
  discount_amount: number
): { subtotal: number; tax_amount: number; total: number } {
  const subtotal = roundCurrency(
    line_items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  )
  const tax_amount = roundCurrency((subtotal - discount_amount) * tax_rate)
  const total = roundCurrency(subtotal - discount_amount + tax_amount)
  return { subtotal, tax_amount, total }
}

export async function generateInvoice(
  req: CreateInvoiceRequest
): Promise<ServiceResult<Invoice>> {
  const tax_rate = req.tax_rate ?? 0.08
  const discount_amount = req.discount_amount ?? 0
  const due_days = req.due_days ?? 7

  const { subtotal, tax_amount, total } = calculateTotals(
    req.line_items,
    tax_rate,
    discount_amount
  )

  // Look up reservation to get customer_id
  const resRows = await db
    .select({ customerId: reservations.customerId })
    .from(reservations)
    .where(eq(reservations.id, req.reservation_id))
    .limit(1)

  const reservation = resRows[0] ?? null
  if (!reservation) return { error: "Reservation not found." }

  const due_at = new Date(Date.now() + due_days * 24 * 60 * 60 * 1000).toISOString()

  try {
    // The legacy invoices table has line_items jsonb, total, reservation_id columns.
    // We use raw SQL for the insert since the Drizzle schema is the ledger shape.
    const result = await db.execute(sql`
      INSERT INTO invoices (
        reservation_id, customer_id, line_items, subtotal, tax_rate,
        tax_amount, discount_amount, total, status, due_at, reminder_count
      ) VALUES (
        ${req.reservation_id}, ${reservation.customerId},
        ${JSON.stringify(req.line_items)}::jsonb,
        ${subtotal}, ${tax_rate}, ${tax_amount}, ${discount_amount},
        ${total}, 'pending', ${due_at}::timestamptz, 0
      )
      RETURNING *, (
        SELECT row_to_json(c) FROM customers c WHERE c.id = ${reservation.customerId}
      ) as customer, (
        SELECT row_to_json(r) FROM reservations r WHERE r.id = ${req.reservation_id}
      ) as reservation
    `)

    const data = (result as { rows: unknown[] }).rows?.[0] ?? null
    if (!data) return { error: "Failed to create invoice" }
    return { data: data as Invoice }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export async function getInvoices(): Promise<ServiceResult<Invoice[]>> {
  try {
    const result = await db.execute(sql`
      SELECT i.*, row_to_json(c) as customer
      FROM invoices i
      LEFT JOIN customers c ON c.id = i.customer_id
      ORDER BY i.created_at DESC
    `)
    const data = (result as { rows: unknown[] }).rows ?? []
    return { data: data as Invoice[] }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export async function getInvoice(id: string): Promise<ServiceResult<Invoice>> {
  try {
    const result = await db.execute(sql`
      SELECT i.*,
        row_to_json(c) as customer,
        row_to_json(r) as reservation
      FROM invoices i
      LEFT JOIN customers c ON c.id = i.customer_id
      LEFT JOIN reservations r ON r.id = i.reservation_id
      WHERE i.id = ${id}
      LIMIT 1
    `)
    const data = ((result as { rows: unknown[] }).rows ?? [])[0] ?? null
    if (!data) return { error: "Invoice not found." }
    return { data: data as Invoice }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export async function markInvoicePaid(id: string): Promise<ServiceResult<Invoice>> {
  try {
    const result = await db.execute(sql`
      UPDATE invoices
      SET status = 'paid', paid_at = ${new Date().toISOString()}::timestamptz
      WHERE id = ${id}
      RETURNING *
    `)
    const row = ((result as { rows: unknown[] }).rows ?? [])[0] ?? null
    if (!row) return { error: "Invoice not found." }

    // Re-fetch with customer join
    const fullResult = await db.execute(sql`
      SELECT i.*, row_to_json(c) as customer
      FROM invoices i
      LEFT JOIN customers c ON c.id = i.customer_id
      WHERE i.id = ${id}
    `)
    const data = ((fullResult as { rows: unknown[] }).rows ?? [])[0] ?? null
    return { data: (data ?? row) as Invoice }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export async function syncOverdueInvoices(): Promise<void> {
  await db.execute(sql`
    UPDATE invoices
    SET status = 'overdue'
    WHERE status = 'pending'
    AND due_at < ${new Date().toISOString()}::timestamptz
  `)
}

export async function getOverdueInvoices(): Promise<Invoice[]> {
  await syncOverdueInvoices()
  const result = await db.execute(sql`
    SELECT i.*, row_to_json(c) as customer
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    WHERE i.status = 'overdue'
    ORDER BY i.due_at ASC
  `)
  return ((result as { rows: unknown[] }).rows ?? []) as Invoice[]
}

export async function recordReminderSent(id: string): Promise<void> {
  const result = await db.execute(sql`
    SELECT reminder_count FROM invoices WHERE id = ${id}
  `)
  const rows = (result as unknown as { rows: Array<{ reminder_count: number }> }).rows ?? []
  const row = rows[0]

  await db.execute(sql`
    UPDATE invoices
    SET reminder_count = ${(row?.reminder_count ?? 0) + 1},
        last_reminded_at = ${new Date().toISOString()}::timestamptz
    WHERE id = ${id}
  `)
}
