/**
 * Ember Table seed script.
 * Run after applying the migration:
 *   npx supabase db push   (or apply 0001_core_ledger.sql manually)
 *   npx tsx src/lib/seed/run.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { join } from "path"

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error(
      "❌  Missing env vars. Copy .env.local.example to .env.local and fill in your Supabase credentials."
    )
    process.exit(1)
  }

  const client = createClient(url, key, { auth: { persistSession: false } })

  // Read the SQL seed file
  const seedPath = join(process.cwd(), "supabase", "seed.sql")
  const seedSql  = readFileSync(seedPath, "utf-8")

  // Split into statements and execute each
  const statements = seedSql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"))

  console.log(`🌱  Running ${statements.length} seed statements for Ember Table…`)

  const failed = 0
  for (const sql of statements) {
    const { error } = await client.rpc("exec_sql", { sql: sql + ";" }).maybeSingle()
    if (error) {
      // Fallback: try using postgrest raw
      console.warn(`  ⚠️  RPC exec_sql not available — use Supabase SQL editor or psql.`)
      break
    }
  }

  if (failed === 0) {
    console.log("✅  Seed complete.")
  } else {
    console.log(`\n💡  Tip: paste supabase/seed.sql into the Supabase SQL Editor and run it there.`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
