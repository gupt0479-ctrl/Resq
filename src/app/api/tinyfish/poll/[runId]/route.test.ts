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

import { GET } from "./route"
import { getTinyFishMode } from "@/lib/env"
import { healthCheck } from "@/lib/tinyfish/client"

function makeCtx(runId: string) {
  return { params: Promise.resolve({ runId }) }
}

const dummyRequest = new Request("http://localhost/api/tinyfish/poll/test-run-123")

beforeEach(() => {
  vi.mocked(getTinyFishMode).mockReturnValue("mock")
  vi.mocked(healthCheck).mockResolvedValue({
    ok: false,
    mode: "misconfigured",
    details: "API key is missing.",
  })
})

// ─── Unit tests ──────────────────────────────────────────────────────────────

describe("poll handler — mock mode", () => {
  it("returns status COMPLETED with fixture result and HTTP 200", async () => {
    vi.mocked(getTinyFishMode).mockReturnValue("mock")
    const res = await GET(dummyRequest, makeCtx("test-run-123"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("COMPLETED")
    expect(body.result).toMatchObject({ ok: true, fixture: true })
    expect(body.mode).toBe("mock")
    expect(body.runId).toBe("test-run-123")
  })
})

describe("poll handler — misconfigured mode", () => {
  it("returns status FAILED with HTTP 200", async () => {
    vi.mocked(getTinyFishMode).mockReturnValue("misconfigured")
    const res = await GET(dummyRequest, makeCtx("test-run-123"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("FAILED")
    expect(body.mode).toBe("misconfigured")
    expect(typeof body.error).toBe("string")
    expect(body.error.length).toBeGreaterThan(0)
  })
})

describe("poll handler — missing runId", () => {
  it("returns HTTP 400 when runId is empty", async () => {
    const res = await GET(dummyRequest, makeCtx(""))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("runId is required")
  })
})

// ─── Property tests ──────────────────────────────────────────────────────────

describe("Property 3: Poll response always echoes runId", () => {
  // Feature: tinyfish-sse-async-harness, Property 3: Poll response always echoes runId
  it("response.runId === runId for every input", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.constantFrom("mock" as const, "misconfigured" as const),
        async (runId, mode) => {
          vi.mocked(getTinyFishMode).mockReturnValue(mode)
          const res = await GET(dummyRequest, makeCtx(runId))
          const body = await res.json()
          expect(body.runId).toBe(runId)
        }
      ),
      { numRuns: 100 }
    )
  }, 30_000)
})

describe("Property 4: All handlers always include a mode field (poll)", () => {
  // Feature: tinyfish-sse-async-harness, Property 4: All handlers always include a mode field
  it("mode field is present and matches active mode for mock and misconfigured", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("mock" as const, "misconfigured" as const),
        async (mode) => {
          vi.mocked(getTinyFishMode).mockReturnValue(mode)
          const res = await GET(dummyRequest, makeCtx("test-run-123"))
          const body = await res.json()
          expect(body.mode).toBe(mode)
        }
      ),
      { numRuns: 100 }
    )
  }, 30_000)
})

describe("Property 6: Misconfigured mode always returns non-empty error (poll)", () => {
  // Feature: tinyfish-sse-async-harness, Property 6: Misconfigured mode always returns non-empty error
  it("error field is always a non-empty string in misconfigured mode", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (runId) => {
          vi.mocked(getTinyFishMode).mockReturnValue("misconfigured")
          const res = await GET(dummyRequest, makeCtx(runId))
          const body = await res.json()
          expect(typeof body.error).toBe("string")
          expect(body.error.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  }, 30_000)
})
