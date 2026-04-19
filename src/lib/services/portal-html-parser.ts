/**
 * Portal HTML Parser
 *
 * Extracts invoice data and customer activity from raw portal HTML.
 * Supports three common portal formats:
 *   1. Table-based layouts (rows with invoice fields)
 *   2. Card-based layouts (div/section blocks per invoice)
 *   3. JSON-embedded data (script tags or data attributes)
 *
 * Returns confidence scores (0-100) based on how many fields were matched.
 */

import type { ParsedPortalData, ParsedInvoice, ParsedActivity } from "@/lib/tinyfish/portal-schemas"

// ─── Constants ─────────────────────────────────────────────────────────────

const INVOICE_FIELDS = ["invoiceNumber", "amount", "dueDate", "status", "paymentDate", "paymentMethod"] as const
const ACTIVITY_FIELDS = ["lastLoginAt", "viewCount", "viewTimestamps"] as const

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Safely parse a number from a string, stripping currency symbols and commas. */
export function parseAmount(raw: string | null | undefined): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/[^0-9.\-]/g, "")
  const num = parseFloat(cleaned)
  return Number.isFinite(num) ? num : null
}

/** Normalise a date string. Returns ISO-ish string or null. */
export function parseDate(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed
  // Try native Date parse
  const d = new Date(trimmed)
  if (!isNaN(d.getTime())) return d.toISOString()
  return null
}

/** Strip HTML tags and collapse whitespace. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

/** Extract text content between matching tags (simple, non-greedy). */
function extractTagContent(html: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi")
  const results: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    results.push(m[1].trim())
  }
  return results
}

// ─── Table-Based Extraction ────────────────────────────────────────────────

/**
 * Parse invoices from an HTML table layout.
 * Looks for <table> elements with header rows containing invoice-related labels,
 * then extracts data from subsequent <tr> rows.
 */
