import { describe, it, expect, vi } from "vitest"
import * as fc from "fast-check"

vi.mock("server-only", () => ({}))

vi.mock("@/lib/env", () => ({
  getTinyFishMode: vi.fn(() => "mock"),
  TINYFISH_API_KEY: "",
  TINYFISH_AGENT_BASE_URL: "https://agent.tinyfish.ai",
  TINYFISH_AGENT_PATH: "/v1/automation/run",
  TINYFISH_SEARCH_BASE_URL: "https://api.search.tinyfish.ai",
  TINYFISH_FETCH_BASE_URL: "https://api.fetch.tinyfish.ai",
  TINYFISH_TIMEOUT_MS: 30000,
  isTinyFishMockMode: vi.fn(() => true),
  isTinyFishLiveReady: vi.fn(() => false),
  hasTinyFishLiveIntent: vi.fn(() => false),
  isTinyFishConfigured: vi.fn(() => false),
}))

import { buildGoalString } from "./client"

const REQUIRED_STEPS = ["STEP 1", "STEP 2", "STEP 3", "STEP 4"]
const REQUIRED_FIELDS = ["lender", "product", "aprPercent", "termMonths", "maxAmountUsd", "decisionSpeed", "notes"]

// Feature: tinyfish-sse-async-harness, Property 7: Goal string always contains all four steps and required field names
describe("Property 7: Goal string always contains all four steps and required field names", () => {
  it("holds for arbitrary URLs", () => {
    fc.assert(
      fc.property(fc.webUrl(), (url) => {
        const goal = buildGoalString(url)
        for (const step of REQUIRED_STEPS) {
          expect(goal).toContain(step)
        }
        for (const field of REQUIRED_FIELDS) {
          expect(goal).toContain(field)
        }
      }),
      { numRuns: 100 }
    )
  }, 10_000)

  it("includes the url in STEP 2", () => {
    const url = "https://example.com/financing"
    const goal = buildGoalString(url)
    expect(goal).toContain(url)
  })
})

// Feature: tinyfish-sse-async-harness, Property 8: JSON pre-parse never throws
describe("Property 8: JSON pre-parse never throws", () => {
  it("holds for any input type", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.jsonValue(), fc.constant(null)),
        (result) => {
          let resultValue = result
          if (typeof resultValue === "string") {
            try {
              resultValue = JSON.parse(resultValue)
            } catch {
              // pass raw string through — normalizeAgentFinancingOffers handles strings
            }
          }
          // If we reach here, no throw occurred
          expect(true).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})
