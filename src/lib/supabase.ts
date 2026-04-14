import { createClient } from "@supabase/supabase-js"

const FALLBACK_SUPABASE_URL = "https://placeholder.supabase.co"

// Keep module evaluation safe in build/CI even when env vars are absent.
// Runtime requests will still fail clearly if real keys are not configured.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || FALLBACK_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "missing-anon-key"
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "missing-service-role-key"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
