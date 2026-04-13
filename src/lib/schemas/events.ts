import { z } from "zod"
import { DOMAIN_EVENT } from "@/lib/constants/enums"

export const DomainEventNameSchema = z.enum([
  DOMAIN_EVENT.RESERVATION_CREATED,
  DOMAIN_EVENT.RESERVATION_CONFIRMED,
  DOMAIN_EVENT.RESERVATION_COMPLETED,
  DOMAIN_EVENT.INVOICE_GENERATED,
  DOMAIN_EVENT.INVOICE_SENT,
  DOMAIN_EVENT.INVOICE_PAID,
  DOMAIN_EVENT.INVOICE_OVERDUE,
  DOMAIN_EVENT.FEEDBACK_RECEIVED,
  DOMAIN_EVENT.FEEDBACK_FLAGGED,
  DOMAIN_EVENT.SUMMARY_REFRESH,
])

export type DomainEventName = z.infer<typeof DomainEventNameSchema>

export const AppointmentEventRowSchema = z.object({
  id:             z.string().uuid(),
  appointment_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  event_type:     z.string(),
  from_status:    z.string().nullable(),
  to_status:      z.string().nullable(),
  notes:          z.string().nullable(),
  metadata:       z.record(z.string(), z.any()).nullable(),
  created_at:     z.string(),
})

export type AppointmentEventRow = z.infer<typeof AppointmentEventRowSchema>
