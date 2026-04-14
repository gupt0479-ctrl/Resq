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
