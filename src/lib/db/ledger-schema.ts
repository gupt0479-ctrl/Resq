import "server-only"
import { db } from "@/lib/db"
import {
  invoices,
  integrationConnectors,
  aiSummaries,
  financeTransactions,
} from "@/lib/db/schema"

export type LedgerSchemaHealth =
  | { ok: true }
  | { ok: false; message: string }

/**
 * Verifies the remote DB matches migrations/0001_core_ledger.sql (and follow-ups).
 * Call before ledger-backed reads so users see an actionable message instead of a generic failure.
 */
export async function getLedgerSchemaHealth(): Promise<LedgerSchemaHealth> {
  try {
    await db.select().from(invoices).limit(1)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const hint =
      msg.includes("organization_id") ||
      msg.includes("invoice_number") ||
      msg.includes("total_amount") ||
      msg.includes("amount_paid")
        ? " Your project still has a pre-ledger invoices shape (often columns like total, line_items). Replace it by applying 0001 on a fresh database or following a deliberate migration plan—do not mix both shapes in one table."
        : ""
    return {
      ok:      false,
      message: `Invoices table is not on the Phase-2 ledger schema: ${msg}.${hint} If an old invoices table blocks migration, run supabase/migrations/003_reset_billing_for_ledger.sql (dev only), then 0001_core_ledger.sql, 002_invoice_reminders.sql, and supabase/seed.sql.`,
    }
  }

  try {
    await db.select().from(integrationConnectors).limit(1)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      ok:      false,
      message: `integration_connectors: ${msg}. Apply migrations through 0001_core_ledger.sql.`,
    }
  }

  try {
    await db.select().from(aiSummaries).limit(1)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      ok:      false,
      message: `ai_summaries: ${msg}. Apply migrations through 0001_core_ledger.sql.`,
    }
  }

  try {
    await db.select().from(financeTransactions).limit(1)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      ok:      false,
      message: `finance_transactions: ${msg}. Apply migrations through 0001_core_ledger.sql.`,
    }
  }

  return { ok: true }
}
