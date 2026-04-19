import { describe, it, expect } from "vitest"
import { formatInvoice, formatActivity, formatPortalData } from "./portal-pretty-printer"
import type { ParsedInvoice, ParsedActivity, ParsedPortalData } from "@/lib/tinyfish/portal-schemas"

// ─── formatInvoice ─────────────────────────────────────────────────────────

describe("formatInvoice", () => {
  it("formats a fully populated invoice", () => {
    const invoice: ParsedInvoice = {
      invoiceNumber: "INV-001",
      amount: 1500,
      dueDate: "2025-01-15",
      status: "unpaid",
      paymentDate: "2025-01-20",
      paymentMethod: "ACH",
    }
    const result = formatInvoice(invoice)
    expect(result).toContain("Invoice: INV-001")
    expect(result).toContain("Amount: $1500.00")
    expect(result).toContain("Due Date: 2025-01-15")
    expect(result).toContain("Status: unpaid")
    expect(result).toContain("Payment Date: 2025-01-20")
    expect(result).toContain("Payment Method: ACH")
  })

  it("handles null invoice number", () => {
    const invoice: ParsedInvoice = {
      invoiceNumber: null,
      amount: 500,
      dueDate: null,
      status: null,
      paymentDate: null,
      paymentMethod: null,
    }
    const result = formatInvoice(invoice)
    expect(result).toContain("Invoice: N/A")
    expect(result).toContain("Amount: $500.00")
    expect(result).not.toContain("Due Date")
    expect(result).not.toContain("Status")
  })

  it("handles all-null invoice", () => {
    const invoice: ParsedInvoice = {
      invoiceNumber: null,
      amount: null,
      dueDate: null,
      status: null,
      paymentDate: null,
      paymentMethod: null,
    }
    const result = formatInvoice(invoice)
    expect(result).toBe("Invoice: N/A")
  })
})

// ─── formatActivity ────────────────────────────────────────────────────────

describe("formatActivity", () => {
  it("formats fully populated activity", () => {
    const activity: ParsedActivity = {
      lastLoginAt: "2025-06-01T10:00:00.000Z",
      viewCount: 5,
      viewTimestamps: ["2025-06-01T10:00:00.000Z", "2025-06-02T10:00:00.000Z"],
    }
    const result = formatActivity(activity)
    expect(result).toContain("Customer Activity:")
    expect(result).toContain("Last Login: 2025-06-01T10:00:00.000Z")
    expect(result).toContain("Invoice Views: 5")
    expect(result).toContain("View Timestamps: 2025-06-01T10:00:00.000Z, 2025-06-02T10:00:00.000Z")
  })

  it("shows N/A for null last login", () => {
    const activity: ParsedActivity = {
      lastLoginAt: null,
      viewCount: null,
      viewTimestamps: [],
    }
    const result = formatActivity(activity)
    expect(result).toContain("Last Login: N/A")
    expect(result).not.toContain("Invoice Views")
    expect(result).not.toContain("View Timestamps")
  })

  it("omits view timestamps when empty", () => {
    const activity: ParsedActivity = {
      lastLoginAt: "2025-06-01T10:00:00.000Z",
      viewCount: 3,
      viewTimestamps: [],
    }
    const result = formatActivity(activity)
    expect(result).toContain("Invoice Views: 3")
    expect(result).not.toContain("View Timestamps")
  })
})

// ─── formatPortalData ──────────────────────────────────────────────────────

describe("formatPortalData", () => {
  it("formats complete portal data with invoices and activity", () => {
    const data: ParsedPortalData = {
      invoices: [
        {
          invoiceNumber: "INV-001",
          amount: 1500,
          dueDate: "2025-01-15",
          status: "unpaid",
          paymentDate: null,
          paymentMethod: null,
        },
      ],
      customerActivity: {
        lastLoginAt: "2025-06-01T10:00:00.000Z",
        viewCount: 3,
        viewTimestamps: [],
      },
      confidence: 85,
      parsingErrors: [],
    }
    const result = formatPortalData(data)
    expect(result).toContain("Portal Data Summary (Confidence: 85%)")
    expect(result).toContain("--- Invoices ---")
    expect(result).toContain("Invoice: INV-001")
    expect(result).toContain("--- Customer Activity ---")
    expect(result).toContain("Last Login: 2025-06-01T10:00:00.000Z")
  })

  it("shows 'No invoices found' when empty", () => {
    const data: ParsedPortalData = {
      invoices: [],
      customerActivity: { lastLoginAt: null, viewCount: null, viewTimestamps: [] },
      confidence: 0,
      parsingErrors: [],
    }
    const result = formatPortalData(data)
    expect(result).toContain("No invoices found.")
  })

  it("includes parsing errors section when present", () => {
    const data: ParsedPortalData = {
      invoices: [],
      customerActivity: { lastLoginAt: null, viewCount: null, viewTimestamps: [] },
      confidence: 0,
      parsingErrors: ["Failed to parse table row", "Missing selector"],
    }
    const result = formatPortalData(data)
    expect(result).toContain("--- Parsing Errors ---")
    expect(result).toContain("- Failed to parse table row")
    expect(result).toContain("- Missing selector")
  })

  it("omits parsing errors section when none", () => {
    const data: ParsedPortalData = {
      invoices: [],
      customerActivity: { lastLoginAt: null, viewCount: null, viewTimestamps: [] },
      confidence: 0,
      parsingErrors: [],
    }
    const result = formatPortalData(data)
    expect(result).not.toContain("--- Parsing Errors ---")
  })

  it("formats multiple invoices", () => {
    const data: ParsedPortalData = {
      invoices: [
        { invoiceNumber: "INV-001", amount: 1000, dueDate: null, status: "unpaid", paymentDate: null, paymentMethod: null },
        { invoiceNumber: "INV-002", amount: 2000, dueDate: null, status: "paid", paymentDate: null, paymentMethod: null },
      ],
      customerActivity: { lastLoginAt: null, viewCount: null, viewTimestamps: [] },
      confidence: 50,
      parsingErrors: [],
    }
    const result = formatPortalData(data)
    expect(result).toContain("Invoice: INV-001")
    expect(result).toContain("Invoice: INV-002")
    expect(result).toContain("Amount: $1000.00")
    expect(result).toContain("Amount: $2000.00")
  })
})
