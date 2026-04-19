/**
 * Portal Pretty Printer
 *
 * Formats parsed portal data (ParsedPortalData) into human-readable summaries.
 * Used for audit logs and UI display. Acts as the inverse of the HTML parser —
 * takes structured data and produces readable text.
 */

import type { ParsedPortalData, ParsedInvoice, ParsedActivity } from "@/lib/tinyfish/portal-schemas"

// ─── Invoice Formatting ────────────────────────────────────────────────────

/** Format a single parsed invoice into a human-readable block. */
export function formatInvoice(invoice: ParsedInvoice): string {
  const lines: string[] = []

  lines.push(`Invoice: ${invoice.invoiceNumber ?? "N/A"}`)

  if (invoice.amount != null) {
    lines.push(`  Amount: $${invoice.amount.toFixed(2)}`)
  }

  if (invoice.dueDate) {
    lines.push(`  Due Date: ${invoice.dueDate}`)
  }

  if (invoice.status) {
    lines.push(`  Status: ${invoice.status}`)
  }

  if (invoice.paymentDate) {
    lines.push(`  Payment Date: ${invoice.paymentDate}`)
  }

  if (invoice.paymentMethod) {
    lines.push(`  Payment Method: ${invoice.paymentMethod}`)
  }

  return lines.join("\n")
}

// ─── Activity Formatting ───────────────────────────────────────────────────

/** Format parsed customer activity into a human-readable block. */
export function formatActivity(activity: ParsedActivity): string {
  const lines: string[] = []

  lines.push("Customer Activity:")

  if (activity.lastLoginAt) {
    lines.push(`  Last Login: ${activity.lastLoginAt}`)
  } else {
    lines.push("  Last Login: N/A")
  }

  if (activity.viewCount != null) {
    lines.push(`  Invoice Views: ${activity.viewCount}`)
  }

  if (activity.viewTimestamps.length > 0) {
    lines.push(`  View Timestamps: ${activity.viewTimestamps.join(", ")}`)
  }

  return lines.join("\n")
}

// ─── Full Data Formatting ──────────────────────────────────────────────────

/**
 * Format a complete ParsedPortalData object into a human-readable summary.
 *
 * Output structure:
 *   Portal Data Summary (Confidence: XX%)
 *   --- Invoices ---
 *   Invoice: INV-001
 *     Amount: $1,500.00
 *     ...
 *   --- Customer Activity ---
 *   Last Login: ...
 *   --- Parsing Errors ---
 *   (if any)
 */
export function formatPortalData(data: ParsedPortalData): string {
  const sections: string[] = []

  sections.push(`Portal Data Summary (Confidence: ${data.confidence}%)`)

  // Invoices section
  if (data.invoices.length > 0) {
    sections.push("--- Invoices ---")
    for (const inv of data.invoices) {
      sections.push(formatInvoice(inv))
    }
  } else {
    sections.push("--- Invoices ---")
    sections.push("No invoices found.")
  }

  // Activity section
  sections.push("--- Customer Activity ---")
  sections.push(formatActivity(data.customerActivity))

  // Errors section (only if present)
  if (data.parsingErrors.length > 0) {
    sections.push("--- Parsing Errors ---")
    for (const err of data.parsingErrors) {
      sections.push(`  - ${err}`)
    }
  }

  return sections.join("\n")
}