export function parseTableInvoices(html: string): { invoices: ParsedInvoice[]; errors: string[] } {
  const invoices: ParsedInvoice[] = []
  const errors: string[] = []

  // Find all tables
  const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi
  let tableMatch: RegExpExecArray | null

  while ((tableMatch = tableRe.exec(html)) !== null) {
    const tableHtml = tableMatch[1]

    // Extract header cells to map column positions
    const headerRow = extractTagContent(tableHtml, "thead")
    const headerSource = headerRow.length > 0 ? headerRow[0] : ""
    const thCells = extractTagContent(headerSource || tableHtml, "th")

    if (thCells.length === 0) continue

    const colMap = mapColumns(thCells)
    if (!colMap) continue

    // Extract body rows
    const tbodyContent = extractTagContent(tableHtml, "tbody")
    const rowSource = tbodyContent.length > 0 ? tbodyContent[0] : tableHtml
    const rows = extractTagContent(rowSource, "tr")

    for (const row of rows) {
      const cells = extractTagContent(row, "td")
      if (cells.length === 0) continue

      try {
        invoices.push(extractInvoiceFromCells(cells, colMap))
      } catch (e) {
        errors.push(`Table row parse error: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  return { invoices, errors }
}

/** Map header labels to column indices. Returns null if no invoice-related headers found. */
function mapColumns(headers: string[]): Record<string, number> | null {
  const map: Record<string, number> = {}
  const labels = headers.map((h) => stripHtml(h).toLowerCase())

  const patterns: [string, RegExp][] = [
    ["invoiceNumber", /invoice\s*#?|inv\s*(?:no|num|number)/],
    ["amount", /amount|total|balance|due/],
    ["dueDate", /due\s*date|date\s*due|due/],
    ["status", /status|state|payment\s*status/],
    ["paymentDate", /pay(?:ment)?\s*date|paid\s*(?:on|date)/],
    ["paymentMethod", /pay(?:ment)?\s*method|method/],
  ]

  for (const [field, re] of patterns) {
    const idx = labels.findIndex((l) => re.test(l))
    if (idx !== -1) map[field] = idx
  }

  // Need at least one invoice-related column to consider this a valid invoice table
  if (Object.keys(map).length === 0) return null
  return map
}

function extractInvoiceFromCells(cells: string[], colMap: Record<string, number>): ParsedInvoice {
  const get = (field: string): string | null => {
    const idx = colMap[field]
    if (idx === undefined || idx >= cells.length) return null
    const text = stripHtml(cells[idx])
    return text || null
  }

  return {
    invoiceNumber: get("invoiceNumber"),
    amount: parseAmount(get("amount")),
    dueDate: parseDate(get("dueDate")),
    status: get("status"),
    paymentDate: parseDate(get("paymentDate")),
    paymentMethod: get("paymentMethod"),
  }
}

// ─── Card-Based Extraction ─────────────────────────────────────────────────

/**
 * Parse invoices from card-based layouts.
 * Looks for repeated div/section/article blocks with invoice-related labels
 * and their adjacent values.
 */
export function parseCardInvoices(html: string): { invoices: ParsedInvoice[]; errors: string[] } {
  const invoices: ParsedInvoice[] = []
  const errors: string[] = []

  // Match card containers: <div class="...card..."> or <article> or <section class="...invoice...">
  const cardRe = /<((?:div|article|section)[^>]*class="[^"]*(?:card|invoice)[^"]*"[^>]*)>([\s\S]*?)<\/(?:div|article|section)>/gi
  let cardMatch: RegExpExecArray | null

  while ((cardMatch = cardRe.exec(html)) !== null) {
    try {
      // Combine the opening tag (for data attributes) with inner content
      const openingTag = cardMatch[1]
      const innerContent = cardMatch[2]
      const invoice = extractInvoiceFromCard(openingTag + " " + innerContent)
      if (invoice) invoices.push(invoice)
    } catch (e) {
      errors.push(`Card parse error: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { invoices, errors }
}

/** Extract invoice fields from a card block using label-value patterns. */
function extractInvoiceFromCard(cardHtml: string): ParsedInvoice | null {
  const fieldPatterns: [keyof ParsedInvoice, RegExp[]][] = [
    ["invoiceNumber", [
      /invoice\s*#?\s*:?\s*<[^>]*>\s*([^<]+)/i,
      /invoice\s*(?:number|no|#)\s*:?\s*([A-Z0-9][\w-]*)/i,
      /data-invoice-number="([^"]+)"/i,
    ]],
    ["amount", [
      /amount\s*:?\s*<[^>]*>\s*([^<]+)/i,
      /total\s*:?\s*<[^>]*>\s*([^<]+)/i,
      /(?:amount|total|balance)\s*:?\s*\$?\s*([\d,]+\.?\d*)/i,
      /data-amount="([^"]+)"/i,
    ]],
    ["dueDate", [
      /due\s*(?:date)?\s*:?\s*<[^>]*>\s*([^<]+)/i,
      /due\s*(?:date)?\s*:?\s*([A-Za-z0-9\s,\-/]+)/i,
      /data-due-date="([^"]+)"/i,
    ]],
    ["status", [
      /status\s*:?\s*<[^>]*>\s*([^<]+)/i,
      /(?:payment\s*)?status\s*:?\s*([A-Za-z]+)/i,
      /data-status="([^"]+)"/i,
      /class="[^"]*status[^"]*"[^>]*>\s*([^<]+)/i,
    ]],
    ["paymentDate", [
      /paid?\s*(?:on|date)\s*:?\s*<[^>]*>\s*([^<]+)/i,
      /payment\s*date\s*:?\s*([A-Za-z0-9\s,\-/]+)/i,
      /data-payment-date="([^"]+)"/i,
    ]],
    ["paymentMethod", [
      /(?:payment\s*)?method\s*:?\s*<[^>]*>\s*([^<]+)/i,
      /(?:payment\s*)?method\s*:?\s*([A-Za-z\s]+)/i,
      /data-payment-method="([^"]+)"/i,
    ]],
  ]

  const invoice: ParsedInvoice = {
    invoiceNumber: null,
    amount: null,
    dueDate: null,
    status: null,
    paymentDate: null,
    paymentMethod: null,
  }

  let matchCount = 0

  for (const [field, patterns] of fieldPatterns) {
    for (const re of patterns) {
      const m = re.exec(cardHtml)
      if (m && m[1]) {
        const val = m[1].trim()
        if (field === "amount") {
          invoice.amount = parseAmount(val)
        } else if (field === "dueDate") {
          invoice.dueDate = parseDate(val)
        } else if (field === "paymentDate") {
          invoice.paymentDate = parseDate(val)
        } else if (field === "invoiceNumber") {
          invoice.invoiceNumber = val
        } else if (field === "status") {
          invoice.status = val
        } else if (field === "paymentMethod") {
          invoice.paymentMethod = val
        }
        matchCount++
        break
      }
    }
  }

  // Need at least one field to consider this a valid invoice card
  if (matchCount === 0) return null

  return invoice
}

