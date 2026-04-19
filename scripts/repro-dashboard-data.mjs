/**
 * One-off repro: load .env.local and hit Postgres like dashboard + buildFinanceSummaryFacts.
 * Does not print secrets. Usage: node scripts/repro-dashboard-data.mjs
 */
import pg from "pg"
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

const databaseUrl = env.DATABASE_URL
const org = env.DEMO_ORG_ID || "00000000-0000-0000-0000-000000000001"
if (!databaseUrl) {
  console.error("Missing DATABASE_URL in .env.local")
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: databaseUrl })

async function query(sql, params = []) {
  try {
    const result = await pool.query(sql, params)
    return { rows: result.rows, count: result.rowCount, error: null }
  } catch (err) {
    return { rows: [], count: 0, error: err.message }
  }
}

async function main() {
  console.log("orgId prefix:", org.slice(0, 8) + "...")

  const q1 = await query("SELECT id FROM appointments WHERE organization_id = $1 LIMIT 1", [org])
  console.log("appointments:", q1.error ?? "ok", "rows", q1.rows.length)

  const q2 = await query(
    `SELECT i.invoice_number, i.total_amount, i.amount_paid, c.full_name
     FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id
     WHERE i.organization_id = $1 AND i.status = 'overdue' LIMIT 1`,
    [org]
  )
  console.log("invoices+join (buildFinanceSummaryFacts style):", q2.error ?? "ok", "rows", q2.rows.length)

  const q3 = await query("SELECT id FROM integration_connectors WHERE organization_id = $1", [org])
  console.log("integration_connectors:", q3.error ?? "ok", "rows", q3.rows.length)

  const q4 = await query("SELECT id FROM ai_summaries WHERE organization_id = $1 LIMIT 1", [org])
  console.log("ai_summaries:", q4.error ?? "ok", "rows", q4.rows.length)

  const q5 = await query("SELECT count(*) as cnt FROM feedback")
  const q6 = await query("SELECT count(*) as cnt FROM feedback WHERE organization_id = $1", [org])
  console.log(
    "feedback rows (all orgs / this DEMO_ORG_ID):",
    q5.error ?? "ok",
    q5.rows[0]?.cnt ?? 0,
    "/",
    q6.error ?? "ok",
    q6.rows[0]?.cnt ?? 0
  )

  try {
    const url = new URL(databaseUrl)
    console.log("DB host from .env.local:", url.hostname)
  } catch {
    console.log("DB host: (could not parse DATABASE_URL)")
  }
}

async function columns() {
  const r = await query("SELECT * FROM invoices LIMIT 1")
  if (r.error) {
    console.log("invoices select *:", r.error)
    return
  }
  const row = r.rows[0]
  console.log("invoices sample keys:", row ? Object.keys(row).sort().join(", ") : "(no rows)")
}

main()
  .then(() => columns())
  .then(() => {
    console.log("")
    console.log(
      "=> If any line above shows errors: run migrations in order (0001_core_ledger.sql, 002_invoice_reminders.sql), then seed.sql against your RDS instance."
    )
    pool.end()
  })
  .catch((e) => {
    console.error("fatal", e?.message || e)
    pool.end()
    process.exit(1)
  })
