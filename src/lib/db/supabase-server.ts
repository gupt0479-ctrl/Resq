import "server-only"
import { createClient } from "@supabase/supabase-js"

export { DEMO_ORG_ID } from "@/lib/db"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

/**
 * Compatibility shim — recreated after the Drizzle migration deleted this file.
 * KYC services and several routes still use the Supabase client directly.
 * The Drizzle db client (src/lib/db/index.ts) is used for all new query work.
 */
export function createServerSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}
