import { DEFAULT_TAX_RATE, DEFAULT_DUE_DAYS } from "@/lib/constants/enums"

export interface InvoiceLineInput {
  serviceId:   string | null
  description: string
  quantity:    number
  unitPrice:   number
}

export interface InvoiceTotals {
  subtotal:        number
  taxRate:         number
  taxAmount:       number
  discountAmount:  number
  totalAmount:     number
  dueAt:           Date
}

/**
 * Compute invoice totals from line items.
 * This is the single deterministic source — AI must not override these values.
 */
export function computeInvoiceTotals(
  lines: InvoiceLineInput[],
  opts: {
    taxRate?:        number
    discountAmount?: number
    dueDays?:        number
    now?:            Date
  } = {}
): InvoiceTotals {
  const taxRate       = opts.taxRate       ?? DEFAULT_TAX_RATE
  const discountAmount = opts.discountAmount ?? 0
  const dueDays       = opts.dueDays       ?? DEFAULT_DUE_DAYS
  const now           = opts.now           ?? new Date()

  const subtotal = round2(
    lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
  )
  const taxableBase = Math.max(0, subtotal - discountAmount)
  const taxAmount   = round2(taxableBase * taxRate)
  const totalAmount = round2(taxableBase + taxAmount)

  const dueAt = new Date(now)
  dueAt.setDate(dueAt.getDate() + dueDays)
  dueAt.setHours(23, 59, 59, 0)

  return {
    subtotal,
    taxRate,
    taxAmount,
    discountAmount: round2(discountAmount),
    totalAmount,
    dueAt,
  }
}

/**
 * Build invoice line items from a service catalog entry and a cover count.
 * This is how a completed reservation produces deterministic invoice lines.
 */
export function buildServiceLines(
  service: { id: string; name: string; price_per_person: number },
  covers: number
): InvoiceLineInput[] {
  return [
    {
      serviceId:   service.id,
      description: `${service.name} × ${covers} guest${covers === 1 ? "" : "s"}`,
      quantity:    covers,
      unitPrice:   service.price_per_person,
    },
  ]
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Generate a human-readable invoice number for a given org.
 * ET-YYYY-NNNN where NNNN increments from the count of existing invoices this year.
 */
export function generateInvoiceNumber(existingCountThisYear: number): string {
  const year = new Date().getFullYear()
  const seq  = String(existingCountThisYear + 1).padStart(4, "0")
  return `ET-${year}-${seq}`
}
