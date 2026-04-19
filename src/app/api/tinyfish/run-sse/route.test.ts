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

// Helper: read a Response body as text
async function bodyText(response: Response): Promise<string> {
  return response.text()
}

// Helper: parse SSE events from a body string
function parseSseEvents(body: string): Array<Record<string, unknown>> {
  return body
    .split("\n\n")
    .filter((chunk) => chunk.trim().startsWith("data:"))
    .map((chunk) => {
      const line = chunk.trim().replace(/^data:\s*/, "")
      return JSON.parse(line)
    })
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/tinyfish/run-sse", {
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

// ─── Unit tests ─────────────────────────────────────────────────────────────

describe("SSE route — mock mode", () => {
  it("emits MODE → STEP → STEP → DONE in order", async () => {
    vi.mocked(getTinyFishMode).mockReturnValue("mock")
    const res = await POST(makeRequest({ url: "https://example.com", goal: "test" }))
    const text = await bodyText(res)
    const events = parseSseEvents(text)

    expect(events).toHaveLength(4)
    expect(events[0]).toMatchObject({ type: "MODE", mode: "mock" })
    expect(events[1]).toMatchObject({ type: "STEP", index: 1, label: "mock_start" })
    expect(events[2]).toMatchObject({ type: "STEP", index: 2, label: "mock_extract" })
    expect(events[3]).toMatchObject({ type: "DONE" })
  }, 10_000)

  it("carries correct SSE headers", async () => {
    vi.mocked(getTinyFishMode).mockReturnValue("mock")
    const res = await POST(makeRequest({ url: "https://example.com", goal: "test" }))
    expect(res.headers.get("Content-Type")).toBe("text/event-stream")
    expect(res.headers.get("Cache-Control")).toBe("no-cache")
  }, 10_000)
})

describe("SSE route — misconfigured mode", () => {
  it("emits exactly one ERROR event", async () => {
    vi.mocked(getTinyFishMode).mockReturnValue("misconfigured")
    const res = await POST(makeRequest({ url: "https://example.com", goal: "test" }))
    const text = await bodyText(res)
    const events = parseSseEvents(text)

    const errorEvents = events.filter((e) => e.type === "ERROR")
    expect(errorEvents).toHaveLength(1)
    expect(typeof errorEvents[0].error).toBe("string")
    expect((errorEvents[0].error as string).length).toBeGreaterThan(0)
  })

  it("carries correct SSE headers", async () => {
    vi.mocked(getTinyFishMode).mockReturnValue("misconfigured")
    const res = await POST(makeRequest({ url: "https://example.com", goal: "test" }))
    expect(res.headers.get("Content-Type")).toBe("text/event-stream")
    expect(res.headers.get("Cache-Control")).toBe("no-cache")
  })
})

describe("SSE route — body validation", () => {
  it("returns error stream on invalid JSON", async () => {
    vi.mocked(getTinyFishMode).mockReturnValue("mock")
    const req = new Request("http://localhost/api/tinyfish/run-sse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    })
    const res = await POST(req)
    expect(res.headers.get("Content-Type")).toBe("text/event-stream")
    const text = await bodyText(res)
    const events = parseSseEvents(text)
    const errorEvent = events.find((e) => e.type === "ERROR")
    expect(errorEvent).toBeDefined()
    expect(errorEvent?.error).toContain("Invalid JSON body")
  })

  it("returns error stream when url or goal is missing", async () => {
    vi.mocked(getTinyFishMode).mockReturnValue("mock")
    const res = await POST(makeRequest({ url: "https://example.com" }))
    expect(res.headers.get("Content-Type")).toBe("text/event-stream")
    const text = await bodyText(res)
    const events = parseSseEvents(text)
    const errorEvent = events.find((e) => e.type === "ERROR")
    expect(errorEvent).toBeDefined()
    expect(errorEvent?.error).toContain("url and goal are required")
  })
})

// ─── Property tests ──────────────────────────────────────────────────────────

describe("Property 1: SSE response headers are always correct", () => {
  // Feature: tinyfish-sse-async-harness, Property 1: SSE response headers are always correct
  it("Content-Type and Cache-Control are always set for mock and misconfigured modes", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("mock" as const, "misconfigured" as const),
        async (mode) => {
          vi.mocked(getTinyFishMode).mockReturnValue(mode)
          const res = await POST(makeRequest({ url: "https://example.com", goal: "test" }))
          expect(res.headers.get("Content-Type")).toBe("text/event-stream")
          expect(res.headers.get("Cache-Control")).toBe("no-cache")
        }
      ),
      { numRuns: 100 }
    )
  }, 30_000)
})

describe("Property 5: Mock mode never makes outbound network calls", () => {
  // Feature: tinyfish-sse-async-harness, Property 5: Mock mode never makes outbound network calls
  it("fetch is never called when mode is mock", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          url: fc.webUrl(),
          goal: fc.string({ minLength: 1 }),
        }),
        async ({ url, goal }) => {
          fetchSpy.mockClear()
          vi.mocked(getTinyFishMode).mockReturnValue("mock")
          await POST(makeRequest({ url, goal }))
          expect(fetchSpy).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )

    fetchSpy.mockRestore()
  }, 30_000)
})
