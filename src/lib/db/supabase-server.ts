import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_ORG_ID } from "@/lib/env"

/**
 * Server-side Supabase client using the service role key.
 * NEVER import or use this in client components or client bundles.
 * Only call from Next.js route handlers and server actions.
 */
export function createServerSupabaseClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase is not configured. " +
        "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local."
    )
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

export { DEMO_ORG_ID }
