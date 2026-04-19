import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("@/lib/env", () => ({
  getTinyFishMode: vi.fn(() => "live"),
  TINYFISH_API_KEY: "test-api-key",
}))

vi.mock("@/lib/tinyfish/client", () => ({
  healthCheck: vi.fn(async () => ({ ok: true, mode: "live", details: "live" })),
}))

import { POST as ssePost } from "./run-sse/route"
import { POST as asyncPost } from "./run-async/route"
import { GET as pollGet } from "./poll/[runId]/route"
import { getTinyFishMode } from "@/lib/env"

function makeRequest(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.mocked(getTinyFishMode).mockReturnValue("live")
})

// ─── 6.1 Live SSE proxy passthrough ─────────────────────────────────────────

describe("6.1 Live SSE proxy passthrough", () => {
  it("prepends a live MODE event and preserves upstream bytes unchanged after it", async () => {
    const upstreamBytes = `data: {"type":"STEP","index":1}\n\ndata: {"type":"DONE"}\n\n`
    const enc = new TextEncoder()
    const encoded = enc.encode(upstreamBytes)

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoded)
        controller.close()
      },
    })

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(stream, { status: 200 })
    )

    try {
      const res = await ssePost(makeRequest("/api/tinyfish/run-sse", { url: "https://example.com", goal: "test" }))
      const text = await res.text()
      expect(text.startsWith(`data: {"type":"MODE","mode":"live"}\n\n`)).toBe(true)
      expect(text.endsWith(upstreamBytes)).toBe(true)
    } finally {
      fetchSpy.mockRestore()
    }
  })
})

// ─── 6.2 Live async run reads run_id ────────────────────────────────────────

describe("6.2 Live async run reads run_id", () => {
  it("returns runId: abc123 from upstream run_id", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ run_id: "abc123" }, { status: 200 })
    )

    try {
      const res = await asyncPost(makeRequest("/api/tinyfish/run-async", { url: "https://example.com", goal: "test" }))
      const body = await res.json()
      expect(body.runId).toBe("abc123")
      expect(body.status).toBe("PENDING")
      expect(body.mode).toBe("live")
    } finally {
      fetchSpy.mockRestore()
    }
  })
})

describe("6.2b Live async run fails clearly when upstream omits run_id", () => {
  it("returns HTTP 502 with status FAILED", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ ok: true }, { status: 200 })
    )

    try {
      const res = await asyncPost(makeRequest("/api/tinyfish/run-async", { url: "https://example.com", goal: "test" }))
      expect(res.status).toBe(502)
      const body = await res.json()
      expect(body.status).toBe("FAILED")
      expect(body.error).toContain("missing run_id")
    } finally {
      fetchSpy.mockRestore()
    }
  })
})

// ─── 6.3 Live poll forwards upstream shape ───────────────────────────────────

describe("6.3 Live poll forwards upstream shape", () => {
  it("returns status COMPLETED and result.foo === bar", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ status: "COMPLETED", result: { foo: "bar" } }, { status: 200 })
    )

    try {
      const req = new Request("http://localhost/api/tinyfish/poll/test-run-123")
      const ctx = { params: Promise.resolve({ runId: "test-run-123" }) }
      const res = await pollGet(req, ctx)
      const body = await res.json()
      expect(body.status).toBe("COMPLETED")
      expect(body.result.foo).toBe("bar")
      expect(body.mode).toBe("live")
    } finally {
      fetchSpy.mockRestore()
    }
  })
})

describe("6.3b Live poll defaults status to UNKNOWN when upstream omits it", () => {
  it("returns status UNKNOWN and preserves raw payload", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ result: { foo: "bar" } }, { status: 200 })
    )

    try {
      const req = new Request("http://localhost/api/tinyfish/poll/test-run-123")
      const ctx = { params: Promise.resolve({ runId: "test-run-123" }) }
      const res = await pollGet(req, ctx)
      const body = await res.json()
      expect(body.status).toBe("UNKNOWN")
      expect(body.result.foo).toBe("bar")
      expect(body.raw.result.foo).toBe("bar")
    } finally {
      fetchSpy.mockRestore()
    }
  })
})

// ─── 6.4 Live poll upstream non-2xx returns HTTP 502 ────────────────────────

describe("6.4 Live poll upstream non-2xx returns HTTP 502", () => {
  it("returns HTTP 502 with status FAILED when upstream returns 500", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Internal Server Error", { status: 500 })
    )

    try {
      const req = new Request("http://localhost/api/tinyfish/poll/test-run-123")
      const ctx = { params: Promise.resolve({ runId: "test-run-123" }) }
      const res = await pollGet(req, ctx)
      expect(res.status).toBe(502)
      const body = await res.json()
      expect(body.status).toBe("FAILED")
    } finally {
      fetchSpy.mockRestore()
    }
  })
})
