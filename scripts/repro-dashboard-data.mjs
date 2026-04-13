/**
 * One-off repro: load .env.local and hit Supabase like dashboard + buildFinanceSummaryFacts.
 * Does not print secrets. Usage: node scripts/repro-dashboard-data.mjs
 */
import { createClient } from "@supabase/supabase-js"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const envPath = path.join(root, ".env.local")
if (!fs.existsSync(envPath)) {
  console.error("No .env.local")
  process.exit(1)
}
const env = {}
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const t = line.trim()
  if (!t || t.startsWith("#")) continue
  const i = t.indexOf("=")
  if (i === -1) continue
  const k = t.slice(0, i).trim()
  let v = t.slice(i + 1).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
    v = v.slice(1, -1)
  env[k] = v
}

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
const org = env.DEMO_ORG_ID || "00000000-0000-0000-0000-000000000001"
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const client = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  console.log("orgId prefix:", org.slice(0, 8) + "...")

  const q1 = await client.from("appointments").select("id").eq("organization_id", org).limit(1)
  console.log("appointments:", q1.error?.message ?? "ok", "rows", q1.data?.length ?? 0)

  const q2 = await client
    .from("invoices")
    .select("invoice_number, total_amount, amount_paid, customers ( full_name )")
    .eq("organization_id", org)
    .eq("status", "overdue")
    .limit(1)
  console.log("invoices+embed (buildFinanceSummaryFacts style):", q2.error?.message ?? "ok", "rows", q2.data?.length ?? 0)

  const q3 = await client
    .from("invoices")
    .select("total_amount, amount_paid, due_at, invoice_number, customers(full_name)")
    .eq("organization_id", org)
    .eq("status", "overdue")
    .limit(1)
  console.log("invoices+embed (getFinanceSummary style):", q3.error?.message ?? "ok")

  const q4 = await client.from("integration_connectors").select("id").eq("organization_id", org)
  console.log("integration_connectors:", q4.error?.message ?? "ok", "rows", q4.data?.length ?? 0)

  const q5 = await client.from("ai_summaries").select("id").eq("organization_id", org).limit(1)
  console.log("ai_summaries:", q5.error?.message ?? "ok", "rows", q5.data?.length ?? 0)
}

async function columns() {
  const r = await client.from("invoices").select("*").limit(1)
  if (r.error) {
    console.log("invoices select *:", r.error.message)
    return
  }
  const row = r.data?.[0]
  console.log("invoices sample keys:", row ? Object.keys(row).sort().join(", ") : "(no rows)")
}

main()
  .then(() => columns())
  .then(() => {
    console.log("")
    console.log(
      "=> If any line above shows PostgREST errors: open Supabase SQL Editor for THIS project and run migrations in order (0001_core_ledger.sql, 002_invoice_reminders.sql), then supabase/seed.sql. Or: supabase link && supabase db push (if you use the CLI)."
    )
  })
  .catch((e) => {
    console.error("fatal", e?.message || e)
    process.exit(1)
  })
