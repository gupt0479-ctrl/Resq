import type { InvoiceStatus } from "@/lib/constants/enums"

// ─── Invoice transition guards ────────────────────────────────────────────

const INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft:   ["sent", "void"],
  sent:    ["pending", "paid", "overdue", "void"],
  pending: ["paid", "overdue", "void"],
  paid:    [],
  overdue: ["paid", "void"],
  void:    [],
}

export function canTransitionInvoice(
  from: InvoiceStatus,
  to: InvoiceStatus
): boolean {
  return INVOICE_TRANSITIONS[from]?.includes(to) ?? false
}

export function canSendInvoice(status: InvoiceStatus): boolean {
  return status === "draft"
}

export function canMarkInvoicePaid(status: InvoiceStatus): boolean {
  return status === "sent" || status === "pending" || status === "overdue"
}

export function canVoidInvoice(status: InvoiceStatus): boolean {
  return status !== "paid" && status !== "void"
}
