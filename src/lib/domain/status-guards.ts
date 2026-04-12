import type { AppointmentStatus } from "@/lib/constants/enums"
import type { InvoiceStatus } from "@/lib/constants/enums"

// ─── Appointment transition guards ───────────────────────────────────────

const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled:   ["confirmed", "cancelled", "no_show"],
  confirmed:   ["in_progress", "rescheduled", "cancelled", "no_show"],
  in_progress: ["completed", "cancelled"],
  completed:   [],
  rescheduled: ["scheduled", "confirmed", "cancelled"],
  cancelled:   [],
  no_show:     [],
}

export function canTransitionAppointment(
  from: AppointmentStatus,
  to: AppointmentStatus
): boolean {
  return APPOINTMENT_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * Completes an appointment regardless of whether it's confirmed or in_progress.
 * Returns true if the transition is valid.
 */
export function canCompleteAppointment(status: AppointmentStatus): boolean {
  return (
    status === "confirmed" ||
    status === "in_progress" ||
    status === "scheduled"   // allow completing a scheduled reservation directly for demo
  )
}

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
