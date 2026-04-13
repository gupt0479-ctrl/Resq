import { z } from "zod"
import { INVOICE_STATUS } from "@/lib/constants/enums"

export const InvoiceStatusSchema = z.enum(INVOICE_STATUS)

// ─── DB row shapes ───────────────────────────────────────────────────────

export const InvoiceRowSchema = z.object({
  id:              z.string().uuid(),
  organization_id: z.string().uuid(),
  appointment_id:  z.string().uuid().nullable(),
  customer_id:     z.string().uuid(),
  invoice_number:  z.string(),
  currency:        z.string(),
  subtotal:        z.number(),
  tax_rate:        z.number(),
  tax_amount:      z.number(),
  discount_amount: z.number(),
  total_amount:    z.number(),
  amount_paid:     z.number(),
  due_at:          z.string(),
  status:          InvoiceStatusSchema,
  sent_at:         z.string().nullable(),
  paid_at:         z.string().nullable(),
  pdf_path:        z.string().nullable(),
  notes:           z.string().nullable(),
  created_at:      z.string(),
  updated_at:      z.string(),
})

export type InvoiceRow = z.infer<typeof InvoiceRowSchema>

export const InvoiceItemRowSchema = z.object({
  id:              z.string().uuid(),
  invoice_id:      z.string().uuid(),
  organization_id: z.string().uuid(),
  service_id:      z.string().uuid().nullable(),
  description:     z.string(),
  quantity:        z.number().int(),
  unit_price:      z.number(),
  amount:          z.number(),
  created_at:      z.string(),
})

export type InvoiceItemRow = z.infer<typeof InvoiceItemRowSchema>

// ─── API response shapes (camelCase) ────────────────────────────────────

export const InvoiceItemResponseSchema = z.object({
  id:          z.string(),
  serviceId:   z.string().nullable(),
  description: z.string(),
  quantity:    z.number(),
  unitPrice:   z.number(),
  amount:      z.number(),
})

export type InvoiceItemResponse = z.infer<typeof InvoiceItemResponseSchema>

export const InvoiceResponseSchema = z.object({
  id:             z.string(),
  organizationId: z.string(),
  appointmentId:  z.string().nullable(),
  customerId:     z.string(),
  customerName:   z.string(),
  invoiceNumber:  z.string(),
  currency:       z.string(),
  subtotal:       z.number(),
  taxRate:        z.number(),
  taxAmount:      z.number(),
  discountAmount: z.number(),
  totalAmount:    z.number(),
  amountPaid:     z.number(),
  dueAt:          z.string(),
  status:         InvoiceStatusSchema,
  sentAt:         z.string().nullable(),
  paidAt:         z.string().nullable(),
  notes:          z.string().nullable(),
  items:          z.array(InvoiceItemResponseSchema),
  createdAt:      z.string(),
})

export type InvoiceResponse = z.infer<typeof InvoiceResponseSchema>

// ─── Route input schemas ─────────────────────────────────────────────────

export const MarkPaidBodySchema = z.object({
  paymentMethod: z.string().optional().default("card"),
  amountPaid:    z.number().positive().optional(),
  notes:         z.string().optional(),
})

/** Deterministic invoice creation from a completed appointment (no client line-item totals). */
export const GenerateInvoiceFromAppointmentBodySchema = z.object({
  appointmentId: z.string().uuid(),
})

export type GenerateInvoiceFromAppointmentBody = z.infer<
  typeof GenerateInvoiceFromAppointmentBodySchema
>

export const SendInvoiceBodySchema = z.object({
  notes: z.string().optional(),
})
