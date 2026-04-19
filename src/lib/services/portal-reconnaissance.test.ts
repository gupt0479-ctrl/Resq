/**
 * Portal Reconnaissance Service — Unit Tests
 *
 * Tests three-mode orchestration: mock, misconfigured, and live,
 * plus graceful degradation from live to mock on errors.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ─── Mocks ─────────────────────────────────────────────────────────────────

// Mock "server-only" so it doesn't throw in test env
vi.mock("server-only", () => ({}))

// Mock env module
const mockGetPortalReconMode = vi.fn<() => "mock" | "misconfigured" | "live">()
const mockIsSupabaseConfigured = vi.fn<() => boolean>()
vi.mock("@/lib/env", () => ({
  getPortalReconMode: () => mockGetPortalReconMode(),
  isDatabaseConfigured: () => mockIsSupabaseConfigured(),
  DEMO_ORG_ID: "00000000-0000-0000-0000-000000000001",
}))

// Mock portal-mock-data
const mockGetMockPortalRecon = vi.fn()
const mockSelectScenarioByInvoiceId = vi.fn()
vi.mock("@/lib/tinyfish/portal-mock-data", () => ({
  getMockPortalRecon: (...args: unknown[]) => mockGetMockPortalRecon(...args),
  selectScenarioByInvoiceId: (...args: unknown[]) => mockSelectScenarioByInvoiceId(...args),
}))

// Mock TinyFish client
const mockRunPortalLogin = vi.fn()
vi.mock("@/lib/tinyfish/client", () => ({
  runPortalLogin: (...args: unknown[]) => mockRunPortalLogin(...args),
  TinyFishError: class TinyFishError extends Error {
    readonly kind: string
    readonly status?: number
    constructor(kind: string, message: string, status?: number) {
      super(message)
      this.name = "TinyFishError"
      this.kind = kind
      this.status = status
    }
  },
}))

// Mock portal-html-parser (not used directly in mock/misconfigured, but imported)
vi.mock("@/lib/services/portal-html-parser", () => ({
  parsePortalHtml: vi.fn(() => ({
    invoices: [],
    customerActivity: { lastLoginAt: null, viewCount: null, viewTimestamps: [] },
    confidence: 0,
    parsingErrors: [],
  })),
}))

// Mock Supabase server client (dynamic import in audit logging)
const mockSupabaseClient = {}
vi.mock("@/lib/db/supabase-server", () => ({
  createServerSupabaseClient: () => mockSupabaseClient,
}))

// Mock ai-actions (dynamic import in audit logging)
const mockRecordAiAction = vi.fn<() => Promise<string>>()
vi.mock("@/lib/services/ai-actions", () => ({
  recordAiAction: (...args: unknown[]) => mockRecordAiAction(...args),
}))

import { investigate } from "./portal-reconnaissance"
import type { PortalReconnaissanceResponse } from "@/lib/tinyfish/portal-schemas"

// ─── Fixtures ──────────────────────────────────────────────────────────────

function makeMockResponse(invoiceId: string): PortalReconnaissanceResponse {
  return {
    mode: "mock",
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
      lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      hasRecentActivity: true,
      invoiceViewCount: 3,
      invoiceViewTimestamps: [],
      engagementLevel: "high",
      activityConfidence: 90,
      messageSent: false,
      messageSentAt: null,
      messageFailureReason: null,
      screenshots: [
        { step: "login", url: "data:image/png;base64,abc", timestamp: "2026-04-11T18:00:00.000Z", invoiceId },
      ],
      portalUrl: "https://customer-portal.example.com",
      tinyfishRunId: null,
      authFailed: false,
      botDetected: false,
      parsingFailed: false,
    },
  }
}

function makeLiveLoginResult() {
  return {
    mode: "live" as const,
    degradedFromLive: false,
    warning: null,
    status: "COMPLETED" as const,
    result: {
      authenticated: true,
      invoiceFound: true,
      invoiceData: {
        visibility: true,
        paymentStatus: "unpaid",
        paymentDate: null,
        paymentMethod: null,
      },
      activityData: {
        lastLoginAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        invoiceViewCount: 4,
        invoiceViewTimestamps: [
          new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        ],
      },
      messageSent: false,
      screenshots: [
        { step: "login", data: "data:image/png;base64,live1" },
        { step: "invoice_list", data: "data:image/png;base64,live2" },
      ],
    },
    steps: [
      { index: 0, label: "portal_login", observation: "Authenticated.", durationMs: 120 },
    ],
    tinyfishRunId: "run_abc123",
  }
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("Portal Reconnaissance Service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectScenarioByInvoiceId.mockReturnValue("invoice_visible_unpaid")
    mockIsSupabaseConfigured.mockReturnValue(false) // default: no audit logging
    mockRecordAiAction.mockResolvedValue("action-id-123")
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── Mock Mode ──

  describe("mock mode", () => {
    beforeEach(() => {
      mockGetPortalReconMode.mockReturnValue("mock")
    })

    it("returns fixture data without network calls", async () => {
      const mockResp = makeMockResponse("inv-001")
      mockGetMockPortalRecon.mockReturnValue(mockResp)

      const result = await investigate({ invoiceId: "inv-001" })

      expect(result.mode).toBe("mock")
      expect(result.degradedFromLive).toBe(false)
      expect(result.warning).toBeNull()
      expect(result.result.visibility).toBe(true)
      expect(mockRunPortalLogin).not.toHaveBeenCalled()
    })

    it("completes within 500ms", async () => {
      mockGetMockPortalRecon.mockReturnValue(makeMockResponse("inv-002"))

      const start = Date.now()
      await investigate({ invoiceId: "inv-002" })
      const elapsed = Date.now() - start

      expect(elapsed).toBeLessThan(500)
    })

    it("uses scenario from options when provided", async () => {
      mockGetMockPortalRecon.mockReturnValue(makeMockResponse("inv-003"))

      await investigate({ invoiceId: "inv-003", scenario: "high_engagement" })

      expect(mockGetMockPortalRecon).toHaveBeenCalledWith("high_engagement", "inv-003")
      expect(mockSelectScenarioByInvoiceId).not.toHaveBeenCalled()
    })

    it("selects scenario by invoice ID when no scenario provided", async () => {
      mockGetMockPortalRecon.mockReturnValue(makeMockResponse("inv-004"))

      await investigate({ invoiceId: "inv-004" })

      expect(mockSelectScenarioByInvoiceId).toHaveBeenCalledWith("inv-004")
      expect(mockGetMockPortalRecon).toHaveBeenCalledWith("invoice_visible_unpaid", "inv-004")
    })
  })

  // ── Misconfigured Mode ──

  describe("misconfigured mode", () => {
    beforeEach(() => {
      mockGetPortalReconMode.mockReturnValue("misconfigured")
    })

    it("returns mock data with warning and mode=misconfigured", async () => {
      const mockResp = makeMockResponse("inv-010")
      mockGetMockPortalRecon.mockReturnValue(mockResp)

      const result = await investigate({ invoiceId: "inv-010" })

      expect(result.mode).toBe("misconfigured")
      expect(result.warning).toBeTruthy()
      expect(result.warning).toContain("misconfigured")
      expect(result.result.visibility).toBe(true) // still returns data
      expect(mockRunPortalLogin).not.toHaveBeenCalled()
    })

    it("does not crash on missing config", async () => {
      mockGetMockPortalRecon.mockReturnValue(makeMockResponse("inv-011"))

      const result = await investigate({ invoiceId: "inv-011" })

      expect(result).toBeDefined()
      expect(result.mode).toBe("misconfigured")
    })
  })

  // ── Live Mode ──

  describe("live mode", () => {
    beforeEach(() => {
      mockGetPortalReconMode.mockReturnValue("live")
    })

    it("calls runPortalLogin and returns live response", async () => {
      mockRunPortalLogin.mockResolvedValue(makeLiveLoginResult())

      const result = await investigate({ invoiceId: "inv-020" })

      expect(mockRunPortalLogin).toHaveBeenCalledWith({ invoiceId: "inv-020" })
      expect(result.mode).toBe("live")
      expect(result.degradedFromLive).toBe(false)
      expect(result.result.visibility).toBe(true)
      expect(result.result.paymentStatus).toBe("unpaid")
      expect(result.result.tinyfishRunId).toBe("run_abc123")
    })

    it("extracts activity data from live result", async () => {
      mockRunPortalLogin.mockResolvedValue(makeLiveLoginResult())

      const result = await investigate({ invoiceId: "inv-021" })

      expect(result.result.lastLoginAt).toBeTruthy()
      expect(result.result.hasRecentActivity).toBe(true)
      expect(result.result.invoiceViewCount).toBe(4)
      expect(result.result.screenshots).toHaveLength(2)
    })

    it("sets shouldSkipCollection=true for processing payments", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceData = {
        ...loginResult.result.invoiceData,
        paymentStatus: "processing",
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-022" })

      expect(result.result.paymentStatus).toBe("processing")
      expect(result.result.shouldSkipCollection).toBe(true)
    })

    it("sets shouldSkipCollection=true for paid invoices", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceData = {
        ...loginResult.result.invoiceData,
        paymentStatus: "paid",
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-023" })

      expect(result.result.paymentStatus).toBe("paid")
      expect(result.result.shouldSkipCollection).toBe(true)
    })
  })

  // ── Invoice Visibility Verification (Task 6.2) ──

  describe("invoice visibility verification", () => {
    beforeEach(() => {
      mockGetPortalReconMode.mockReturnValue("live")
    })

    it("returns visibility=true when invoiceFound is true", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceFound = true
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-vis-001" })

      expect(result.result.visibility).toBe(true)
      expect(result.result.visibilityReason).toBeNull()
    })

    it("returns visibility=false when invoiceFound is false", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceFound = false
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-vis-002" })

      expect(result.result.visibility).toBe(false)
      expect(result.result.visibilityReason).toBeTruthy()
    })

    it("extracts visibilityReason from invoiceData when invoice not found", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceFound = false
      loginResult.result.invoiceData = {
        visibilityReason: "filtered to spam folder",
        paymentStatus: "unknown",
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-vis-003" })

      expect(result.result.visibility).toBe(false)
      expect(result.result.visibilityReason).toBe("filtered to spam folder")
    })

    it("defaults visibilityReason to 'not in customer view' when not provided", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceFound = false
      loginResult.result.invoiceData = { paymentStatus: "unknown" }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-vis-004" })

      expect(result.result.visibility).toBe(false)
      expect(result.result.visibilityReason).toBe("not in customer view")
    })

    it("sets higher visibilityConfidence (90) when invoice is found", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceFound = true
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-vis-005" })

      expect(result.result.visibilityConfidence).toBe(90)
    })

    it("sets lower visibilityConfidence (75) when invoice is not found", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceFound = false
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-vis-006" })

      expect(result.result.visibilityConfidence).toBe(75)
    })

    it("maps invoice_list and invoice_detail screenshots from live result", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.screenshots = [
        { step: "login", data: "data:image/png;base64,s1" },
        { step: "invoice_list", data: "data:image/png;base64,s2" },
        { step: "invoice_detail", data: "data:image/png;base64,s3" },
      ]
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-vis-007" })

      expect(result.result.screenshots).toHaveLength(3)
      const steps = result.result.screenshots.map((s) => s.step)
      expect(steps).toContain("login")
      expect(steps).toContain("invoice_list")
      expect(steps).toContain("invoice_detail")
    })

    it("attaches invoiceId to each mapped screenshot", async () => {
      const loginResult = makeLiveLoginResult()
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-vis-008" })

      for (const screenshot of result.result.screenshots) {
        expect(screenshot.invoiceId).toBe("inv-vis-008")
      }
    })

    it("filters out invalid screenshot steps", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.screenshots = [
        { step: "login", data: "data:image/png;base64,s1" },
        { step: "unknown_step", data: "data:image/png;base64,bad" },
        { step: "invoice_list", data: "data:image/png;base64,s2" },
      ]
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-vis-009" })

      expect(result.result.screenshots).toHaveLength(2)
      const steps = result.result.screenshots.map((s) => s.step)
      expect(steps).not.toContain("unknown_step")
    })

    it("sets visibilityReason to null when invoice is found", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceFound = true
      loginResult.result.invoiceData = {
        visibilityReason: "should be ignored when found",
        paymentStatus: "unpaid",
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-vis-010" })

      expect(result.result.visibility).toBe(true)
      expect(result.result.visibilityReason).toBeNull()
    })
  })

  // ── Payment Status Verification (Task 6.3) ──

  describe("payment status verification", () => {
    beforeEach(() => {
      mockGetPortalReconMode.mockReturnValue("live")
    })

    // --- All five payment states ---

    it("returns paymentStatus=unpaid and shouldSkipCollection=false for unpaid invoices", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceData = {
        ...loginResult.result.invoiceData,
        paymentStatus: "unpaid",
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-pay-001" })

      expect(result.result.paymentStatus).toBe("unpaid")
      expect(result.result.shouldSkipCollection).toBe(false)
    })

    it("returns paymentStatus=processing and shouldSkipCollection=true for processing invoices", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceData = {
        ...loginResult.result.invoiceData,
        paymentStatus: "processing",
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-pay-002" })

      expect(result.result.paymentStatus).toBe("processing")
      expect(result.result.shouldSkipCollection).toBe(true)
    })

    it("returns paymentStatus=paid and shouldSkipCollection=true for paid invoices", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceData = {
        ...loginResult.result.invoiceData,
        paymentStatus: "paid",
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-pay-003" })

      expect(result.result.paymentStatus).toBe("paid")
      expect(result.result.shouldSkipCollection).toBe(true)
    })

    it("returns paymentStatus=failed and shouldSkipCollection=false for failed payments", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceData = {
        ...loginResult.result.invoiceData,
        paymentStatus: "failed",
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-pay-004" })

      expect(result.result.paymentStatus).toBe("failed")
      expect(result.result.shouldSkipCollection).toBe(false)
    })

    it("returns paymentStatus=unknown and shouldSkipCollection=false for unrecognized status", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceData = {
        ...loginResult.result.invoiceData,
        paymentStatus: "something_weird",
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-pay-005" })

      expect(result.result.paymentStatus).toBe("unknown")
      expect(result.result.shouldSkipCollection).toBe(false)
    })

    // --- Payment date and method extraction ---

    it("extracts paymentDate and paymentMethod when available", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceData = {
        ...loginResult.result.invoiceData,
        paymentStatus: "paid",
        paymentDate: "2026-04-10",
        paymentMethod: "ACH Transfer",
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-pay-006" })

      expect(result.result.paymentDate).toBe("2026-04-10")
      expect(result.result.paymentMethod).toBe("ACH Transfer")
    })

    it("returns null for paymentDate and paymentMethod when not available", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceData = {
        ...loginResult.result.invoiceData,
        paymentStatus: "unpaid",
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-pay-007" })

      expect(result.result.paymentDate).toBeNull()
      expect(result.result.paymentMethod).toBeNull()
    })

    it("extracts payment_date and payment_method from snake_case keys", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceData = {
        visibility: true,
        payment_status: "paid",
        payment_date: "2026-03-15",
        payment_method: "Credit Card",
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-pay-008" })

      expect(result.result.paymentStatus).toBe("paid")
      expect(result.result.paymentDate).toBe("2026-03-15")
      expect(result.result.paymentMethod).toBe("Credit Card")
    })

    // --- Payment status screenshot mapping ---

    it("maps payment_status screenshot from live result", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.screenshots = [
        { step: "login", data: "data:image/png;base64,s1" },
        { step: "invoice_detail", data: "data:image/png;base64,s2" },
        { step: "payment_status", data: "data:image/png;base64,s3" },
      ]
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-pay-009" })

      expect(result.result.screenshots).toHaveLength(3)
      const steps = result.result.screenshots.map((s) => s.step)
      expect(steps).toContain("payment_status")
      const paymentScreenshot = result.result.screenshots.find((s) => s.step === "payment_status")
      expect(paymentScreenshot?.url).toBe("data:image/png;base64,s3")
      expect(paymentScreenshot?.invoiceId).toBe("inv-pay-009")
    })

    // --- Normalization of alternative status strings ---

    it("normalizes 'overdue' to 'unpaid'", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceData = { paymentStatus: "overdue" }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-norm-001" })

      expect(result.result.paymentStatus).toBe("unpaid")
      expect(result.result.shouldSkipCollection).toBe(false)
    })

    it("normalizes 'open' to 'unpaid'", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceData = { paymentStatus: "open" }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-norm-002" })

      expect(result.result.paymentStatus).toBe("unpaid")
      expect(result.result.shouldSkipCollection).toBe(false)
    })

    it("normalizes 'pending' to 'processing'", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceData = { paymentStatus: "pending" }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-norm-003" })

      expect(result.result.paymentStatus).toBe("processing")
      expect(result.result.shouldSkipCollection).toBe(true)
    })

    it("normalizes 'in_progress' to 'processing'", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceData = { paymentStatus: "in_progress" }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-norm-004" })

      expect(result.result.paymentStatus).toBe("processing")
      expect(result.result.shouldSkipCollection).toBe(true)
    })

    it("normalizes 'completed' to 'paid'", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceData = { paymentStatus: "completed" }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-norm-005" })

      expect(result.result.paymentStatus).toBe("paid")
      expect(result.result.shouldSkipCollection).toBe(true)
    })

    it("normalizes 'settled' to 'paid'", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceData = { paymentStatus: "settled" }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-norm-006" })

      expect(result.result.paymentStatus).toBe("paid")
      expect(result.result.shouldSkipCollection).toBe(true)
    })

    it("normalizes 'declined' to 'failed'", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceData = { paymentStatus: "declined" }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-norm-007" })

      expect(result.result.paymentStatus).toBe("failed")
      expect(result.result.shouldSkipCollection).toBe(false)
    })

    it("normalizes 'rejected' to 'failed'", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceData = { paymentStatus: "rejected" }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-norm-008" })

      expect(result.result.paymentStatus).toBe("failed")
      expect(result.result.shouldSkipCollection).toBe(false)
    })

    it("handles case-insensitive status normalization", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceData = { paymentStatus: "PAID" }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-norm-009" })

      expect(result.result.paymentStatus).toBe("paid")
      expect(result.result.shouldSkipCollection).toBe(true)
    })

    it("handles whitespace-padded status normalization", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceData = { paymentStatus: "  processing  " }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-norm-010" })

      expect(result.result.paymentStatus).toBe("processing")
      expect(result.result.shouldSkipCollection).toBe(true)
    })

    it("defaults to 'unknown' when paymentStatus is missing from invoiceData", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.invoiceData = { visibility: true }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-norm-011" })

      expect(result.result.paymentStatus).toBe("unknown")
      expect(result.result.shouldSkipCollection).toBe(false)
    })
  })

  // ── Customer Activity Analysis (Task 6.4) ──

  describe("customer activity analysis", () => {
    beforeEach(() => {
      mockGetPortalReconMode.mockReturnValue("live")
    })

    // --- lastLoginAt extraction ---

    it("extracts lastLoginAt from activityData", async () => {
      const ts = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      const loginResult = makeLiveLoginResult()
      loginResult.result.activityData = { lastLoginAt: ts, invoiceViewCount: 0, invoiceViewTimestamps: [] }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-act-001" })

      expect(result.result.lastLoginAt).toBe(ts)
    })

    it("returns lastLoginAt=null when not present in activityData", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.activityData = { invoiceViewCount: 0, invoiceViewTimestamps: [] }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-act-002" })

      expect(result.result.lastLoginAt).toBeNull()
    })

    // --- hasRecentActivity ---

    it("sets hasRecentActivity=true when login is within 7 days", async () => {
      const recentTs = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      const loginResult = makeLiveLoginResult()
      loginResult.result.activityData = { lastLoginAt: recentTs, invoiceViewCount: 0, invoiceViewTimestamps: [] }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-act-003" })

      expect(result.result.hasRecentActivity).toBe(true)
    })

    it("sets hasRecentActivity=false when login is older than 7 days", async () => {
      const oldTs = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      const loginResult = makeLiveLoginResult()
      loginResult.result.activityData = { lastLoginAt: oldTs, invoiceViewCount: 0, invoiceViewTimestamps: [] }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-act-004" })

      expect(result.result.hasRecentActivity).toBe(false)
    })

    it("sets hasRecentActivity=false when lastLoginAt is null", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.activityData = { invoiceViewCount: 0, invoiceViewTimestamps: [] }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-act-005" })

      expect(result.result.hasRecentActivity).toBe(false)
    })

    // --- invoiceViewCount and invoiceViewTimestamps extraction ---

    it("extracts invoiceViewCount from activityData", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.activityData = {
        lastLoginAt: new Date().toISOString(),
        invoiceViewCount: 7,
        invoiceViewTimestamps: [],
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-act-006" })

      expect(result.result.invoiceViewCount).toBe(7)
    })

    it("returns invoiceViewCount=null when not present", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.activityData = { lastLoginAt: new Date().toISOString() }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-act-007" })

      expect(result.result.invoiceViewCount).toBeNull()
    })

    it("extracts invoiceViewTimestamps from activityData", async () => {
      const ts1 = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      const ts2 = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      const loginResult = makeLiveLoginResult()
      loginResult.result.activityData = {
        lastLoginAt: new Date().toISOString(),
        invoiceViewCount: 2,
        invoiceViewTimestamps: [ts1, ts2],
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-act-008" })

      expect(result.result.invoiceViewTimestamps).toEqual([ts1, ts2])
    })

    it("returns empty invoiceViewTimestamps when not present", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.activityData = { lastLoginAt: new Date().toISOString() }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-act-009" })

      expect(result.result.invoiceViewTimestamps).toEqual([])
    })

    // --- engagementLevel derivation ---

    it("returns engagementLevel=none when no activity and no views", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.activityData = {
        lastLoginAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        invoiceViewCount: 0,
        invoiceViewTimestamps: [],
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-act-010" })

      expect(result.result.engagementLevel).toBe("none")
    })

    it("returns engagementLevel=low when has activity but not recent", async () => {
      const oldTs = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const loginResult = makeLiveLoginResult()
      loginResult.result.activityData = {
        lastLoginAt: oldTs,
        invoiceViewCount: 1,
        invoiceViewTimestamps: [oldTs],
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-act-011" })

      expect(result.result.engagementLevel).toBe("low")
    })

    it("returns engagementLevel=medium when 1 recent view", async () => {
      const recentTs = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      const loginResult = makeLiveLoginResult()
      loginResult.result.activityData = {
        lastLoginAt: recentTs,
        invoiceViewCount: 1,
        invoiceViewTimestamps: [recentTs],
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-act-012" })

      expect(result.result.engagementLevel).toBe("medium")
    })

    it("returns engagementLevel=medium when 2+ total views and recent activity", async () => {
      const recentTs = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      const loginResult = makeLiveLoginResult()
      loginResult.result.activityData = {
        lastLoginAt: recentTs,
        invoiceViewCount: 2,
        invoiceViewTimestamps: [],
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-act-013" })

      expect(result.result.engagementLevel).toBe("medium")
    })

    it("returns engagementLevel=high when 3+ recent views", async () => {
      const now = Date.now()
      const ts1 = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString()
      const ts2 = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString()
      const ts3 = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString()
      const loginResult = makeLiveLoginResult()
      loginResult.result.activityData = {
        lastLoginAt: ts1,
        invoiceViewCount: 3,
        invoiceViewTimestamps: [ts1, ts2, ts3],
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-act-014" })

      expect(result.result.engagementLevel).toBe("high")
    })

    it("returns engagementLevel=high when 5+ total views with recent activity", async () => {
      const recentTs = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      const loginResult = makeLiveLoginResult()
      loginResult.result.activityData = {
        lastLoginAt: recentTs,
        invoiceViewCount: 5,
        invoiceViewTimestamps: [recentTs],
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-act-015" })

      expect(result.result.engagementLevel).toBe("high")
    })

    it("returns engagementLevel=none when lastLoginAt is null and no views", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.activityData = {}
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-act-016" })

      expect(result.result.engagementLevel).toBe("none")
    })

    // --- activityConfidence scoring ---

    it("returns activityConfidence=85 when lastLoginAt is present", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.activityData = {
        lastLoginAt: new Date().toISOString(),
        invoiceViewCount: 0,
        invoiceViewTimestamps: [],
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-act-017" })

      expect(result.result.activityConfidence).toBe(85)
    })

    it("returns activityConfidence=50 when lastLoginAt is absent", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.activityData = { invoiceViewCount: 0, invoiceViewTimestamps: [] }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-act-018" })

      expect(result.result.activityConfidence).toBe(50)
    })

    // --- Snake_case key support ---

    it("extracts last_login_at from snake_case keys", async () => {
      const ts = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      const loginResult = makeLiveLoginResult()
      loginResult.result.activityData = {
        last_login_at: ts,
        invoice_view_count: 3,
        invoice_view_timestamps: [ts],
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-act-019" })

      expect(result.result.lastLoginAt).toBe(ts)
      expect(result.result.hasRecentActivity).toBe(true)
    })

    it("extracts invoice_view_count from snake_case keys", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.activityData = {
        last_login_at: new Date().toISOString(),
        invoice_view_count: 4,
        invoice_view_timestamps: [],
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-act-020" })

      expect(result.result.invoiceViewCount).toBe(4)
    })

    it("extracts invoice_view_timestamps from snake_case keys", async () => {
      const ts1 = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      const ts2 = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      const loginResult = makeLiveLoginResult()
      loginResult.result.activityData = {
        last_login_at: new Date().toISOString(),
        invoice_view_count: 2,
        invoice_view_timestamps: [ts1, ts2],
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-act-021" })

      expect(result.result.invoiceViewTimestamps).toEqual([ts1, ts2])
    })

    it("prefers camelCase over snake_case when both present", async () => {
      const camelTs = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      const snakeTs = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
      const loginResult = makeLiveLoginResult()
      loginResult.result.activityData = {
        lastLoginAt: camelTs,
        last_login_at: snakeTs,
        invoiceViewCount: 10,
        invoice_view_count: 1,
      }
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-act-022" })

      expect(result.result.lastLoginAt).toBe(camelTs)
      expect(result.result.invoiceViewCount).toBe(10)
    })
  })

  // ── Portal-Native Messaging (Task 6.5) ──

  describe("portal-native messaging", () => {
    beforeEach(() => {
      mockGetPortalReconMode.mockReturnValue("live")
    })

    it("returns messageSent=true with timestamp when TinyFish reports message sent", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.messageSent = true
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-msg-001" })

      expect(result.result.messageSent).toBe(true)
      expect(result.result.messageSentAt).toBeTruthy()
      // Verify it's a valid ISO timestamp
      expect(new Date(result.result.messageSentAt!).toISOString()).toBe(result.result.messageSentAt)
      expect(result.result.messageFailureReason).toBeNull()
    })

    it("returns messageSent=false with reason when messaging not supported", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.messageSent = false
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-msg-002" })

      expect(result.result.messageSent).toBe(false)
      expect(result.result.messageSentAt).toBeNull()
      expect(result.result.messageFailureReason).toBeTruthy()
    })

    it("populates messageFailureReason when message not sent", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.messageSent = false
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-msg-003" })

      expect(result.result.messageFailureReason).toEqual(
        expect.stringContaining("not")
      )
    })

    it("maps message_sent screenshot from live result", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.result.messageSent = true
      loginResult.result.screenshots = [
        { step: "login", data: "data:image/png;base64,s1" },
        { step: "invoice_detail", data: "data:image/png;base64,s2" },
        { step: "message_sent", data: "data:image/png;base64,msg" },
      ]
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-msg-004" })

      expect(result.result.screenshots).toHaveLength(3)
      const msgScreenshot = result.result.screenshots.find((s) => s.step === "message_sent")
      expect(msgScreenshot).toBeDefined()
      expect(msgScreenshot?.url).toBe("data:image/png;base64,msg")
      expect(msgScreenshot?.invoiceId).toBe("inv-msg-004")
    })

    it("returns messageSent=true in mock mode for high_engagement scenario", async () => {
      mockGetPortalReconMode.mockReturnValue("mock")
      const highEngagementFixture = {
        mode: "mock" as const,
        degradedFromLive: false,
        warning: null,
        result: {
          visibility: true,
          visibilityReason: null,
          visibilityConfidence: 95,
          paymentStatus: "unpaid" as const,
          paymentDate: null,
          paymentMethod: null,
          shouldSkipCollection: false,
          lastLoginAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          hasRecentActivity: true,
          invoiceViewCount: 8,
          invoiceViewTimestamps: [],
          engagementLevel: "high" as const,
          activityConfidence: 95,
          messageSent: true,
          messageSentAt: "2026-04-11T18:00:00.000Z",
          messageFailureReason: null,
          screenshots: [
            { step: "login" as const, url: "data:image/png;base64,abc", timestamp: "2026-04-11T18:00:00.000Z", invoiceId: "inv-msg-005" },
            { step: "message_sent" as const, url: "data:image/png;base64,msg", timestamp: "2026-04-11T18:00:00.000Z", invoiceId: "inv-msg-005" },
          ],
          portalUrl: "https://customer-portal.example.com",
          tinyfishRunId: null,
          authFailed: false,
          botDetected: false,
          parsingFailed: false,
        },
      }
      mockGetMockPortalRecon.mockReturnValue(highEngagementFixture)

      const result = await investigate({ invoiceId: "inv-msg-005", scenario: "high_engagement" })

      expect(result.mode).toBe("mock")
      expect(result.result.messageSent).toBe(true)
      expect(result.result.messageSentAt).toBeTruthy()
      expect(result.result.messageFailureReason).toBeNull()
      // Verify message_sent screenshot is present
      const msgScreenshot = result.result.screenshots.find((s) => s.step === "message_sent")
      expect(msgScreenshot).toBeDefined()
    })
  })

  // ── Graceful Degradation ──

  describe("graceful degradation", () => {
    beforeEach(() => {
      mockGetPortalReconMode.mockReturnValue("live")
    })

    it("degrades to mock data when runPortalLogin throws", async () => {
      const { TinyFishError } = await import("@/lib/tinyfish/client")
      mockRunPortalLogin.mockRejectedValue(
        new TinyFishError("network", "Connection refused")
      )
      mockGetMockPortalRecon.mockReturnValue(makeMockResponse("inv-030"))

      const result = await investigate({ invoiceId: "inv-030" })

      expect(result.mode).toBe("live")
      expect(result.degradedFromLive).toBe(true)
      expect(result.warning).toContain("fixture data")
      expect(result.result.visibility).toBe(true) // mock data
    })

    it("degrades on generic errors without crashing", async () => {
      mockRunPortalLogin.mockRejectedValue(new Error("Unexpected failure"))
      mockGetMockPortalRecon.mockReturnValue(makeMockResponse("inv-031"))

      const result = await investigate({ invoiceId: "inv-031" })

      expect(result.degradedFromLive).toBe(true)
      expect(result.warning).toContain("Unexpected failure")
    })

    it("handles AUTH_FAILED status from live result", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.status = "AUTH_FAILED" as typeof loginResult.status
      loginResult.result.authenticated = false
      loginResult.result.invoiceFound = false
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-032" })

      expect(result.result.authFailed).toBe(true)
      expect(result.result.visibility).toBe(false)
    })

    it("handles BOT_DETECTED status by falling back to mock", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.status = "BOT_DETECTED" as typeof loginResult.status
      mockRunPortalLogin.mockResolvedValue(loginResult)
      mockGetMockPortalRecon.mockReturnValue(makeMockResponse("inv-033"))

      const result = await investigate({ invoiceId: "inv-033" })

      expect(result.degradedFromLive).toBe(true)
      expect(result.result.botDetected).toBe(true)
    })

    it("handles client-side degradation (degradedFromLive in login result)", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.mode = "mock" as typeof loginResult.mode
      loginResult.degradedFromLive = true
      loginResult.warning = "TinyFish network: timeout"
      mockRunPortalLogin.mockResolvedValue(loginResult)
      mockGetMockPortalRecon.mockReturnValue(makeMockResponse("inv-034"))

      const result = await investigate({ invoiceId: "inv-034" })

      expect(result.degradedFromLive).toBe(true)
      expect(result.warning).toContain("timeout")
    })
  })

  // ── Audit Logging (Task 6.6) ──

  describe("audit logging", () => {
    beforeEach(() => {
      mockGetPortalReconMode.mockReturnValue("mock")
      mockGetMockPortalRecon.mockReturnValue(makeMockResponse("inv-audit-001"))
    })

    it("calls recordAiAction when Supabase is configured", async () => {
      mockIsSupabaseConfigured.mockReturnValue(true)

      await investigate({ invoiceId: "inv-audit-001" })

      // Allow fire-and-forget promise to settle
      await new Promise((r) => setTimeout(r, 50))

      expect(mockRecordAiAction).toHaveBeenCalledTimes(1)
      const [, input] = mockRecordAiAction.mock.calls[0] as [unknown, Record<string, unknown>]
      expect(input.actionType).toBe("portal_reconnaissance")
      expect(input.entityType).toBe("invoice")
      expect(input.entityId).toBe("inv-audit-001")
      expect(input.triggerType).toBe("portal_reconnaissance")
      expect(input.organizationId).toBe("00000000-0000-0000-0000-000000000001")
      expect(input.status).toBe("executed")
    })

    it("includes result data in outputPayload", async () => {
      mockIsSupabaseConfigured.mockReturnValue(true)

      await investigate({ invoiceId: "inv-audit-002", customerId: "cust-123" })
      await new Promise((r) => setTimeout(r, 50))

      const [, input] = mockRecordAiAction.mock.calls[0] as [unknown, Record<string, unknown>]
      const payload = input.outputPayload as Record<string, unknown>
      expect(payload).toHaveProperty("visibility")
      expect(payload).toHaveProperty("paymentStatus")
      expect(payload).toHaveProperty("shouldSkipCollection")
      expect(payload).toHaveProperty("engagementLevel")
      expect(payload).toHaveProperty("messageSent")
      expect(payload).toHaveProperty("mode", "mock")
      expect(payload).toHaveProperty("degradedFromLive", false)
    })

    it("includes opts in inputSummary", async () => {
      mockIsSupabaseConfigured.mockReturnValue(true)

      await investigate({
        invoiceId: "inv-audit-003",
        customerId: "cust-456",
        portalUrl: "https://portal.example.com",
      })
      await new Promise((r) => setTimeout(r, 50))

      const [, input] = mockRecordAiAction.mock.calls[0] as [unknown, Record<string, unknown>]
      const summary = input.inputSummary as string
      expect(summary).toContain("mode=mock")
      expect(summary).toContain("invoice=inv-audit-003")
      expect(summary).toContain("customer=cust-456")
      expect(summary).toContain("portal=https://portal.example.com")
    })

    it("skips audit logging when Supabase is not configured", async () => {
      mockIsSupabaseConfigured.mockReturnValue(false)

      await investigate({ invoiceId: "inv-audit-004" })
      await new Promise((r) => setTimeout(r, 50))

      expect(mockRecordAiAction).not.toHaveBeenCalled()
    })

    it("does not block the response when audit logging fails", async () => {
      mockIsSupabaseConfigured.mockReturnValue(true)
      mockRecordAiAction.mockRejectedValue(new Error("DB connection failed"))

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      const result = await investigate({ invoiceId: "inv-audit-005" })
      await new Promise((r) => setTimeout(r, 50))

      // Response should still be returned successfully
      expect(result.mode).toBe("mock")
      expect(result.result.visibility).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[portal-recon]"),
        expect.stringContaining("DB connection failed")
      )

      consoleSpy.mockRestore()
    })

    it("logs audit for live mode with tinyfishRunId in result", async () => {
      mockGetPortalReconMode.mockReturnValue("live")
      mockIsSupabaseConfigured.mockReturnValue(true)
      mockRunPortalLogin.mockResolvedValue(makeLiveLoginResult())

      await investigate({ invoiceId: "inv-audit-006" })
      await new Promise((r) => setTimeout(r, 50))

      expect(mockRecordAiAction).toHaveBeenCalledTimes(1)
      const [, input] = mockRecordAiAction.mock.calls[0] as [unknown, Record<string, unknown>]
      const payload = input.outputPayload as Record<string, unknown>
      expect(payload.mode).toBe("live")
      expect(payload.degradedFromLive).toBe(false)
    })
  })

  // ── Error Handling and Retry Logic (Task 6.7) ──

  describe("error handling and retry logic", () => {
    beforeEach(() => {
      mockGetPortalReconMode.mockReturnValue("live")
      mockIsSupabaseConfigured.mockReturnValue(false)
    })

    // --- Retry with exponential backoff ---

    it("retries on TinyFishError kind=http status=429 and succeeds on second attempt", async () => {
      const { TinyFishError } = await import("@/lib/tinyfish/client")
      let callCount = 0
      mockRunPortalLogin.mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          throw new TinyFishError("http", "Rate limited", 429)
        }
        return makeLiveLoginResult()
      })

      const result = await investigate({ invoiceId: "inv-retry-001" })

      expect(callCount).toBe(2)
      expect(result.mode).toBe("live")
      expect(result.degradedFromLive).toBe(false)
      expect(result.result.visibility).toBe(true)
    })

    it("retries on TinyFishError kind=http status=500 and succeeds on second attempt", async () => {
      const { TinyFishError } = await import("@/lib/tinyfish/client")
      let callCount = 0
      mockRunPortalLogin.mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          throw new TinyFishError("http", "Internal Server Error", 500)
        }
        return makeLiveLoginResult()
      })

      const result = await investigate({ invoiceId: "inv-retry-002" })

      expect(callCount).toBe(2)
      expect(result.mode).toBe("live")
      expect(result.degradedFromLive).toBe(false)
    })

    it("retries on TinyFishError kind=timeout and succeeds on second attempt", async () => {
      const { TinyFishError } = await import("@/lib/tinyfish/client")
      let callCount = 0
      mockRunPortalLogin.mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          throw new TinyFishError("timeout", "Request timed out")
        }
        return makeLiveLoginResult()
      })

      const result = await investigate({ invoiceId: "inv-retry-003" })

      expect(callCount).toBe(2)
      expect(result.mode).toBe("live")
      expect(result.degradedFromLive).toBe(false)
    })

    it("retries on TinyFishError kind=network and succeeds on second attempt", async () => {
      const { TinyFishError } = await import("@/lib/tinyfish/client")
      let callCount = 0
      mockRunPortalLogin.mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          throw new TinyFishError("network", "Connection refused")
        }
        return makeLiveLoginResult()
      })

      const result = await investigate({ invoiceId: "inv-retry-004" })

      expect(callCount).toBe(2)
      expect(result.mode).toBe("live")
      expect(result.degradedFromLive).toBe(false)
    })

    it("degrades to mock after max retry attempts exhausted", async () => {
      const { TinyFishError } = await import("@/lib/tinyfish/client")
      let callCount = 0
      mockRunPortalLogin.mockImplementation(async () => {
        callCount++
        throw new TinyFishError("http", "Service Unavailable", 503)
      })
      mockGetMockPortalRecon.mockReturnValue(makeMockResponse("inv-retry-005"))

      const result = await investigate({ invoiceId: "inv-retry-005" })

      expect(callCount).toBe(2) // initial + 1 retry = 2 attempts
      expect(result.degradedFromLive).toBe(true)
      expect(result.warning).toContain("fixture data")
    })

    it("does NOT retry non-retryable errors (kind=parse)", async () => {
      const { TinyFishError } = await import("@/lib/tinyfish/client")
      let callCount = 0
      mockRunPortalLogin.mockImplementation(async () => {
        callCount++
        throw new TinyFishError("parse", "Invalid JSON response")
      })
      mockGetMockPortalRecon.mockReturnValue(makeMockResponse("inv-retry-006"))

      const result = await investigate({ invoiceId: "inv-retry-006" })

      expect(callCount).toBe(1) // no retry for parse errors
      expect(result.degradedFromLive).toBe(true)
    })

    it("does NOT retry HTTP 400 errors", async () => {
      const { TinyFishError } = await import("@/lib/tinyfish/client")
      let callCount = 0
      mockRunPortalLogin.mockImplementation(async () => {
        callCount++
        throw new TinyFishError("http", "Bad Request", 400)
      })
      mockGetMockPortalRecon.mockReturnValue(makeMockResponse("inv-retry-007"))

      const result = await investigate({ invoiceId: "inv-retry-007" })

      expect(callCount).toBe(1) // no retry for 4xx (except 429)
      expect(result.degradedFromLive).toBe(true)
    })

    // --- parsingFailed handling ---

    it("returns parsingFailed=true when buildLiveResponse throws", async () => {
      // Simulate a live result that will cause buildLiveResponse to throw
      // by providing malformed data that triggers an error during parsing
      const loginResult = makeLiveLoginResult()
      // Override invoiceData to be something that causes a throw in buildLiveResponse
      // We'll make the result throw by setting invoiceData to a non-object
      Object.defineProperty(loginResult.result, "invoiceData", {
        get() { throw new Error("Unexpected portal structure change") },
      })
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-parse-001" })

      expect(result.result.parsingFailed).toBe(true)
      expect(result.result.visibilityConfidence).toBeLessThanOrEqual(10)
      expect(result.warning).toContain("parsing failed")
      expect(result.mode).toBe("live")
      expect(result.degradedFromLive).toBe(false)
    })

    it("returns low confidence when parsingFailed is true", async () => {
      const loginResult = makeLiveLoginResult()
      Object.defineProperty(loginResult.result, "invoiceData", {
        get() { throw new Error("Structure changed") },
      })
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-parse-002" })

      expect(result.result.parsingFailed).toBe(true)
      expect(result.result.visibilityConfidence).toBeLessThanOrEqual(10)
      expect(result.result.activityConfidence).toBe(0)
    })

    it("preserves tinyfishRunId when parsingFailed", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.tinyfishRunId = "run_parse_fail_123"
      Object.defineProperty(loginResult.result, "invoiceData", {
        get() { throw new Error("Parse error") },
      })
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-parse-003" })

      expect(result.result.parsingFailed).toBe(true)
      expect(result.result.tinyfishRunId).toBe("run_parse_fail_123")
    })

    // --- 30-second timeout ---

    it("degrades to mock when live mode exceeds 30 seconds", async () => {
      // Mock runPortalLogin to hang for longer than the timeout
      mockRunPortalLogin.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 60_000))
      )
      mockGetMockPortalRecon.mockReturnValue(makeMockResponse("inv-timeout-001"))

      const result = await investigate({ invoiceId: "inv-timeout-001" })

      expect(result.degradedFromLive).toBe(true)
      expect(result.warning).toContain("timed out")
    }, 35_000) // give the test itself enough time

    // --- authFailed skips to email collection ---

    it("returns authFailed=true for invalid credentials without retrying", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.status = "AUTH_FAILED" as typeof loginResult.status
      loginResult.result.authenticated = false
      loginResult.result.invoiceFound = false
      mockRunPortalLogin.mockResolvedValue(loginResult)

      const result = await investigate({ invoiceId: "inv-auth-001" })

      expect(result.result.authFailed).toBe(true)
      expect(result.result.visibility).toBe(false)
      expect(mockRunPortalLogin).toHaveBeenCalledTimes(1) // no retry
    })

    // --- botDetected falls back to fixtures ---

    it("returns botDetected=true and falls back to fixtures", async () => {
      const loginResult = makeLiveLoginResult()
      loginResult.status = "BOT_DETECTED" as typeof loginResult.status
      mockRunPortalLogin.mockResolvedValue(loginResult)
      mockGetMockPortalRecon.mockReturnValue(makeMockResponse("inv-bot-001"))

      const result = await investigate({ invoiceId: "inv-bot-001" })

      expect(result.result.botDetected).toBe(true)
      expect(result.degradedFromLive).toBe(true)
    })

    // --- Error audit logging ---

    it("logs error to audit trail when degrading to mock", async () => {
      const { TinyFishError } = await import("@/lib/tinyfish/client")
      mockIsSupabaseConfigured.mockReturnValue(true)
      mockRunPortalLogin.mockRejectedValue(
        new TinyFishError("network", "Connection refused")
      )
      mockGetMockPortalRecon.mockReturnValue(makeMockResponse("inv-errlog-001"))

      await investigate({ invoiceId: "inv-errlog-001" })
      await new Promise((r) => setTimeout(r, 100))

      // Should have 2 audit calls: one for the error, one for the normal response audit
      expect(mockRecordAiAction).toHaveBeenCalled()
      const errorCall = mockRecordAiAction.mock.calls.find(
        (call) => (call[1] as Record<string, unknown>).actionType === "portal_reconnaissance_error"
      )
      expect(errorCall).toBeDefined()
      const errorInput = errorCall![1] as Record<string, unknown>
      expect(errorInput.actionType).toBe("portal_reconnaissance_error")
      expect(errorInput.status).toBe("failed")
      const errorPayload = errorInput.outputPayload as Record<string, unknown>
      expect(errorPayload.errorType).toBe("network")
      expect(errorPayload.recoveryAction).toBe("degraded_to_mock")
    })

    it("logs parsing error to audit trail", async () => {
      mockIsSupabaseConfigured.mockReturnValue(true)
      const loginResult = makeLiveLoginResult()
      Object.defineProperty(loginResult.result, "invoiceData", {
        get() { throw new Error("Structure changed") },
      })
      mockRunPortalLogin.mockResolvedValue(loginResult)

      await investigate({ invoiceId: "inv-errlog-002" })
      await new Promise((r) => setTimeout(r, 100))

      const errorCall = mockRecordAiAction.mock.calls.find(
        (call) => (call[1] as Record<string, unknown>).actionType === "portal_reconnaissance_error"
      )
      expect(errorCall).toBeDefined()
      const errorInput = errorCall![1] as Record<string, unknown>
      const errorPayload = errorInput.outputPayload as Record<string, unknown>
      expect(errorPayload.errorType).toBe("parsing")
      expect(errorPayload.recoveryAction).toBe("returned_parsing_failed")
    })
  })
})
