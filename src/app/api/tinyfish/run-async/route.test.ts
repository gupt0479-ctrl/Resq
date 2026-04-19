import { describe, it, expect, vi, beforeEach } from "vitest"
import * as fc from "fast-check"

// Mock modules before importing the route
vi.mock("@/lib/env", () => ({
  getTinyFishMode: vi.fn(() => "mock"),
  TINYFISH_API_KEY: "test-api-key",
}))

vi.mock("@/lib/tinyfish/client", () => ({
  healthCheck: vi.fn(async () => ({
    ok: false,
    mode: "misconfigured",
    details: "API key is missing.",
  })),
}))

import { POST } from "./route"
import { getTinyFishMode } from "@/lib/env"
import { healthCheck } from "@/lib/tinyfish/client"

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/tinyfish/run-async", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.mocked(getTinyFishMode).mockReturnValue("mock")
  vi.mocked(healthCheck).mockResolvedValue({
    ok: false,
    mode: "misconfigured",
    details: "API key is missing.",
  })
})

// ─── Unit tests ──────────────────────────────────────────────────────────────

describe("async run route — mock mode", () => {
  it("returns runId mock_run_001 with status PENDING and HTTP 202", async () => {
    vi.mocked(getTinyFishMode).mockReturnValue("mock")
    const res = await POST(makeRequest({ url: "https://example.com", goal: "test" }))
    expect(res.status).toBe(202)
    const body = await res.json()
    expect(body).toEqual({ runId: "mock_run_001", status: "PENDING", mode: "mock" })
  })
})

describe("async run route — misconfigured mode", () => {
  it("returns runId misconfigured_run_001 with status FAILED and HTTP 202", async () => {
    vi.mocked(getTinyFishMode).mockReturnValue("misconfigured")
    const res = await POST(makeRequest({ url: "https://example.com", goal: "test" }))
    expect(res.status).toBe(202)
    const body = await res.json()
    expect(body.runId).toBe("misconfigured_run_001")
    expect(body.status).toBe("FAILED")
    expect(body.mode).toBe("misconfigured")
    expect(typeof body.error).toBe("string")
    expect(body.error.length).toBeGreaterThan(0)
  })
})

describe("async run route — body validation", () => {
  it("returns HTTP 400 on invalid JSON", async () => {
    vi.mocked(getTinyFishMode).mockReturnValue("mock")
    const req = new Request("http://localhost/api/tinyfish/run-async", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("url and goal are required")
  })

  it("returns HTTP 400 when url or goal is missing", async () => {
    vi.mocked(getTinyFishMode).mockReturnValue("mock")
    const res = await POST(makeRequest({ url: "https://example.com" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("url and goal are required")
  })
})

// ─── Property tests ──────────────────────────────────────────────────────────

describe("Property 4: All handlers always include a mode field (async run)", () => {
  // Feature: tinyfish-sse-async-harness, Property 4: All handlers always include a mode field
  it("mode field is present and matches active mode for mock and misconfigured", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("mock" as const, "misconfigured" as const),
        async (mode) => {
          vi.mocked(getTinyFishMode).mockReturnValue(mode)
          const res = await POST(makeRequest({ url: "https://example.com", goal: "test" }))
          const body = await res.json()
          expect(body.mode).toBe(mode)
        }
      ),
      { numRuns: 100 }
    )
  }, 30_000)
})

describe("Property 6: Misconfigured mode always returns non-empty error (async run)", () => {
  // Feature: tinyfish-sse-async-harness, Property 6: Misconfigured mode always returns non-empty error
  it("error field is always a non-empty string in misconfigured mode", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          url: fc.webUrl(),
          goal: fc.string({ minLength: 1 }),
        }),
        async ({ url, goal }) => {
          vi.mocked(getTinyFishMode).mockReturnValue("misconfigured")
          const res = await POST(makeRequest({ url, goal }))
          const body = await res.json()
          expect(typeof body.error).toBe("string")
          expect(body.error.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  }, 30_000)
})
