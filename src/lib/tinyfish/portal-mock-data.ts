import type {
  PortalReconnaissanceResponse,
  PortalReconScenario,
  Screenshot,
} from "./portal-schemas"
import { generateMockScreenshot } from "./mock-screenshots"

// Deterministic timestamp for demo stability
const DEMO_FIXED_ISO = "2026-04-11T18:00:00.000Z"

function createMockScreenshot(
  step: Screenshot["step"],
  invoiceId: string,
  scenario: PortalReconScenario,
  timestamp: string = DEMO_FIXED_ISO
): Screenshot {
  return {
    step,
    url: generateMockScreenshot(step, scenario),
    timestamp,
    invoiceId,
  }
}

// ─── Portal Reconnaissance Fixtures ────────────────────────────────────────

export const PORTAL_RECON_FIXTURES: Record<PortalReconScenario, PortalReconnaissanceResponse> = {
  invoice_visible_unpaid: {
    mode: "mock",
    degradedFromLive: false,
    warning: null,
    result: {
      // Invoice visibility
      visibility: true,
      visibilityReason: null,
      visibilityConfidence: 95,

      // Payment status
      paymentStatus: "unpaid",
      paymentDate: null,
      paymentMethod: null,
      shouldSkipCollection: false,

      // Customer activity
      lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      hasRecentActivity: true,
      invoiceViewCount: 3,
      invoiceViewTimestamps: [
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      ],
      engagementLevel: "high",
      activityConfidence: 90,

      // Messaging
      messageSent: false,
      messageSentAt: null,
      messageFailureReason: null,

      // Proof and audit
      screenshots: [
        createMockScreenshot("login", "mock-invoice-001", "invoice_visible_unpaid"),
        createMockScreenshot("invoice_list", "mock-invoice-001", "invoice_visible_unpaid"),
        createMockScreenshot("invoice_detail", "mock-invoice-001", "invoice_visible_unpaid"),
      ],
      portalUrl: "https://customer-portal.example.com",
      tinyfishRunId: null,

      // Error handling
      authFailed: false,
      botDetected: false,
      parsingFailed: false,
    },
  },

  invoice_visible_processing: {
    mode: "mock",
    degradedFromLive: false,
    warning: null,
    result: {
      // Invoice visibility
      visibility: true,
      visibilityReason: null,
      visibilityConfidence: 95,

      // Payment status
      paymentStatus: "processing",
      paymentDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      paymentMethod: "ACH",
      shouldSkipCollection: true,

      // Customer activity
      lastLoginAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      hasRecentActivity: true,
      invoiceViewCount: 5,
      invoiceViewTimestamps: [
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      ],
      engagementLevel: "high",
      activityConfidence: 90,

      // Messaging
      messageSent: false,
      messageSentAt: null,
      messageFailureReason: "Payment already processing, message not needed",

      // Proof and audit
      screenshots: [
        createMockScreenshot("login", "mock-invoice-002", "invoice_visible_processing"),
        createMockScreenshot("invoice_list", "mock-invoice-002", "invoice_visible_processing"),
        createMockScreenshot("invoice_detail", "mock-invoice-002", "invoice_visible_processing"),
        createMockScreenshot("payment_status", "mock-invoice-002", "invoice_visible_processing"),
      ],
      portalUrl: "https://customer-portal.example.com",
      tinyfishRunId: null,

      // Error handling
      authFailed: false,
      botDetected: false,
      parsingFailed: false,
    },
  },

  invoice_not_visible: {
    mode: "mock",
    degradedFromLive: false,
    warning: null,
    result: {
      // Invoice visibility
      visibility: false,
      visibilityReason: "not in customer view",
      visibilityConfidence: 85,

      // Payment status
      paymentStatus: "unknown",
      paymentDate: null,
      paymentMethod: null,
      shouldSkipCollection: false,

      // Customer activity
      lastLoginAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
      hasRecentActivity: false,
      invoiceViewCount: 0,
      invoiceViewTimestamps: [],
      engagementLevel: "low",
      activityConfidence: 60,

      // Messaging
      messageSent: false,
      messageSentAt: null,
      messageFailureReason: "Invoice not visible, cannot send portal message",

      // Proof and audit
      screenshots: [
        createMockScreenshot("login", "mock-invoice-003", "invoice_not_visible"),
        createMockScreenshot("invoice_list", "mock-invoice-003", "invoice_not_visible"),
      ],
      portalUrl: "https://customer-portal.example.com",
      tinyfishRunId: null,

      // Error handling
      authFailed: false,
      botDetected: false,
      parsingFailed: false,
    },
  },

  high_engagement: {
    mode: "mock",
    degradedFromLive: false,
    warning: null,
    result: {
      // Invoice visibility
      visibility: true,
      visibilityReason: null,
      visibilityConfidence: 95,

      // Payment status
      paymentStatus: "unpaid",
      paymentDate: null,
      paymentMethod: null,
      shouldSkipCollection: false,

      // Customer activity
      lastLoginAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      hasRecentActivity: true,
      invoiceViewCount: 8,
      invoiceViewTimestamps: [
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      ],
      engagementLevel: "high",
      activityConfidence: 95,

      // Messaging
      messageSent: true,
      messageSentAt: DEMO_FIXED_ISO,
      messageFailureReason: null,

      // Proof and audit
      screenshots: [
        createMockScreenshot("login", "mock-invoice-004", "high_engagement"),
        createMockScreenshot("invoice_list", "mock-invoice-004", "high_engagement"),
        createMockScreenshot("invoice_detail", "mock-invoice-004", "high_engagement"),
        createMockScreenshot("message_sent", "mock-invoice-004", "high_engagement"),
      ],
      portalUrl: "https://customer-portal.example.com",
      tinyfishRunId: null,

      // Error handling
      authFailed: false,
      botDetected: false,
      parsingFailed: false,
    },
  },

  low_engagement: {
    mode: "mock",
    degradedFromLive: false,
    warning: null,
    result: {
      // Invoice visibility
      visibility: true,
      visibilityReason: null,
      visibilityConfidence: 95,

      // Payment status
      paymentStatus: "unpaid",
      paymentDate: null,
      paymentMethod: null,
      shouldSkipCollection: false,

      // Customer activity
      lastLoginAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
      hasRecentActivity: false,
      invoiceViewCount: 0,
      invoiceViewTimestamps: [],
      engagementLevel: "low",
      activityConfidence: 80,

      // Messaging
      messageSent: false,
      messageSentAt: null,
      messageFailureReason: "Low engagement, email preferred over portal message",

      // Proof and audit
      screenshots: [
        createMockScreenshot("login", "mock-invoice-005", "low_engagement"),
        createMockScreenshot("invoice_list", "mock-invoice-005", "low_engagement"),
        createMockScreenshot("invoice_detail", "mock-invoice-005", "low_engagement"),
      ],
      portalUrl: "https://customer-portal.example.com",
      tinyfishRunId: null,

      // Error handling
      authFailed: false,
      botDetected: false,
      parsingFailed: false,
    },
  },
}

/**
 * Get mock portal reconnaissance data for a given scenario.
 * Defaults to invoice_visible_unpaid if scenario not specified.
 */
export function getMockPortalRecon(
  scenario: PortalReconScenario = "invoice_visible_unpaid",
  invoiceId: string
): PortalReconnaissanceResponse {
  const fixture = PORTAL_RECON_FIXTURES[scenario]
  
  // Clone and update with actual invoice ID
  return {
    ...fixture,
    result: {
      ...fixture.result,
      screenshots: fixture.result.screenshots.map(s => ({
        ...s,
        invoiceId,
      })),
    },
  }
}

/**
 * Deterministically select a scenario based on invoice ID hash.
 * This ensures the same invoice always gets the same mock scenario.
 */
export function selectScenarioByInvoiceId(invoiceId: string): PortalReconScenario {
  const scenarios: PortalReconScenario[] = [
    "invoice_visible_unpaid",
    "invoice_visible_processing",
    "invoice_not_visible",
    "high_engagement",
    "low_engagement",
  ]
  
  // Simple hash: sum of character codes
  let hash = 0
  for (let i = 0; i < invoiceId.length; i++) {
    hash += invoiceId.charCodeAt(i)
  }
  
  return scenarios[hash % scenarios.length]
}
