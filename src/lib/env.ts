import "server-only"
import { z } from "zod"

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DEMO_ORG_ID: z.string().default("00000000-0000-0000-0000-000000000001"),
})

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

function validateServerEnv() {
  const parsed = serverSchema.safeParse(process.env)
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ")
    throw new Error(`Missing or invalid server env vars: ${missing}`)
  }
  return parsed.data
}

export function getServerEnv() {
  return validateServerEnv()
}

export function getPublicEnv() {
  const parsed = publicEnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ")
    throw new Error(`Missing or invalid public env vars: ${missing}`)
  }
  return parsed.data
}

export const DEMO_ORG_ID =
  process.env.DEMO_ORG_ID ?? "00000000-0000-0000-0000-000000000001"

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
}
