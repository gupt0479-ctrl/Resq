import { describe, it, expect } from "vitest"
import {
  parsePortalHtml,
  parseTableInvoices,
  parseCardInvoices,
  parseJsonInvoices,
  parseCustomerActivity,
  calculateConfidence,
  parseAmount,
  parseDate,
} from "./portal-html-parser"

// ─── Helper Utilities ──────────────────────────────────────────────────────

describe("parseAmount", () => {
  it("parses plain numbers", () => {
    expect(parseAmount("1500")).toBe(1500)
    expect(parseAmount("99.99")).toBe(99.99)
  })

  it("strips currency symbols and commas", () => {
    expect(parseAmount("$1,500.00")).toBe(1500)
    expect(parseAmount("€2,300.50")).toBe(2300.5)
  })

  it("returns null for empty or invalid input", () => {
    expect(parseAmount(null)).toBeNull()
    expect(parseAmount("")).toBeNull()
    expect(parseAmount("N/A")).toBeNull()
  })
})

describe("parseDate", () => {
  it("passes through ISO dates", () => {
    expect(parseDate("2025-01-15")).toBe("2025-01-15")
    expect(parseDate("2025-01-15T10:00:00.000Z")).toBe("2025-01-15T10:00:00.000Z")
  })

  it("parses common date formats", () => {
    const result = parseDate("Jan 15, 2025")
    expect(result).toBeTruthy()
    expect(result).toContain("2025")
  })

  it("returns null for empty or invalid input", () => {
    expect(parseDate(null)).toBeNull()
    expect(parseDate("")).toBeNull()
    expect(parseDate("   ")).toBeNull()
  })
})

// ─── Table-Based Extraction ────────────────────────────────────────────────

describe("parseTableInvoices", () => {
  it("extracts invoices from a standard table layout", () => {
    const html = `
      <table>
        <thead>
          <tr><th>Invoice #</th><th>Amount</th><th>Due Date</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr><td>INV-001</td><td>$1,500.00</td><td>2025-01-15</td><td>unpaid</td></tr>
          <tr><td>INV-002</td><td>$750.00</td><td>2025-02-01</td><td>paid</td></tr>
        </tbody>
      </table>
    `
    const { invoices, errors } = parseTableInvoices(html)
    expect(errors).toHaveLength(0)
    expect(invoices).toHaveLength(2)
    expect(invoices[0].invoiceNumber).toBe("INV-001")
    expect(invoices[0].amount).toBe(1500)
    expect(invoices[0].status).toBe("unpaid")
    expect(invoices[1].invoiceNumber).toBe("INV-002")
    expect(invoices[1].amount).toBe(750)
    expect(invoices[1].status).toBe("paid")
  })

  it("handles tables with payment date and method columns", () => {
    const html = `
      <table>
        <thead>
          <tr><th>Invoice Number</th><th>Total</th><th>Status</th><th>Payment Date</th><th>Payment Method</th></tr>
        </thead>
        <tbody>
          <tr><td>INV-100</td><td>$2,000.00</td><td>paid</td><td>2025-01-10</td><td>ACH</td></tr>
        </tbody>
      </table>
    `
    const { invoices } = parseTableInvoices(html)
    expect(invoices).toHaveLength(1)
    expect(invoices[0].paymentDate).toBe("2025-01-10")
    expect(invoices[0].paymentMethod).toBe("ACH")
  })

  it("returns empty for non-invoice tables", () => {
    const html = `
      <table>
        <thead><tr><th>Name</th><th>Email</th></tr></thead>
        <tbody><tr><td>John</td><td>john@example.com</td></tr></tbody>
      </table>
    `
    const { invoices } = parseTableInvoices(html)
    expect(invoices).toHaveLength(0)
  })

  it("returns empty for HTML with no tables", () => {
    const { invoices } = parseTableInvoices("<div>No tables here</div>")
    expect(invoices).toHaveLength(0)
  })
})

// ─── Card-Based Extraction ─────────────────────────────────────────────────

