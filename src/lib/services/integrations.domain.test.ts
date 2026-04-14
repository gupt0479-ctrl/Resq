import { describe, expect, it } from "vitest"
import {
  MUTATING_INTEGRATION_EVENTS,
  getWebhookDispatchValidationError,
  normalizeDomainEvent,
} from "@/lib/integrations/webhook-domain"

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
    expect(MUTATING_INTEGRATION_EVENTS).toContain("feedback.received")
    expect(MUTATING_INTEGRATION_EVENTS).toContain("reservation.cancelled")
  })
})

describe("normalizeDomainEvent (extended)", () => {
  it("maps review-ish events to feedback.received", () => {
    expect(normalizeDomainEvent("yelp", "GoogleReviewReceived")).toBe("feedback.received")
  })

  it("maps cancellation and reschedule strings", () => {
    expect(normalizeDomainEvent("opentable", "ReservationCancelled")).toBe("reservation.cancelled")
    expect(normalizeDomainEvent("opentable", "reservation.rescheduled")).toBe("reservation.rescheduled")
  })
})

describe("getWebhookDispatchValidationError", () => {
  it("requires appointmentId for reservation completion", () => {
    expect(getWebhookDispatchValidationError("reservation.completed", {})).toBe(
      "reservation.completed requires appointmentId in webhook data."
    )
  })

  it("requires invoiceId for invoice payment", () => {
    expect(getWebhookDispatchValidationError("invoice.paid", { amount: 207.1 })).toBe(
      "invoice.paid requires invoiceId in webhook data."
    )
  })

  it("requires reschedule timestamps", () => {
    expect(
      getWebhookDispatchValidationError("reservation.rescheduled", {
        appointmentId: "appt_123",
      })
    ).toBe("reservation.rescheduled requires startsAt and endsAt in webhook data.")
  })

  it("accepts valid feedback payloads", () => {
    expect(
      getWebhookDispatchValidationError("feedback.received", {
        score: 2,
        comment: "Cold bread.",
      })
    ).toBeNull()
  })
})
