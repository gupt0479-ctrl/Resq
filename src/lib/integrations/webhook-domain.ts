/**
 * Pure webhook normalization + payload helpers (no server-only, no DB imports).
 * Keeps Vitest able to import normalization without pulling receivables services.
 */

/** Domain events that mutate domain rows — require `externalEventId` for dedupe + replay safety. */
export const MUTATING_INTEGRATION_EVENTS = [
  "invoice.sent",
  "invoice.paid",
] as const

export function getWebhookDispatchValidationError(
  normalizedEvent: string | null,
  data: Record<string, unknown>
): string | null {
  if (!normalizedEvent) return null

  const invoiceId = getString(data, "invoiceId", "invoice_id")

  if (normalizedEvent === "invoice.sent" && !invoiceId) {
    return "invoice.sent requires invoiceId in webhook data."
  }

  if (normalizedEvent === "invoice.paid" && !invoiceId) {
    return "invoice.paid requires invoiceId in webhook data."
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
    et === "invoice.sent" ||
    et === "invoice.paid"
  ) {
    return et
  }

  if (et.includes("invoice") && et.includes("sent")) return "invoice.sent"
  if (et.includes("payment") && (et.includes("success") || et.includes("complete"))) {
    return "invoice.paid"
  }
  if (et.includes("payment") && et.includes("fail")) return "invoice.overdue"

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
