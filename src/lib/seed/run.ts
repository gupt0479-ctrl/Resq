/**
 * Ember Table seed script.
 * Run after applying the migration:
 *   npx tsx src/lib/seed/run.ts
 *
 * Requires DATABASE_URL in .env.local.
 */

import { Pool } from "pg"
import { readFileSync } from "fs"
import { join } from "path"

async function main() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error(
      "❌  Missing DATABASE_URL env var. Copy .env.local.example to .env.local and fill in your database credentials."
    )
    process.exit(1)
  }

  const pool = new Pool({ connectionString: databaseUrl })

  // Read the SQL seed file
  const seedPath = join(process.cwd(), "supabase", "seed.sql")
  const seedSql  = readFileSync(seedPath, "utf-8")

  // Split into statements and execute each
  const statements = seedSql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"))

  console.log(`🌱  Running ${statements.length} seed statements for Ember Table…`)

  let failed = 0
  for (const sql of statements) {
    try {
      await pool.query(sql + ";")
    } catch (err) {
      failed += 1
      console.warn(`  ⚠️  Statement failed: ${(err as Error).message?.slice(0, 120)}`)
    }
  }

  if (failed === 0) {
    console.log("✅  Seed complete.")
  } else {
    console.log(`\n⚠️  ${failed} statement(s) failed. Check output above.`)
    console.log(`💡  Tip: paste supabase/seed.sql into your SQL editor and run it there.`)
  }

  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