describe("parseCardInvoices", () => {
  it("extracts invoices from card-based layouts", () => {
    const html = `
      <div class="invoice-card">
        <span>Invoice #: <strong>INV-200</strong></span>
        <span>Amount: <strong>$3,200.00</strong></span>
        <span>Due Date: <strong>2025-03-01</strong></span>
        <span>Status: <strong>unpaid</strong></span>
      </div>
    `
    const { invoices, errors } = parseCardInvoices(html)
    expect(errors).toHaveLength(0)
    expect(invoices).toHaveLength(1)
    expect(invoices[0].invoiceNumber).toBe("INV-200")
    expect(invoices[0].amount).toBe(3200)
    expect(invoices[0].status).toBe("unpaid")
  })

  it("extracts from data attributes", () => {
    const html = `
      <article class="card invoice-item" data-invoice-number="INV-300" data-amount="500" data-status="processing">
        <p>Invoice details</p>
      </article>
    `
    const { invoices } = parseCardInvoices(html)
    expect(invoices).toHaveLength(1)
    expect(invoices[0].invoiceNumber).toBe("INV-300")
    expect(invoices[0].amount).toBe(500)
    expect(invoices[0].status).toBe("processing")
  })

  it("returns empty for non-invoice cards", () => {
    const html = `<div class="user-card"><span>Name: John</span></div>`
    const { invoices } = parseCardInvoices(html)
    expect(invoices).toHaveLength(0)
  })
})

// ─── JSON-Embedded Extraction ──────────────────────────────────────────────

describe("parseJsonInvoices", () => {
  it("extracts from script type=application/json", () => {
    const html = `
      <script type="application/json">
        {"invoices": [
          {"invoiceNumber": "INV-400", "amount": 1200, "status": "unpaid", "dueDate": "2025-04-01"}
        ]}
      </script>
    `
    const { invoices, errors } = parseJsonInvoices(html)
    expect(errors).toHaveLength(0)
    expect(invoices).toHaveLength(1)
    expect(invoices[0].invoiceNumber).toBe("INV-400")
    expect(invoices[0].amount).toBe(1200)
    expect(invoices[0].status).toBe("unpaid")
  })

  it("extracts from data-portal-data attribute", () => {
    const html = `
      <div data-portal-data="{&quot;invoices&quot;: [{&quot;invoice_number&quot;: &quot;INV-500&quot;, &quot;amount&quot;: 800}]}"></div>
    `
    const { invoices } = parseJsonInvoices(html)
    expect(invoices).toHaveLength(1)
    expect(invoices[0].invoiceNumber).toBe("INV-500")
    expect(invoices[0].amount).toBe(800)
  })

  it("extracts from window.__PORTAL_DATA__ assignment", () => {
    const html = `
      <script>
        window.__PORTAL_DATA__ = {"invoices": [{"invoiceNumber": "INV-600", "amount": 999, "status": "paid"}]};
      </script>
    `
    const { invoices } = parseJsonInvoices(html)
    expect(invoices).toHaveLength(1)
    expect(invoices[0].invoiceNumber).toBe("INV-600")
    expect(invoices[0].amount).toBe(999)
    expect(invoices[0].status).toBe("paid")
  })

  it("handles snake_case field names", () => {
    const html = `
      <script type="application/json">
        {"invoices": [{"invoice_number": "INV-700", "amount_due": 450, "payment_status": "processing"}]}
      </script>
    `
    const { invoices } = parseJsonInvoices(html)
    expect(invoices).toHaveLength(1)
    expect(invoices[0].invoiceNumber).toBe("INV-700")
    expect(invoices[0].status).toBe("processing")
  })

  it("records errors for malformed JSON", () => {
    const html = `<script type="application/json">{broken json</script>`
    const { invoices, errors } = parseJsonInvoices(html)
    expect(invoices).toHaveLength(0)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain("JSON script parse error")
  })
})

// ─── Customer Activity Extraction ──────────────────────────────────────────

