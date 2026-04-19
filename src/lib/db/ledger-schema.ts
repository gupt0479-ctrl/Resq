import "server-only"
import { createServerSupabaseClient } from "@/lib/db/supabase-server"

export type LedgerSchemaHealth =
  | { ok: true }
  | { ok: false; message: string }

/**
 * Verifies the remote DB has the expected tables.
 * Uses Supabase REST client (works from anywhere) with Drizzle as fallback.
 */
export async function getLedgerSchemaHealth(): Promise<LedgerSchemaHealth> {
  const sb = createServerSupabaseClient()

  const tables = ["invoices", "integration_connectors", "ai_summaries", "finance_transactions"]

  for (const table of tables) {
    const { error } = await sb.from(table).select("id", { count: "exact", head: true })
    if (error) {
      return {
        ok: false,
        message: `${table}: ${error.message}. Apply migrations through 0001_core_ledger.sql.`,
      }
    }
  }

  return { ok: true }
}
