import "server-only"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

const DATABASE_URL = process.env.DATABASE_URL

// Keep module evaluation safe in build/CI even when env vars are absent.
// Runtime requests will still fail clearly if real keys are not configured.
// Rewrite the deprecated sslmode=require to sslmode=verify-full so that
// pg-connection-string ≥2.7 / pg ≥8.13 stops emitting the security warning.
// The actual TLS behaviour stays the same — the library already treated
// "require" as "verify-full" — this just makes it explicit.
const raw = DATABASE_URL || "postgresql://localhost:5432/resq"
const connectionString = raw.replace(
  /([?&])sslmode=require(?=&|$)/,
  "$1sslmode=verify-full",
)

const pool = new Pool({
  connectionString,
  max: 20,
})

export const db = drizzle(pool, { schema })
