import { describe, expect, it } from "vitest"
import { MUTATING_INTEGRATION_EVENTS, normalizeDomainEvent } from "@/lib/services/integrations"

describe("normalizeDomainEvent", () => {
  it("returns canonical names for known strings", () => {
    expect(normalizeDomainEvent("manual", "invoice.paid")).toBe("invoice.paid")
    expect(normalizeDomainEvent("square", "ReservationCompleted")).toBe("reservation.completed")
  })

  it("prefixes unknown provider events", () => {
    expect(normalizeDomainEvent("acme", "widget.spun")).toBe("acme.widget.spun")
  })
})

describe("MUTATING_INTEGRATION_EVENTS", () => {
  it("lists webhook types that require externalEventId", () => {
    expect(MUTATING_INTEGRATION_EVENTS).toContain("invoice.paid")
    expect(MUTATING_INTEGRATION_EVENTS).toContain("invoice.sent")
    expect(MUTATING_INTEGRATION_EVENTS).toContain("reservation.completed")
  })
})
