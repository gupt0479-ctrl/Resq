// ─── Domain types — authoritative definitions live in src/lib/constants/enums.ts
// and src/lib/schemas/. These re-exports keep existing component imports working.

export type {
  InvoiceStatus,
  FinanceTransactionType,
  FinanceDirection,
  DomainEventName,
} from "@/lib/constants/enums"

// ─── Canonical domain event strings ──────────────────────────────────────

export type WorkflowEventType =
  | "invoice.generated"
  | "invoice.sent"
  | "invoice.paid"
  | "invoice.reminder_sent"
  | "invoice.overdue"
  | "summary.refresh_requested"

// ─── UI-facing shapes (camelCase, safe to use in components) ─────────────

export type InvoiceItem = {
  id:          string
  serviceId:   string | null
  description: string
  quantity:    number
  unitPrice:   number
  amount:      number
}

export type LedgerInvoice = {
  id:             string
  organizationId: string
  customerId:     string
  customerName:   string
  invoiceNumber:  string
  currency:       string
  subtotal:       number
  taxRate:        number
  taxAmount:      number
  discountAmount: number
  totalAmount:    number
  amountPaid:     number
  dueAt:          string
  status:         import("@/lib/constants/enums").InvoiceStatus
  sentAt:         string | null
  paidAt:         string | null
  notes:          string | null
  createdAt:      string
}

export type WorkflowEvent = {
  id:     string
  time:   string
  type:   WorkflowEventType
  title:  string
  detail: string
  status: "completed" | "pending" | "failed"
}

export type FinanceTransaction = {
  id:               string
  organizationId:   string
  invoiceId:        string | null
  type:             import("@/lib/constants/enums").FinanceTransactionType
  direction:        import("@/lib/constants/enums").FinanceDirection
  category:         string
  amount:           number
  occurredAt:       string
  paymentMethod:    string | null
  taxRelevant:      boolean
  writeoffEligible: boolean
  notes:            string | null
}

export type RiskLevel = "low" | "medium" | "high"

// ─── Legacy Invoice type (used by generate-reminder.ts) ──────────────────

export interface Customer {
  id: string
  name: string
  email: string
  phone?: string | null
}

export interface InvoiceLineItem {
  description: string
  quantity: number
  unit_price: number
}

export interface Invoice {
  id: string
  customer_id: string
  customer?: Customer
  line_items: InvoiceLineItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  total: number
  status: "pending" | "paid" | "overdue"
  due_at: string
  paid_at?: string | null
  reminder_count: number
  last_reminded_at?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface ServiceResult<T> {
  data?: T
  error?: string
}
