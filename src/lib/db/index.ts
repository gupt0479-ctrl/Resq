import "server-only"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

const DATABASE_URL = process.env.DATABASE_URL

// Keep module evaluation safe in build/CI even when env vars are absent.
// Runtime requests will still fail clearly if real keys are not configured.
const pool = new Pool({
  connectionString: DATABASE_URL || "postgresql://localhost:5432/opspilot",
  max: 20,
  ssl: DATABASE_URL?.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
})

export const db = drizzle(pool, { schema })

const DEFAULT_DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001"

/** Ember Table demo org from seed; trim so blank .env lines do not override the default. */
export const DEMO_ORG_ID =
  process.env.DEMO_ORG_ID?.trim() || DEFAULT_DEMO_ORG_ID
