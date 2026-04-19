/**
 * Portal Reconnaissance API Route — Unit Tests
 *
 * Tests POST /api/tinyfish/portal-recon:
 *   - 400 for invalid/missing parameters
 *   - 200 for successful reconnaissance
 *   - 500 for unexpected server errors
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}))

const mockInvestigate = vi.fn()
vi.mock("@/lib/services/portal-reconnaissance", () => ({
  investigate: (...args: unknown[]) => mockInvestigate(...args),
}))

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/tinyfish/portal-recon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeRawRequest(text: string): Request {
  return new Request("http://localhost/api/tinyfish/portal-recon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: text,
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function makeMockResponse(_invoiceId: string) {
  return {
    mode: "mock" as const,
    degradedFromLive: false,
    warning: null,
    result: {
      visibility: true,
      visibilityReason: null,
      visibilityConfidence: 95,
      paymentStatus: "unpaid",
      paymentDate: null,
      paymentMethod: null,
      shouldSkipCollection: false,
      lastLoginAt: null,
      hasRecentActivity: true,
      invoiceViewCount: 3,
      invoiceViewTimestamps: [],
      engagementLevel: "high",
      activityConfidence: 90,
      messageSent: false,
      messageSentAt: null,
      messageFailureReason: null,
      screenshots: [],
      portalUrl: "https://customer-portal.example.com",
      tinyfishRunId: null,
      authFailed: false,
      botDetected: false,
      parsingFailed: false,
    },
  }
}

// ─── Import route handler after mocks ──────────────────────────────────────

import { POST } from "./route"

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("POST /api/tinyfish/portal-recon", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── 400: Invalid request parameters (Req 9.6) ─────────────────────────

  describe("returns 400 for invalid request parameters", () => {
    it("returns 400 when body is not valid JSON", async () => {
      const req = makeRawRequest("not json{{{")
      const res = await POST(req)
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toMatch(/Invalid JSON/i)
    })

    it("returns 400 when invoiceId is missing", async () => {
      const req = makeRequest({})
      const res = await POST(req)
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })

    it("returns 400 when invoiceId is empty string", async () => {
      const req = makeRequest({ invoiceId: "" })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })

    it("returns 400 when body is empty", async () => {
      const req = makeRawRequest("")
      const res = await POST(req)
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })
  })

  // ── 200: Successful reconnaissance (Req 9.3, 9.4, 9.5) ───────────────

  describe("returns 200 for successful reconnaissance", () => {
    it("returns 200 with typed response for valid invoiceId", async () => {
      const invoiceId = "inv-123"
      const mockResp = makeMockResponse(invoiceId)
      mockInvestigate.mockResolvedValueOnce(mockResp)

      const req = makeRequest({ invoiceId })
      const res = await POST(req)

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.mode).toBe("mock")
      expect(json.degradedFromLive).toBe(false)
      expect(json.warning).toBeNull()
      expect(json.result).toBeDefined()
      expect(json.result.visibility).toBe(true)
      expect(json.result.paymentStatus).toBe("unpaid")
    })

    it("passes invoiceId and customerId to investigate()", async () => {
      const invoiceId = "inv-456"
      const customerId = "cust-789"
      mockInvestigate.mockResolvedValueOnce(makeMockResponse(invoiceId))

      const req = makeRequest({ invoiceId, customerId })
      await POST(req)

      expect(mockInvestigate).toHaveBeenCalledWith({
        invoiceId,
        customerId,
      })
    })

    it("passes only invoiceId when customerId is omitted", async () => {
      const invoiceId = "inv-solo"
      mockInvestigate.mockResolvedValueOnce(makeMockResponse(invoiceId))

      const req = makeRequest({ invoiceId })
      await POST(req)

      expect(mockInvestigate).toHaveBeenCalledWith({
        invoiceId,
        customerId: undefined,
      })
    })

    it("returns 200 even when invoice is not found (visibility: false)", async () => {
      const invoiceId = "inv-missing"
      const resp = makeMockResponse(invoiceId)
      resp.result.visibility = false
      resp.result.visibilityReason = "not in customer view"
      mockInvestigate.mockResolvedValueOnce(resp)

      const req = makeRequest({ invoiceId })
      const res = await POST(req)

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.result.visibility).toBe(false)
    })

    it("response includes mode, degradedFromLive, warning, and result fields", async () => {
      const invoiceId = "inv-fields"
      const resp = makeMockResponse(invoiceId)
      resp.mode = "live"
      resp.degradedFromLive = true
      resp.warning = "Degraded from live"
      mockInvestigate.mockResolvedValueOnce(resp)

      const req = makeRequest({ invoiceId })
      const res = await POST(req)

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toHaveProperty("mode", "live")
      expect(json).toHaveProperty("degradedFromLive", true)
      expect(json).toHaveProperty("warning", "Degraded from live")
      expect(json).toHaveProperty("result")
    })
  })

  // ── 500: Unexpected server errors (Req 9.7) ───────────────────────────

  describe("returns 500 for unexpected server errors", () => {
    it("returns 500 when investigate() throws", async () => {
      mockInvestigate.mockRejectedValueOnce(new Error("Database connection lost"))

      const req = makeRequest({ invoiceId: "inv-err" })
      const res = await POST(req)

      expect(res.status).toBe(500)
      const json = await res.json()
      expect(json.error).toMatch(/Database connection lost/)
    })

    it("returns 500 with generic message for non-Error throws", async () => {
      mockInvestigate.mockRejectedValueOnce("string error")

      const req = makeRequest({ invoiceId: "inv-err2" })
      const res = await POST(req)

      expect(res.status).toBe(500)
      const json = await res.json()
      expect(json.error).toMatch(/Unexpected server error/)
    })
  })
})
