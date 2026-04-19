import { listInvoices, getInvoiceDetail } from "@/lib/services/invoices"
import type { InvoiceStatus } from "@/lib/constants/enums"
import type { InvoiceItemResponse, InvoiceResponse } from "@/lib/schemas/invoice"

type InvoiceCustomer = {
  full_name?: string | null
  email?: string | null
}

type InvoiceItemRow = {
  id: string
  serviceId: string | null
  description: string
  quantity: number | string
  unitPrice: number | string
  amount: number | string
}

type InvoiceJoinRow = Record<string, unknown> & {
  id: string
  organizationId: string
  appointmentId: string | null
  customerId: string
  customers?: InvoiceCustomer | null
  invoiceNumber: string
  currency: string
  subtotal: number | string
  taxRate: number | string
  taxAmount: number | string
  discountAmount: number | string
  totalAmount: number | string
  amountPaid: number | string
  dueAt: Date | string
  status: InvoiceStatus
  sentAt: Date | string | null
  paidAt: Date | string | null
  notes: string | null
  createdAt: Date | string
  invoice_items?: InvoiceItemRow[]
}

export async function listInvoicesQuery(
  organizationId: string,
  opts: {
    status?: InvoiceStatus
    limit?: number
    offset?: number
  } = {}
): Promise<InvoiceResponse[]> {
  const rows = await listInvoices(organizationId, opts)
  return rows.map((row) => mapInvoiceRow(row as unknown as InvoiceJoinRow))
}

export async function getInvoiceDetailQuery(
  invoiceId: string,
  organizationId: string
) {
  const row = await getInvoiceDetail(invoiceId, organizationId)
  const mapped = mapInvoiceRow(row as unknown as InvoiceJoinRow)

  return {
    ...mapped,
    customerEmail: (row as unknown as InvoiceJoinRow).customers?.email ?? null,
  }
}

function toISOString(val: Date | string | null): string | null {
  if (val == null) return null
  if (val instanceof Date) return val.toISOString()
  return val
}

function mapInvoiceRow(row: InvoiceJoinRow): InvoiceResponse {
  return {
    id: row.id,
    organizationId: row.organizationId,
    appointmentId: row.appointmentId,
    customerId: row.customerId,
    customerName: row.customers?.full_name ?? "Unknown",
    invoiceNumber: row.invoiceNumber,
    currency: row.currency,
    subtotal: Number(row.subtotal),
    taxRate: Number(row.taxRate),
    taxAmount: Number(row.taxAmount),
    discountAmount: Number(row.discountAmount),
    totalAmount: Number(row.totalAmount),
    amountPaid: Number(row.amountPaid),
    dueAt: toISOString(row.dueAt) ?? "",
    status: row.status,
    sentAt: toISOString(row.sentAt),
    paidAt: toISOString(row.paidAt),
    notes: row.notes,
    items: (row.invoice_items ?? []).map(mapInvoiceItemRow),
    createdAt: toISOString(row.createdAt) ?? "",
  }
}

function mapInvoiceItemRow(row: InvoiceItemRow): InvoiceItemResponse {
  return {
    id: row.id,
    serviceId: row.serviceId,
    description: row.description,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unitPrice),
    amount: Number(row.amount),
  }
}
