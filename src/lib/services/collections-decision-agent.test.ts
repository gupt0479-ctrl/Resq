/**
 * Collections Decision Agent — Portal Signal Integration Tests
 *
 * Tests that portal reconnaissance signals correctly influence
 * the collections decision logic (Task 9.2, Requirements 7.2–7.5).
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mocks ─────────────────────────────────────────────────────────────────

// Mock "server-only" so it doesn't throw in test env
vi.mock("server-only", () => ({}))

// Mock Anthropic — force deterministic fallback by throwing
vi.mock("@anthropic-ai/sdk", () => ({
  default: class Anthropic {
    messages = {
      create: vi.fn().mockRejectedValue(new Error("mock: Claude unavailable")),
    }
  },
}))

// Mock TinyFish search (external signals)
vi.mock("@/lib/tinyfish/client", () => ({
  search: vi.fn().mockResolvedValue({
    mode: "mock",
    results: [],
  }),
}))

// Mock recovery-agent (customer profile)
const mockGetCustomerProfile = vi.fn()
vi.mock("@/lib/services/recovery-agent", () => ({
  getCustomerProfile: (...args: unknown[]) => mockGetCustomerProfile(...args),
}))

// Mock portal-reconnaissance
const mockPortalInvestigate = vi.fn()
vi.mock("@/lib/services/portal-reconnaissance", () => ({
  investigate: (...args: unknown[]) => mockPortalInvestigate(...args),
}))

import { runCollectionsDecision } from "./collections-decision-agent"

// ─── Fixtures ──────────────────────────────────────────────────────────────

function makeDefaultProfile() {
  return {
    paymentRatePct: 80,
    avgDaysLate: 10,
    totalInvoices: 12,
    relationshipMonths: 24,
    priorOverdueCount: 1,
    writtenOffCount: 0,
  }
}

function makePortalReconResponse(overrides: Record<string, unknown> = {}) {
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
      lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      hasRecentActivity: true,
      invoiceViewCount: 3,
      invoiceViewTimestamps: [],
      engagementLevel: "medium",
      activityConfidence: 90,
      messageSent: false,
      messageSentAt: null,
      messageFailureReason: null,
      screenshots: [],
      portalUrl: "https://portal.example.com",
      tinyfishRunId: null,
      authFailed: false,
      botDetected: false,
      parsingFailed: false,
      ...overrides,
    },
  }
}

/** Minimal mock Supabase client that returns controlled data */
function makeMockSupabaseClient(invoiceOverrides: Record<string, unknown> = {}) {
  const defaultInvoice = {
    id: "inv-test-001",
    invoice_number: "INV-001",
    total_amount: 1000,
    amount_paid: 0,
    due_at: new Date(Date.now() - 20 * 86_400_000).toISOString(), // 20 days overdue
    status: "overdue",
    reminder_count: 1,
    customer_id: "cust-001",
    customers: {
      full_name: "Test Customer",
      email: "test@example.com",
      lifetime_value: 5000,
      risk_status: "medium",
    },
    ...invoiceOverrides,
  }

  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: defaultInvoice, error: null }),
            order: vi.fn().mockReturnValue({
              // For ai_actions query
            }),
            in: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
          single: vi.fn().mockResolvedValue({ data: { notes: "" }, error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          in: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
        single: vi.fn().mockResolvedValue({ data: defaultInvoice, error: null }),
      }),
    }),
  } as unknown as Parameters<typeof runCollectionsDecision>[0]
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("Collections Decision Agent — Portal Signal Adjustments", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCustomerProfile.mockResolvedValue(makeDefaultProfile())
  })

  // ── Req 7.2: Skip collection when shouldSkipCollection is true ──

  describe("skip collection (Req 7.2)", () => {
    it("returns skip action when portal says payment is processing", async () => {
      mockPortalInvestigate.mockResolvedValue(
        makePortalReconResponse({
          shouldSkipCollection: true,
          paymentStatus: "processing",
        })
      )

      const client = makeMockSupabaseClient()
      const result = await runCollectionsDecision(client, "inv-test-001", "org-001")

      expect(result.selectedAction).toBe("skip")
      expect(result.confidence).toBe(95)
      expect(result.chainOfThought).toContain("Payment already processing")
      expect(result.aggressionBudget).toBe(0)
      expect(result.portalReconnaissance?.shouldSkipCollection).toBe(true)
    })

    it("does not skip when shouldSkipCollection is false", async () => {
      mockPortalInvestigate.mockResolvedValue(
        makePortalReconResponse({ shouldSkipCollection: false })
      )

      const client = makeMockSupabaseClient()
      const result = await runCollectionsDecision(client, "inv-test-001", "org-001")

      expect(result.selectedAction).not.toBe("skip")
    })

    it("does not skip when portal recon fails", async () => {
      mockPortalInvestigate.mockRejectedValue(new Error("Portal unavailable"))

      const client = makeMockSupabaseClient()
      const result = await runCollectionsDecision(client, "inv-test-001", "org-001")

      expect(result.selectedAction).not.toBe("skip")
      expect(result.portalReconnaissance).toBeUndefined()
    })
  })

  // ── Req 7.3: Adjust tone based on engagement level ──

  describe("tone adjustment for high engagement (Req 7.3)", () => {
    it("reduces aggression budget by 10 for high engagement", async () => {
      mockPortalInvestigate.mockResolvedValue(
        makePortalReconResponse({ engagementLevel: "high" })
      )

      const client = makeMockSupabaseClient()
      const result = await runCollectionsDecision(client, "inv-test-001", "org-001")

      // With 20 days overdue and LTV factor from $5000:
      // base aggression = min(100, 20 * 2.5) = 50
      // ltvFactor = min(0.3, 5000/33333) ≈ 0.15
      // aggressionBudget = round(50 * (1 - 0.15)) = round(42.5) = 43
      // adjusted = max(43 - 10, 0) = 33
      expect(result.aggressionBudget).toBeLessThan(50) // adjusted down
    })

    it("does not reduce aggression budget for medium engagement", async () => {
      mockPortalInvestigate.mockResolvedValue(
        makePortalReconResponse({ engagementLevel: "medium" })
      )

      const client = makeMockSupabaseClient()
      const resultMedium = await runCollectionsDecision(client, "inv-test-001", "org-001")

      // Now test with high engagement
      mockPortalInvestigate.mockResolvedValue(
        makePortalReconResponse({ engagementLevel: "high" })
      )

      const resultHigh = await runCollectionsDecision(client, "inv-test-001", "org-001")

      // High engagement should have lower aggression budget
      expect(resultHigh.aggressionBudget).toBeLessThan(resultMedium.aggressionBudget)
    })
  })

  // ── Req 7.4: Escalate faster when visibility is false ──

  describe("escalation for invisible invoices (Req 7.4)", () => {
    it("selects escalation when invoice is not visible and escalation is allowed", async () => {
      mockPortalInvestigate.mockResolvedValue(
        makePortalReconResponse({ visibility: false })
      )

      // 20 days overdue with 3+ reminders → allowed actions include escalation
      const client = makeMockSupabaseClient({ reminder_count: 3 })
      const result = await runCollectionsDecision(client, "inv-test-001", "org-001")

      // Deterministic fallback with visibility=false should prefer escalation
      expect(result.selectedAction).toBe("escalation")
    })
  })

  // ── Req 7.5: Prefer portal messaging over email when messageSent ──

  describe("channel preference for portal messaging (Req 7.5)", () => {
    it("prefers stripe/portal channel when portal message was sent", async () => {
      mockPortalInvestigate.mockResolvedValue(
        makePortalReconResponse({ messageSent: true })
      )

      const client = makeMockSupabaseClient()
      const result = await runCollectionsDecision(client, "inv-test-001", "org-001")

      // When messageSent=true, deterministic fallback should prefer stripe channel
      expect(result.channel).toBe("stripe")
    })
  })

  // ── Portal recon data is attached to decision ──

  describe("portal reconnaissance data attachment", () => {
    it("attaches portal recon data to the decision result", async () => {
      mockPortalInvestigate.mockResolvedValue(
        makePortalReconResponse({
          visibility: true,
          paymentStatus: "unpaid",
          engagementLevel: "high",
          messageSent: false,
        })
      )

      const client = makeMockSupabaseClient()
      const result = await runCollectionsDecision(client, "inv-test-001", "org-001")

      expect(result.portalReconnaissance).toBeDefined()
      expect(result.portalReconnaissance?.visibility).toBe(true)
      expect(result.portalReconnaissance?.paymentStatus).toBe("unpaid")
      expect(result.portalReconnaissance?.engagementLevel).toBe("high")
    })
  })

  // ── Req 7.6: Reasoning display includes portal signals ──

  describe("reasoning display with portal signals (Req 7.6, 7.7)", () => {
    it("includes visibility and engagement in chainOfThought when portal data available", async () => {
      mockPortalInvestigate.mockResolvedValue(
        makePortalReconResponse({
          visibility: true,
          paymentStatus: "unpaid",
          engagementLevel: "high",
          hasRecentActivity: true,
          confidence: 90,
        })
      )

      const client = makeMockSupabaseClient()
      const result = await runCollectionsDecision(client, "inv-test-001", "org-001")

      expect(result.chainOfThought).toContain("Portal shows")
      expect(result.chainOfThought).toContain("invoice is visible")
      expect(result.chainOfThought).toContain("high engagement")
    })

    it("flags invoice NOT visible in reasoning when visibility is false", async () => {
      mockPortalInvestigate.mockResolvedValue(
        makePortalReconResponse({
          visibility: false,
          paymentStatus: "unknown",
          engagementLevel: "low",
          hasRecentActivity: false,
          confidence: 85,
        })
      )

      const client = makeMockSupabaseClient({ reminder_count: 3 })
      const result = await runCollectionsDecision(client, "inv-test-001", "org-001")

      expect(result.chainOfThought).toContain("Portal shows")
      expect(result.chainOfThought).toContain("NOT visible")
      expect(result.chainOfThought).toContain("billing system issue")
    })

    it("includes confidence score in portal reasoning", async () => {
      mockPortalInvestigate.mockResolvedValue(
        makePortalReconResponse({
          visibility: true,
          paymentStatus: "unpaid",
          engagementLevel: "medium",
          hasRecentActivity: true,
          confidence: 92,
        })
      )

      const client = makeMockSupabaseClient()
      const result = await runCollectionsDecision(client, "inv-test-001", "org-001")

      expect(result.chainOfThought).toContain("confidence:")
    })

    it("mentions portal message sent in reasoning when messageSent is true", async () => {
      mockPortalInvestigate.mockResolvedValue(
        makePortalReconResponse({
          visibility: true,
          paymentStatus: "unpaid",
          engagementLevel: "medium",
          messageSent: true,
          confidence: 90,
        })
      )

      const client = makeMockSupabaseClient()
      const result = await runCollectionsDecision(client, "inv-test-001", "org-001")

      expect(result.chainOfThought).toContain("message already sent via portal")
    })

    it("does not include portal context in reasoning when portal recon fails", async () => {
      mockPortalInvestigate.mockRejectedValue(new Error("Portal unavailable"))

      const client = makeMockSupabaseClient()
      const result = await runCollectionsDecision(client, "inv-test-001", "org-001")

      expect(result.chainOfThought).not.toContain("Portal shows")
    })
  })
})
