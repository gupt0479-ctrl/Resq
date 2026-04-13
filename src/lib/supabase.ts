import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
// Use a non-empty placeholder so module evaluation doesn't throw during build;
// actual requests will fail at runtime if the key is missing.
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "missing-service-role-key"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})