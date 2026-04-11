export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "rescheduled"
  | "cancelled"
  | "no_show"

export type InvoiceStatus = "draft" | "sent" | "pending" | "paid" | "overdue" | "void"

export type WorkflowEventType =
  | "appointment_completed"
  | "invoice_generated"
  | "invoice_sent"
  | "feedback_requested"
  | "finance_updated"
  | "ai_summary_refreshed"

export type Appointment = {
  id: string
  customerName: string
  service: string
  staff: string
  startsAt: string
  durationMin: number
  status: AppointmentStatus
  price: number
}

export type Invoice = {
  id: string
  customerName: string
  items: string
  total: number
  dueAt: string
  status: InvoiceStatus
}

export type WorkflowEvent = {
  id: string
  time: string
  type: WorkflowEventType
  title: string
  detail: string
  status: "completed" | "pending" | "failed"
}

export type FinanceTransaction = {
  id: string
  type: "revenue" | "expense" | "fee" | "inventory_purchase" | "writeoff" | "refund"
  direction: "in" | "out"
  category: string
  amount: number
  occurredAt: string
  taxRelevant: boolean
}