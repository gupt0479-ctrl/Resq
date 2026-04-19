import { describe, it, expect } from "vitest"
import { generateMockScreenshot } from "./mock-screenshots"
import type { Screenshot } from "./portal-schemas"
import { PORTAL_RECON_FIXTURES } from "./portal-mock-data"

const ALL_STEPS: Screenshot["step"][] = [
  "login",
  "invoice_list",
  "invoice_detail",
  "payment_status",
  "message_sent",
]

const ALL_SCENARIOS = [
  "invoice_visible_unpaid",
  "invoice_visible_processing",
  "invoice_not_visible",
  "high_engagement",
  "low_engagement",
] as const

describe("generateMockScreenshot", () => {
  it("returns a base64 SVG data URI for every step", () => {
    for (const step of ALL_STEPS) {
      const uri = generateMockScreenshot(step, "invoice_visible_unpaid")
      expect(uri).toMatch(/^data:image\/svg\+xml;base64,/)
    }
  })

  it("embeds the step label in the SVG", () => {
    const uri = generateMockScreenshot("invoice_detail", "high_engagement")
    const svg = atob(uri.replace("data:image/svg+xml;base64,", ""))
    expect(svg).toContain("Invoice Detail")
  })

  it("embeds the scenario label in the SVG", () => {
    const uri = generateMockScreenshot("login", "invoice_visible_processing")
    const svg = atob(uri.replace("data:image/svg+xml;base64,", ""))
    expect(svg).toContain("Visible")
    expect(svg).toContain("Processing")
  })

  it("produces unique URIs for different steps", () => {
    const uris = ALL_STEPS.map((s) => generateMockScreenshot(s, "high_engagement"))
    const unique = new Set(uris)
    expect(unique.size).toBe(ALL_STEPS.length)
  })

  it("produces valid SVG that can be decoded", () => {
    for (const step of ALL_STEPS) {
      for (const scenario of ALL_SCENARIOS) {
        const uri = generateMockScreenshot(step, scenario)
        const b64 = uri.replace("data:image/svg+xml;base64,", "")
        const svg = atob(b64)
        expect(svg).toContain("<svg")
        expect(svg).toContain("</svg>")
      }
    }
  })
})

describe("PORTAL_RECON_FIXTURES use labeled screenshots", () => {
  it("all fixture screenshots use SVG data URIs instead of the old 1x1 PNG", () => {
    for (const scenario of ALL_SCENARIOS) {
      const fixture = PORTAL_RECON_FIXTURES[scenario]
      for (const screenshot of fixture.result.screenshots) {
        expect(screenshot.url).toMatch(/^data:image\/svg\+xml;base64,/)
        expect(screenshot.url).not.toContain("iVBORw0KGgo") // old PNG marker
      }
    }
  })

  it("each screenshot URL contains the correct step label", () => {
    const stepLabels: Record<string, string> = {
      login: "Login",
      invoice_list: "Invoice List",
      invoice_detail: "Invoice Detail",
      payment_status: "Payment Status",
      message_sent: "Message Sent",
    }
    for (const scenario of ALL_SCENARIOS) {
      const fixture = PORTAL_RECON_FIXTURES[scenario]
      for (const screenshot of fixture.result.screenshots) {
        const svg = atob(screenshot.url.replace("data:image/svg+xml;base64,", ""))
        const expected = stepLabels[screenshot.step]
        expect(svg).toContain(expected)
      }
    }
  })
})
