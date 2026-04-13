import { z } from "zod"
import { APPOINTMENT_STATUS } from "@/lib/constants/enums"

export const AppointmentStatusSchema = z.enum(APPOINTMENT_STATUS)

// ─── DB row shape (snake_case — mirrors Postgres schema) ─────────────────

export const AppointmentRowSchema = z.object({
  id:               z.string().uuid(),
  organization_id:  z.string().uuid(),
  customer_id:      z.string().uuid(),
  staff_id:         z.string().uuid().nullable(),
  service_id:       z.string().uuid(),
  covers:           z.number().int().min(1),
  starts_at:        z.string(),
  ends_at:          z.string(),
  status:           AppointmentStatusSchema,
  booking_source:   z.string().nullable(),
  confirmation_sent_at: z.string().nullable(),
  reminder_sent_at: z.string().nullable(),
  cancellation_reason: z.string().nullable(),
  notes:            z.string().nullable(),
  created_at:       z.string(),
  updated_at:       z.string(),
})

export type AppointmentRow = z.infer<typeof AppointmentRowSchema>

// ─── API response shape (camelCase) ─────────────────────────────────────

export const AppointmentResponseSchema = z.object({
  id:              z.string(),
  organizationId:  z.string(),
  customerId:      z.string(),
  customerName:    z.string(),
  staffId:         z.string().nullable(),
  staffName:       z.string().nullable(),
  serviceId:       z.string(),
  serviceName:     z.string(),
  covers:          z.number(),
  startsAt:        z.string(),
  endsAt:          z.string(),
  status:          AppointmentStatusSchema,
  bookingSource:   z.string().nullable(),
  notes:           z.string().nullable(),
  createdAt:       z.string(),
  occasion:        z.string().nullable().default(null),
  followUpSent:    z.boolean().default(false),
})

export type AppointmentResponse = z.infer<typeof AppointmentResponseSchema>

// ─── Complete appointment request ────────────────────────────────────────

export const CompleteAppointmentBodySchema = z.object({
  notes: z.string().optional(),
})

// ─── Create booking request ──────────────────────────────────────────────

export const CreateBookingBodySchema = z.object({
  customer_name:  z.string().min(1),
  customer_email: z.string().email(),
  customer_phone: z.string().optional(),
  party_size:     z.number().int().min(1).max(50).default(2),
  starts_at:      z.string(),
  ends_at:        z.string().optional(),
  occasion:       z.string().optional(),
  notes:         z.string().optional(),
})

export type CreateBookingBody = z.infer<typeof CreateBookingBodySchema>

// ─── Reschedule request ──────────────────────────────────────────────────

export const RescheduleBodySchema = z.object({
  startsAt: z.string(),
  endsAt:   z.string(),
})