// ─── JSON-Embedded Extraction ──────────────────────────────────────────────

/**
 * Parse invoices from JSON data embedded in the HTML.
 * Looks for <script type="application/json"> or data-portal-data attributes.
 */
export function parseJsonInvoices(html: string): { invoices: ParsedInvoice[]; errors: string[] } {
  const invoices: ParsedInvoice[] = []
  const errors: string[] = []

  // Strategy 1: <script type="application/json"> or <script type="application/ld+json">
  const scriptRe = /<script[^>]*type="application\/(?:ld\+)?json"[^>]*>([\s\S]*?)<\/script>/gi
  let scriptMatch: RegExpExecArray | null

  while ((scriptMatch = scriptRe.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(scriptMatch[1])
      extractInvoicesFromJson(parsed, invoices)
    } catch (e) {
      errors.push(`JSON script parse error: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // Strategy 2: data-portal-data attribute
  const dataAttrRe = /data-portal-data="([^"]*)"/gi
  let dataMatch: RegExpExecArray | null

  while ((dataMatch = dataAttrRe.exec(html)) !== null) {
    try {
      const decoded = dataMatch[1]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'")
      const parsed = JSON.parse(decoded)
      extractInvoicesFromJson(parsed, invoices)
    } catch (e) {
      errors.push(`JSON data-attr parse error: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // Strategy 3: window.__PORTAL_DATA__ or similar global assignments
  const globalRe = /(?:window\.__PORTAL_DATA__|window\.portalData|var\s+portalData)\s*=\s*(\{[\s\S]*?\});/gi
  let globalMatch: RegExpExecArray | null

  while ((globalMatch = globalRe.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(globalMatch[1])
      extractInvoicesFromJson(parsed, invoices)
    } catch (e) {
      errors.push(`JSON global var parse error: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { invoices, errors }
}

/** Recursively extract invoice objects from a parsed JSON structure. */
function extractInvoicesFromJson(data: unknown, out: ParsedInvoice[]): void {
  if (!data || typeof data !== "object") return

  if (Array.isArray(data)) {
    for (const item of data) {
      extractInvoicesFromJson(item, out)
    }
    return
  }

  const obj = data as Record<string, unknown>

  // Check nested properties that commonly hold invoice arrays FIRST
  // (a wrapper like {"invoices": [...]} should recurse, not be treated as an invoice)
  const invoiceKeys = ["invoices", "bills", "items", "data", "records", "results"]
  let recursed = false
  for (const key of invoiceKeys) {
    if (Array.isArray(obj[key])) {
      extractInvoicesFromJson(obj[key], out)
      recursed = true
    }
  }
  if (recursed) return

  // Check if this object looks like an invoice
  if (looksLikeInvoice(obj)) {
    out.push(normalizeJsonInvoice(obj))
  }
}

function looksLikeInvoice(obj: Record<string, unknown>): boolean {
  const keys = Object.keys(obj).map((k) => k.toLowerCase())
  const invoiceIndicators = ["invoice", "amount", "total", "due", "status", "balance"]
  return invoiceIndicators.some((ind) => keys.some((k) => k.includes(ind)))
}

function normalizeJsonInvoice(obj: Record<string, unknown>): ParsedInvoice {
  const find = (candidates: string[]): unknown => {
    for (const key of candidates) {
      // Try exact match first
      if (obj[key] !== undefined) return obj[key]
      // Try case-insensitive
      const found = Object.entries(obj).find(([k]) => k.toLowerCase() === key.toLowerCase())
      if (found) return found[1]
    }
    return null
  }

  const rawAmount = find(["amount", "total", "balance", "amountDue", "amount_due", "totalDue", "total_due"])
  const rawDueDate = find(["dueDate", "due_date", "dateDue", "date_due", "due"])
  const rawPaymentDate = find(["paymentDate", "payment_date", "paidDate", "paid_date", "paidOn", "paid_on"])

  return {
    invoiceNumber: String(find(["invoiceNumber", "invoice_number", "invoiceNo", "invoice_no", "invoiceId", "invoice_id", "number"]) ?? "") || null,
    amount: typeof rawAmount === "number" ? rawAmount : parseAmount(String(rawAmount ?? "")),
    dueDate: parseDate(typeof rawDueDate === "string" ? rawDueDate : null),
    status: String(find(["status", "paymentStatus", "payment_status", "state"]) ?? "") || null,
    paymentDate: parseDate(typeof rawPaymentDate === "string" ? rawPaymentDate : null),
    paymentMethod: String(find(["paymentMethod", "payment_method", "method"]) ?? "") || null,
  }
}

// ─── Customer Activity Extraction ──────────────────────────────────────────

/**
 * Extract customer activity data from portal HTML.
 * Looks for last login timestamps, view counts, and view timestamps.
 */
export function parseCustomerActivity(html: string): { activity: ParsedActivity; errors: string[] } {
  const errors: string[] = []
  const activity: ParsedActivity = {
    lastLoginAt: null,
    viewCount: null,
    viewTimestamps: [],
  }

  // ── Last login ──
  const loginPatterns = [
    /last\s*(?:login|sign[- ]?in|active)\s*:?\s*<[^>]*>\s*([^<]+)/i,
    /last\s*(?:login|sign[- ]?in|active)\s*:?\s*([A-Za-z0-9\s,:\-/]+?)(?:<|$)/i,
    /data-last-login="([^"]+)"/i,
    /"lastLogin(?:At)?"\s*:\s*"([^"]+)"/i,
    /"last_login(?:_at)?"\s*:\s*"([^"]+)"/i,
  ]

  for (const re of loginPatterns) {
    const m = re.exec(html)
    if (m && m[1]) {
      const parsed = parseDate(m[1].trim())
      if (parsed) {
        activity.lastLoginAt = parsed
        break
      }
    }
  }

  // ── View count ──
  const viewCountPatterns = [
    /(?:invoice\s*)?views?\s*(?:count)?\s*:?\s*<[^>]*>\s*(\d+)/i,
    /(?:invoice\s*)?views?\s*(?:count)?\s*:?\s*(\d+)/i,
    /viewed\s*(\d+)\s*times?/i,
    /data-view-count="(\d+)"/i,
    /"viewCount"\s*:\s*(\d+)/i,
    /"view_count"\s*:\s*(\d+)/i,
  ]

  for (const re of viewCountPatterns) {
    const m = re.exec(html)
    if (m && m[1]) {
      const count = parseInt(m[1], 10)
      if (Number.isFinite(count)) {
        activity.viewCount = count
        break
      }
    }
  }

  // ── View timestamps ──
  // Look for JSON arrays of timestamps
  const tsArrayPatterns = [
    /"viewTimestamps"\s*:\s*\[([\s\S]*?)\]/i,
    /"view_timestamps"\s*:\s*\[([\s\S]*?)\]/i,
  ]

  for (const re of tsArrayPatterns) {
    const m = re.exec(html)
    if (m && m[1]) {
      try {
        const arr = JSON.parse(`[${m[1]}]`)
        if (Array.isArray(arr)) {
          for (const ts of arr) {
            const parsed = parseDate(String(ts))
            if (parsed) activity.viewTimestamps.push(parsed)
          }
        }
      } catch {
        errors.push("Failed to parse view timestamps array")
      }
      break
    }
  }

  return { activity, errors }
}

// ─── Confidence Scoring ────────────────────────────────────────────────────

/**
 * Calculate confidence score (0-100) based on how many fields were matched.
 * Weights invoice fields and activity fields separately.
 */
export function calculateConfidence(invoices: ParsedInvoice[], activity: ParsedActivity): number {
  if (invoices.length === 0 && !activity.lastLoginAt && activity.viewCount === null) {
    return 0
  }

  let totalFields = 0
  let matchedFields = 0

  // Score invoice fields (weighted more heavily)
  for (const inv of invoices) {
    for (const field of INVOICE_FIELDS) {
      totalFields++
      if (inv[field] !== null && inv[field] !== undefined) matchedFields++
    }
  }

  // Score activity fields
  for (const field of ACTIVITY_FIELDS) {
    totalFields++
    const val = activity[field]
    if (field === "viewTimestamps") {
      if (Array.isArray(val) && val.length > 0) matchedFields++
    } else if (val !== null && val !== undefined) {
      matchedFields++
    }
  }

  if (totalFields === 0) return 0
  return Math.round((matchedFields / totalFields) * 100)
}

// ─── Main Parser ───────────────────────────────────────────────────────────

/**
 * Parse raw portal HTML and extract structured invoice and activity data.
 *
 * Tries all three extraction strategies (table, card, JSON) and merges results.
 * Returns the best results with a confidence score.
 */
export function parsePortalHtml(html: string): ParsedPortalData {
  if (!html || typeof html !== "string") {
    return {
      invoices: [],
      customerActivity: { lastLoginAt: null, viewCount: null, viewTimestamps: [] },
      confidence: 0,
      parsingErrors: ["No HTML content provided"],
    }
  }

  const allErrors: string[] = []
  const allInvoices: ParsedInvoice[] = []

  // Try JSON first (most structured, highest fidelity)
  const jsonResult = parseJsonInvoices(html)
  allInvoices.push(...jsonResult.invoices)
  allErrors.push(...jsonResult.errors)

  // Try table extraction
  const tableResult = parseTableInvoices(html)
  allErrors.push(...tableResult.errors)

  // Try card extraction
  const cardResult = parseCardInvoices(html)
  allErrors.push(...cardResult.errors)

  // Merge: prefer JSON results, then table, then card (avoid duplicates by invoice number)
  const seenNumbers = new Set(allInvoices.map((i) => i.invoiceNumber).filter(Boolean))

  for (const inv of tableResult.invoices) {
    if (!inv.invoiceNumber || !seenNumbers.has(inv.invoiceNumber)) {
      allInvoices.push(inv)
      if (inv.invoiceNumber) seenNumbers.add(inv.invoiceNumber)
    }
  }

  for (const inv of cardResult.invoices) {
    if (!inv.invoiceNumber || !seenNumbers.has(inv.invoiceNumber)) {
      allInvoices.push(inv)
      if (inv.invoiceNumber) seenNumbers.add(inv.invoiceNumber)
    }
  }

  // Extract customer activity
  const { activity, errors: activityErrors } = parseCustomerActivity(html)
  allErrors.push(...activityErrors)

  // Calculate confidence
  const confidence = calculateConfidence(allInvoices, activity)

  return {
    invoices: allInvoices,
    customerActivity: activity,
    confidence,
    parsingErrors: allErrors,
  }
}
