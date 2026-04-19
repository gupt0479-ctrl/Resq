// Centralised enum / constant layer — map DB string authority into UI-friendly values.
// DB enums (text + CHECK constraints) and Zod enums in src/lib/schemas/ are the truth;
// this file provides display labels and helper maps for the frontend.

export const APPOINTMENT_STATUS = [
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "rescheduled",
  "cancelled",
  "no_show",
] as const

export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[number]

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled:   "Scheduled",
  confirmed:   "Confirmed",
  in_progress: "In Progress",
  completed:   "Completed",
  rescheduled: "Rescheduled",
  cancelled:   "Cancelled",
  no_show:     "No-show",
}

export const INVOICE_STATUS = [
  "draft",
  "sent",
  "pending",
  "paid",
  "overdue",
  "void",
] as const

export type InvoiceStatus = (typeof INVOICE_STATUS)[number]

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft:   "Draft",
  sent:    "Sent",
  pending: "Pending",
  paid:    "Paid",
  overdue: "Overdue",
  void:    "Void",
}

export const FINANCE_TRANSACTION_TYPE = [
  "revenue",
  "expense",
  "refund",
  "fee",
  "tax_payment",
  "inventory_purchase",
  "writeoff",
] as const

export type FinanceTransactionType = (typeof FINANCE_TRANSACTION_TYPE)[number]

export const FINANCE_TRANSACTION_TYPE_LABEL: Record<FinanceTransactionType, string> = {
  revenue:             "Revenue",
  expense:             "Expense",
  refund:              "Refund",
  fee:                 "Fee",
  tax_payment:         "Tax Payment",
  inventory_purchase:  "Inventory Purchase",
  writeoff:            "Write-off",
}

export const FINANCE_DIRECTION = ["in", "out"] as const
export type FinanceDirection = (typeof FINANCE_DIRECTION)[number]

export const AI_ACTION_STATUS = ["pending", "executed", "failed"] as const
export type AiActionStatus = (typeof AI_ACTION_STATUS)[number]

export const AI_ACTION_TYPE = [
  // ── existing ──────────────────────────────────────────────────────────────
  "customer_service.analyze_review",
  // ── cashflow recovery ─────────────────────────────────────────────────────
  "receivable_risk_detected",
  "customer_followup_sent",
  "customer_followup_drafted",
  "payment_plan_suggested",
  "financing_options_scouted",
  "financing_option_recommended",
  "vendor_quote_compared",
  "vendor_cost_spike_flagged",
  "insurance_renewal_flagged",
  "dispute_clarification_sent",
  "rescue_case_opened",
  "rescue_case_resolved",
  "external_portal_checked",
  "invoice_status_verified",
  "portal_reconnaissance",
  "portal_reconnaissance_error",
] as const
export type AiActionType = (typeof AI_ACTION_TYPE)[number]

export const CONNECTOR_STATUS = ["connected", "error", "disabled"] as const
export type ConnectorStatus = (typeof CONNECTOR_STATUS)[number]

export const CONNECTOR_STATUS_LABEL: Record<ConnectorStatus, string> = {
  connected: "Connected",
  error:     "Error",
  disabled:  "Not Connected",
}

export const PROCESSING_STATUS = ["pending", "processed", "failed", "skipped"] as const
export type ProcessingStatus = (typeof PROCESSING_STATUS)[number]

// ─── Domain event strings — canonical names per restaurant-core-demo.md ───

export const FEEDBACK_SOURCE = ["internal", "google", "yelp", "opentable", "manual"] as const
export type FeedbackSource = (typeof FEEDBACK_SOURCE)[number]

export const FEEDBACK_FOLLOW_UP_STATUS = [
  "none",
  "thankyou_sent",
  "callback_needed",
  "resolved",
] as const
export type FeedbackFollowUpStatus = (typeof FEEDBACK_FOLLOW_UP_STATUS)[number]

export const FEEDBACK_TOPIC = [
  "food_quality",
  "service_speed",
  "staff_attitude",
  "noise_level",
  "wait_time",
  "allergy_safety",
  "value",
  "ambiance",
  "cleanliness",
] as const
export type FeedbackTopic = (typeof FEEDBACK_TOPIC)[number]

export const FOLLOW_UP_ACTION_STATUS = ["pending", "approved", "sent", "dismissed"] as const
export type FollowUpActionStatus = (typeof FOLLOW_UP_ACTION_STATUS)[number]

export const DOMAIN_EVENT = {
  RESERVATION_CREATED:    "reservation.created",
  RESERVATION_CONFIRMED:  "reservation.confirmed",
  RESERVATION_COMPLETED:  "reservation.completed",
  INVOICE_GENERATED:      "invoice.generated",
  INVOICE_SENT:           "invoice.sent",
  INVOICE_PAID:           "invoice.paid",
  INVOICE_REMINDER_SENT:  "invoice.reminder_sent",
  INVOICE_OVERDUE:        "invoice.overdue",
  FEEDBACK_RECEIVED:      "feedback.received",
  FEEDBACK_FLAGGED:       "feedback.flagged",
  SUMMARY_REFRESH:        "summary.refresh_requested",
} as const

export type DomainEventName = (typeof DOMAIN_EVENT)[keyof typeof DOMAIN_EVENT]

// ─── Finance service catalog defaults ────────────────────────────────────

export const DEFAULT_TAX_RATE = 0.09
export const DEFAULT_DUE_DAYS = 14 // invoice due N days after generation
