import { supabaseAdmin } from "@/lib/supabase"
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

  const { data: reservation, error: resErr } = await supabaseAdmin
    .from("reservations")
    .select("customer_id")
    .eq("id", req.reservation_id)
    .single()

  if (resErr || !reservation) return { error: "Reservation not found." }

  const due_at = new Date(Date.now() + due_days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabaseAdmin
    .from("invoices")
    .insert({
      reservation_id: req.reservation_id,
      customer_id: reservation.customer_id,
      line_items: req.line_items,
      subtotal,
      tax_rate,
      tax_amount,
      discount_amount,
      total,
      status: "pending",
      due_at,
      reminder_count: 0,
    })
    .select("*, customer:customers(*), reservation:reservations(*)")
    .single()

  if (error) return { error: error.message }
  return { data: data as Invoice }
}

export async function getInvoices(): Promise<ServiceResult<Invoice[]>> {
  const { data, error } = await supabaseAdmin
    .from("invoices")
    .select("*, customer:customers(*)")
    .order("created_at", { ascending: false })

  if (error) return { error: error.message }
  return { data: (data ?? []) as Invoice[] }
}

export async function getInvoice(id: string): Promise<ServiceResult<Invoice>> {
  const { data, error } = await supabaseAdmin
    .from("invoices")
    .select("*, customer:customers(*), reservation:reservations(*)")
    .eq("id", id)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: "Invoice not found." }
  return { data: data as Invoice }
}

export async function markInvoicePaid(id: string): Promise<ServiceResult<Invoice>> {
  const { data, error } = await supabaseAdmin
    .from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, customer:customers(*)")
    .single()

  if (error) return { error: error.message }
  return { data: data as Invoice }
}

export async function syncOverdueInvoices(): Promise<void> {
  await supabaseAdmin
    .from("invoices")
    .update({ status: "overdue" })
    .eq("status", "pending")
    .lt("due_at", new Date().toISOString())
}

export async function getOverdueInvoices(): Promise<Invoice[]> {
  await syncOverdueInvoices()
  const { data } = await supabaseAdmin
    .from("invoices")
    .select("*, customer:customers(*)")
    .eq("status", "overdue")
    .order("due_at", { ascending: true })

  return (data ?? []) as Invoice[]
}

export async function recordReminderSent(id: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from("invoices")
    .select("reminder_count")
    .eq("id", id)
    .single()

  await supabaseAdmin
    .from("invoices")
    .update({
      reminder_count: (data?.reminder_count ?? 0) + 1,
      last_reminded_at: new Date().toISOString(),
    })
    .eq("id", id)
}