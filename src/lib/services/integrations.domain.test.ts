import { describe, expect, it } from "vitest"
import {
  MUTATING_INTEGRATION_EVENTS,
  getWebhookDispatchValidationError,
  normalizeDomainEvent,
} from "@/lib/integrations/webhook-domain"

describe("normalizeDomainEvent", () => {
  it("returns canonical names for known strings", () => {
    expect(normalizeDomainEvent("manual", "invoice.paid")).toBe("invoice.paid")
    expect(normalizeDomainEvent("stripe", "invoice.sent")).toBe("invoice.sent")
  })

  it("prefixes unknown provider events", () => {
    expect(normalizeDomainEvent("acme", "widget.spun")).toBe("acme.widget.spun")
  })
})

describe("MUTATING_INTEGRATION_EVENTS", () => {
  it("lists webhook types that require externalEventId", () => {
    expect(MUTATING_INTEGRATION_EVENTS).toContain("invoice.paid")
    expect(MUTATING_INTEGRATION_EVENTS).toContain("invoice.sent")
  })
})

describe("normalizeDomainEvent (extended)", () => {
  it("maps payment provider strings to invoice events", () => {
    expect(normalizeDomainEvent("stripe", "payment.completed")).toBe("invoice.paid")
    expect(normalizeDomainEvent("stripe", "invoiceSent")).toBe("invoice.sent")
  })
})

describe("getWebhookDispatchValidationError", () => {
  it("requires invoiceId for invoice payment", () => {
    expect(getWebhookDispatchValidationError("invoice.paid", { amount: 207.1 })).toBe(
      "invoice.paid requires invoiceId in webhook data."
    )
  })

  it("accepts valid invoice payloads", () => {
    expect(
      getWebhookDispatchValidationError("invoice.sent", {
        invoiceId: "inv_123",
      })
    ).toBeNull()
  })
})
