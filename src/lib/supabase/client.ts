import { createClient } from "@supabase/supabase-js"

const FALLBACK_SUPABASE_URL = "https://placeholder.supabase.co"

// Avoid import-time crashes during builds when env vars are not injected yet.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || FALLBACK_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "missing-anon-key"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
