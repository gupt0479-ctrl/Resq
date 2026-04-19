import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let _client: SupabaseClient | null = null

/**
 * Lazy Supabase browser client. Safe during build/SSG when env vars are absent.
 * Throws at runtime if called without env vars (should never happen in browser).
 */
export function getSupabaseBrowser(): SupabaseClient {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  if (!url || !key) throw new Error("Supabase env vars not set")
  _client = createClient(url, key)
  return _client
}

// Backward compat — null during build, real client at runtime
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
export const supabaseBrowser = (url && key ? createClient(url, key) : null) as SupabaseClient
