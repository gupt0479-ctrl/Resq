import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

export type LedgerSchemaHealth =
  | { ok: true }
  | { ok: false; message: string }

/**
 * Verifies the remote DB matches migrations/0001_core_ledger.sql (and follow-ups).
 * Call before ledger-backed reads so users see an actionable message instead of a generic failure.
 */
export async function getLedgerSchemaHealth(client: SupabaseClient): Promise<LedgerSchemaHealth> {
  const { error: invErr } = await client
    .from("invoices")
    .select("organization_id, invoice_number, total_amount, amount_paid")
    .limit(1)

  if (invErr) {
    const hint =
      invErr.message.includes("organization_id") ||
      invErr.message.includes("invoice_number") ||
      invErr.message.includes("total_amount") ||
      invErr.message.includes("amount_paid")
        ? " Your project still has a pre-ledger invoices shape (often columns like total, line_items). Replace it by applying 0001 on a fresh database or following a deliberate migration plan—do not mix both shapes in one table."
        : ""
    return {
      ok:      false,
      message: `Invoices table is not on the Phase-2 ledger schema: ${invErr.message}.${hint} If an old invoices table blocks migration, run supabase/migrations/003_reset_billing_for_ledger.sql (dev only), then 0001_core_ledger.sql, 002_invoice_reminders.sql, and supabase/seed.sql.`,
    }
  }

  const { error: connErr } = await client.from("integration_connectors").select("id").limit(1)
  if (connErr) {
    return {
      ok:      false,
      message: `integration_connectors: ${connErr.message}. Apply migrations through 0001_core_ledger.sql.`,
    }
  }

  const { error: aiErr } = await client.from("ai_summaries").select("id").limit(1)
  if (aiErr) {
    return {
      ok:      false,
      message: `ai_summaries: ${aiErr.message}. Apply migrations through 0001_core_ledger.sql.`,
    }
  }

  const { error: ftErr } = await client.from("finance_transactions").select("id").limit(1)
  if (ftErr) {
    return {
      ok:      false,
      message: `finance_transactions: ${ftErr.message}. Apply migrations through 0001_core_ledger.sql.`,
    }
  }

  return { ok: true }
}
