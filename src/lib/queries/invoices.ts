import type { SupabaseClient } from "@supabase/supabase-js"
import { listInvoices, getInvoiceDetail } from "@/lib/services/invoices"
import type { InvoiceStatus } from "@/lib/constants/enums"
import type { InvoiceItemResponse, InvoiceResponse } from "@/lib/schemas/invoice"

type InvoiceCustomer = {
  full_name?: string | null
  email?: string | null
}

type InvoiceItemRow = {
  id: string
  service_id: string | null
  description: string
  quantity: number | string
  unit_price: number | string
  amount: number | string
}

type InvoiceJoinRow = Record<string, unknown> & {
  id: string
  organization_id: string
  appointment_id: string | null
  customer_id: string
  customers?: InvoiceCustomer | null
  invoice_number: string
  currency: string
  subtotal: number | string
  tax_rate: number | string
  tax_amount: number | string
  discount_amount: number | string
  total_amount: number | string
  amount_paid: number | string
  due_at: string
  status: InvoiceStatus
  sent_at: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
  invoice_items?: InvoiceItemRow[]
}

export async function listInvoicesQuery(
  client: SupabaseClient,
  organizationId: string,
  opts: {
    status?: InvoiceStatus
    limit?: number
    offset?: number
  } = {}
): Promise<InvoiceResponse[]> {
  const rows = await listInvoices(client, organizationId, opts)
  return rows.map((row) => mapInvoiceRow(row as InvoiceJoinRow))
}

export async function getInvoiceDetailQuery(
  client: SupabaseClient,
  invoiceId: string,
  organizationId: string
) {
  const row = await getInvoiceDetail(client, invoiceId, organizationId)
  const mapped = mapInvoiceRow(row as InvoiceJoinRow)

  return {
    ...mapped,
    customerEmail: (row as InvoiceJoinRow).customers?.email ?? null,
  }
}

function mapInvoiceRow(row: InvoiceJoinRow): InvoiceResponse {
  return {
    id: row.id,
    organizationId: row.organization_id,
    appointmentId: row.appointment_id,
    customerId: row.customer_id,
    customerName: row.customers?.full_name ?? "Unknown",
    invoiceNumber: row.invoice_number,
    currency: row.currency,
    subtotal: Number(row.subtotal),
    taxRate: Number(row.tax_rate),
    taxAmount: Number(row.tax_amount),
    discountAmount: Number(row.discount_amount),
    totalAmount: Number(row.total_amount),
    amountPaid: Number(row.amount_paid),
    dueAt: row.due_at,
    status: row.status,
    sentAt: row.sent_at,
    paidAt: row.paid_at,
    notes: row.notes,
    items: (row.invoice_items ?? []).map(mapInvoiceItemRow),
    createdAt: row.created_at,
  }
}

function mapInvoiceItemRow(row: InvoiceItemRow): InvoiceItemResponse {
  return {
    id: row.id,
    serviceId: row.service_id,
    description: row.description,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    amount: Number(row.amount),
  }
}
