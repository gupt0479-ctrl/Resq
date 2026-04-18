/**
 * Pure webhook normalization + payload helpers (no server-only, no DB imports).
 * Keeps Vitest able to import normalization without pulling `feedback` services.
 */

/** Domain events that mutate domain rows — require `externalEventId` for dedupe + replay safety. */
export const MUTATING_INTEGRATION_EVENTS = [
  "reservation.completed",
  "reservation.cancelled",
  "reservation.rescheduled",
  "invoice.sent",
  "invoice.paid",
  "feedback.received",
] as const

export function getWebhookDispatchValidationError(
  normalizedEvent: string | null,
  data: Record<string, unknown>
): string | null {
  if (!normalizedEvent) return null

  const invoiceId = getString(data, "invoiceId", "invoice_id")
  const appointmentId = getString(data, "appointmentId", "appointment_id")

  if (normalizedEvent === "reservation.cancelled" && !appointmentId) {
    return "reservation.cancelled requires appointmentId in webhook data."
  }

  if (normalizedEvent === "reservation.rescheduled") {
    if (!appointmentId) {
      return "reservation.rescheduled requires appointmentId in webhook data."
    }
    const startsAt = getString(data, "startsAt", "starts_at", "startAt")
    const endsAt = getString(data, "endsAt", "ends_at", "endAt")
    if (!startsAt || !endsAt) {
      return "reservation.rescheduled requires startsAt and endsAt in webhook data."
    }
  }

  if (normalizedEvent === "reservation.completed" && !appointmentId) {
    return "reservation.completed requires appointmentId in webhook data."
  }

  if (normalizedEvent === "invoice.sent" && !invoiceId) {
    return "invoice.sent requires invoiceId in webhook data."
  }

  if (normalizedEvent === "invoice.paid" && !invoiceId) {
    return "invoice.paid requires invoiceId in webhook data."
  }

  if (normalizedEvent === "feedback.received") {
    const score = getNumber(data, "score", "rating", "stars")
    if (score == null || score < 1 || score > 5) {
      return "feedback.received requires numeric score between 1 and 5."
    }
  }

  return null
}

export function normalizeDomainEvent(
  provider: string,
  externalEventType?: string
): string | null {
  if (!externalEventType) return null

  const et = externalEventType.toLowerCase()

  if (
    et === "reservation.completed" ||
    et === "reservation.cancelled" ||
    et === "reservation.rescheduled" ||
    et === "invoice.sent" ||
    et === "invoice.paid" ||
    et === "feedback.received"
  ) {
    return et
  }

  if (et.includes("reservation") && et.includes("creat")) return "reservation.created"
  if (et.includes("reservation") && (et.includes("cancel") || et.includes("cancell"))) {
    return "reservation.cancelled"
  }
  if (et.includes("reservation") && et.includes("reschedul")) return "reservation.rescheduled"
  if (et.includes("reservation") && et.includes("complet")) return "reservation.completed"
  if (et.includes("invoice") && et.includes("sent")) return "invoice.sent"
  if (et.includes("payment") && (et.includes("success") || et.includes("complete"))) {
    return "invoice.paid"
  }
  if (et.includes("payment") && et.includes("fail")) return "invoice.overdue"
  if (et.includes("review") || et.includes("feedback")) return "feedback.received"

  return `${provider}.${externalEventType}`
}

export function getString(
  data: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = data[key]
    if (typeof value === "string" && value.length > 0) {
      return value
    }
  }
}

export function getNumber(
  data: Record<string, unknown>,
  ...keys: string[]
): number | undefined {
  for (const key of keys) {
    const value = data[key]
    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }
}
