// ── Reservation + Invoice Types ──────────────────────────────

export type ReservationStatus = "confirmed" | "completed" | "cancelled" | "no_show"
export type InvoiceStatus = "pending" | "paid" | "overdue"

export interface Customer {
  id: string
  name: string
  email: string
  phone?: string | null
  visit_count: number
  created_at: string
}

export interface Reservation {
  id: string
  customer_id: string
  customer?: Customer
  party_size: number
  starts_at: string
  ends_at: string
  status: ReservationStatus
  notes?: string | null
  occasion?: string | null
  reminder_sent: boolean
  follow_up_sent: boolean
  created_at: string
  updated_at: string
}

export interface InvoiceLineItem {
  description: string
  quantity: number
  unit_price: number
}

export interface Invoice {
  id: string
  reservation_id: string
  reservation?: Reservation
  customer_id: string
  customer?: Customer
  line_items: InvoiceLineItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  total: number
  status: InvoiceStatus
  due_at: string
  paid_at?: string | null
  reminder_count: number
  last_reminded_at?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface FollowUp {
  id: string
  reservation_id: string
  customer_id: string
  message: string
  sent_at?: string | null
  created_at: string
}

export interface ServiceResult<T> {
  data?: T
  error?: string
}

export interface BookReservationRequest {
  customer_name: string
  customer_email: string
  customer_phone?: string
  party_size?: number
  starts_at: string
  ends_at: string
  notes?: string
  occasion?: string
}

export interface RescheduleReservationRequest {
  starts_at: string
  ends_at: string
  notes?: string
  occasion?: string
  party_size?: number
}

export interface CreateInvoiceRequest {
  reservation_id: string
  line_items: InvoiceLineItem[]
  tax_rate?: number
  discount_amount?: number
  due_days?: number
}

export interface ParsedReservationAction {
  intent: "book" | "reschedule" | "cancel" | "query"
  starts_at?: string | null
  ends_at?: string | null
  confidence: "high" | "medium" | "low"
  clarification_needed?: string | null
  raw_interpretation: string
}