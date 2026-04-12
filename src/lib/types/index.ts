// ============================================================
// SHARED ENUMS
// ============================================================

export type AppointmentStatus =
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type InvoiceStatus = "pending" | "paid" | "overdue";

// ============================================================
// CORE ENTITIES
// ============================================================

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  visit_count: number;
  created_at: string;
}

export interface Appointment {
  id: string;
  customer_id: string;
  customer?: Customer;
  party_size: number;
  starts_at: string;       // ISO string
  ends_at: string;         // ISO string
  status: AppointmentStatus;
  notes?: string;
  occasion?: string;       // e.g. "birthday", "anniversary"
  reminder_sent: boolean;
  follow_up_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;      // in dollars
}

export interface Invoice {
  id: string;
  appointment_id: string;
  appointment?: Appointment;
  customer_id: string;
  customer?: Customer;
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax_rate: number;        // e.g. 0.08 for 8%
  tax_amount: number;
  discount_amount: number;
  total: number;
  status: InvoiceStatus;
  due_at: string;          // ISO string
  paid_at?: string;
  reminder_count: number;
  last_reminded_at?: string;
  notes?: string;          // AI-generated summary note
  created_at: string;
  updated_at: string;
}

export interface FollowUp {
  id: string;
  appointment_id: string;
  customer_id: string;
  message: string;         // AI-generated
  sent_at?: string;
  created_at: string;
}

// ============================================================
// API REQUEST / RESPONSE TYPES
// ============================================================

// --- Appointments ---

export interface BookAppointmentRequest {
  customer_id: string;
  party_size: number;
  starts_at: string;
  ends_at: string;
  notes?: string;
  occasion?: string;
}

export interface RescheduleAppointmentRequest {
  starts_at: string;
  ends_at: string;
}

export interface ParseAppointmentRequest {
  natural_language: string;   // e.g. "move my booking to Friday after 4"
  customer_id: string;
  existing_appointment_id?: string;
}

export interface ParsedAppointmentAction {
  intent: "book" | "reschedule" | "cancel" | "query";
  starts_at?: string;         // ISO string if parsed
  ends_at?: string;
  confidence: "high" | "medium" | "low";
  clarification_needed?: string; // if confidence is low
  raw_interpretation: string; // human-readable explanation
}

// --- Follow-ups ---

export interface GenerateFollowUpRequest {
  appointment_id: string;
}

export interface GenerateFollowUpResponse {
  message: string;
  customer_name: string;
}

// --- Invoices ---

export interface CreateInvoiceRequest {
  appointment_id: string;
  line_items: InvoiceLineItem[];
  tax_rate?: number;          // defaults to 0.08
  discount_amount?: number;   // defaults to 0
  due_days?: number;          // days from now until due, defaults to 7
}

export interface UpdateInvoiceStatusRequest {
  status: InvoiceStatus;
}

export interface GenerateReminderRequest {
  invoice_id: string;
}

export interface GenerateReminderResponse {
  subject: string;
  message: string;
  reminder_number: number;
}

// ============================================================
// SERVICE RETURN TYPES
// ============================================================

export interface ServiceResult<T> {
  data?: T;
  error?: string;
}

export interface ConflictCheckResult {
  has_conflict: boolean;
  conflicting_appointments?: Appointment[];
}