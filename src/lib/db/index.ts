import "server-only"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

const DATABASE_URL = process.env.DATABASE_URL

// Keep module evaluation safe in build/CI even when env vars are absent.
// Runtime requests will still fail clearly if real keys are not configured.
const pool = new Pool({
  connectionString: DATABASE_URL || "postgresql://localhost:5432/resq",
  max: 20,
})

export const db = drizzle(pool, { schema })
