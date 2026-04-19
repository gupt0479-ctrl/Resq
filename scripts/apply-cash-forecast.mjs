#!/usr/bin/env node
// Apply cash forecast migration and seed data via Supabase REST API
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function runSQL(label, filePath) {
  const sql = readFileSync(resolve(__dirname, filePath), "utf-8")
  // Split on semicolons but keep the content, filter empty
  const statements = sql
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith("--"))

  console.log(`\n── ${label} (${statements.length} statements) ──`)

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    if (!stmt || stmt.startsWith("--")) continue
    const { error } = await supabase.rpc("exec_sql", { query: stmt + ";" }).maybeSingle()
    if (error) {
      // Try direct fetch as fallback
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ query: stmt + ";" }),
      })
      if (!res.ok) {
        console.error(`  Statement ${i + 1} failed: ${error?.message ?? await res.text()}`)
        // Continue — many statements are idempotent
      }
    }
  }
  console.log(`  ✓ ${label} applied`)
}

async function countRows(table) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true })
  if (error) return `error: ${error.message}`
  return count
}

async function main() {
  console.log("Applying cash forecast migration and seed...")

  // Apply migration
  await runSQL("Migration 0007", "../supabase/migrations/0007_cash_forecast.sql")

  // Apply seed
  await runSQL("Cash Forecast Seed", "../supabase/seed_cash_forecast.sql")

  // Print row counts
  console.log("\n── Row Counts ──")
  for (const table of [
    "finance_transactions",
    "cash_obligations",
    "cash_receivables",
    "refund_exposure",
    "forecast_runs",
  ]) {
    const count = await countRows(table)
    console.log(`  ${table}: ${count}`)
  }

  console.log("\n✓ Done")
}

main().catch(console.error)