describe("parseCustomerActivity", () => {
  it("extracts last login from HTML label", () => {
    const html = `<div>Last Login: <span>2025-06-01T10:00:00.000Z</span></div>`
    const { activity } = parseCustomerActivity(html)
    expect(activity.lastLoginAt).toBe("2025-06-01T10:00:00.000Z")
  })

  it("extracts view count", () => {
    const html = `<div>Invoice Views: <span>5</span></div>`
    const { activity } = parseCustomerActivity(html)
    expect(activity.viewCount).toBe(5)
  })

  it("extracts view timestamps from JSON", () => {
    const html = `<script>"viewTimestamps": ["2025-06-01T10:00:00.000Z", "2025-06-02T10:00:00.000Z"]</script>`
    const { activity } = parseCustomerActivity(html)
    expect(activity.viewTimestamps).toHaveLength(2)
  })

  it("extracts from data attributes", () => {
    const html = `<div data-last-login="2025-05-20T08:00:00.000Z" data-view-count="3"></div>`
    const { activity } = parseCustomerActivity(html)
    expect(activity.lastLoginAt).toBe("2025-05-20T08:00:00.000Z")
    expect(activity.viewCount).toBe(3)
  })

  it("returns nulls when no activity data found", () => {
    const { activity } = parseCustomerActivity("<div>Nothing here</div>")
    expect(activity.lastLoginAt).toBeNull()
    expect(activity.viewCount).toBeNull()
    expect(activity.viewTimestamps).toHaveLength(0)
  })
})

// ─── Confidence Scoring ────────────────────────────────────────────────────

describe("calculateConfidence", () => {
  it("returns 0 for no data", () => {
    expect(calculateConfidence([], { lastLoginAt: null, viewCount: null, viewTimestamps: [] })).toBe(0)
  })

  it("returns 100 for fully populated data", () => {
    const invoice = {
      invoiceNumber: "INV-001",
      amount: 1000,
      dueDate: "2025-01-01",
      status: "unpaid",
      paymentDate: "2025-01-10",
      paymentMethod: "ACH",
    }
    const activity = {
      lastLoginAt: "2025-01-01",
      viewCount: 5,
      viewTimestamps: ["2025-01-01"],
    }
    expect(calculateConfidence([invoice], activity)).toBe(100)
  })

  it("returns partial score for partially populated data", () => {
    const invoice = {
      invoiceNumber: "INV-001",
      amount: 1000,
      dueDate: null,
      status: null,
      paymentDate: null,
      paymentMethod: null,
    }
    const activity = { lastLoginAt: null, viewCount: null, viewTimestamps: [] }
    const score = calculateConfidence([invoice], activity)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(100)
  })
})

// ─── Main Parser (Integration) ─────────────────────────────────────────────

describe("parsePortalHtml", () => {
  it("returns empty result for null/empty input", () => {
    const result = parsePortalHtml("")
    expect(result.invoices).toHaveLength(0)
    expect(result.confidence).toBe(0)
    expect(result.parsingErrors).toContain("No HTML content provided")
  })

  it("merges results from multiple extraction strategies", () => {
    const html = `
      <table>
        <thead><tr><th>Invoice #</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody><tr><td>INV-001</td><td>$500</td><td>unpaid</td></tr></tbody>
      </table>
      <script type="application/json">
        {"invoices": [{"invoiceNumber": "INV-002", "amount": 750, "status": "paid"}]}
      </script>
      <div>Last Login: <span>2025-06-01T10:00:00.000Z</span></div>
      <div>Invoice Views: <span>3</span></div>
    `
    const result = parsePortalHtml(html)
    expect(result.invoices.length).toBeGreaterThanOrEqual(2)
    expect(result.customerActivity.lastLoginAt).toBe("2025-06-01T10:00:00.000Z")
    expect(result.customerActivity.viewCount).toBe(3)
    expect(result.confidence).toBeGreaterThan(0)
  })

  it("deduplicates invoices by invoice number across strategies", () => {
    const html = `
      <table>
        <thead><tr><th>Invoice #</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody><tr><td>INV-001</td><td>$500</td><td>unpaid</td></tr></tbody>
      </table>
      <script type="application/json">
        {"invoices": [{"invoiceNumber": "INV-001", "amount": 500, "status": "unpaid"}]}
      </script>
    `
    const result = parsePortalHtml(html)
    const inv001 = result.invoices.filter((i) => i.invoiceNumber === "INV-001")
    expect(inv001).toHaveLength(1)
  })

  it("handles malformed HTML gracefully", () => {
    const html = `<div><table><tr><td>broken</table></div>`
    const result = parsePortalHtml(html)
    expect(result).toBeDefined()
    expect(result.parsingErrors).toBeDefined()
  })
})
