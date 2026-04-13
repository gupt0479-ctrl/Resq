import { describe, expect, it } from "vitest"
import { normalizeWebhookPayload } from "@/lib/schemas/integrations"

describe("normalizeWebhookPayload", () => {
  it("maps snake_case envelope fields", () => {
    const out = normalizeWebhookPayload({
      external_event_id: "evt_1",
      event_type:        "invoice.paid",
      payload:           { invoice_id: "inv_1", amount: 100 },
    })
    expect(out.externalEventId).toBe("evt_1")
    expect(out.eventType).toBe("invoice.paid")
    expect(out.data).toEqual({ invoice_id: "inv_1", amount: 100 })
  })

  it("defaults data to empty object", () => {
    const out = normalizeWebhookPayload({ event_type: "ping" })
    expect(out.data).toEqual({})
  })
})
