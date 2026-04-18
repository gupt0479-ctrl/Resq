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

const DEFAULT_DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001"

/** Ember Table demo org from seed; trim so blank .env lines do not override the default. */
export const DEMO_ORG_ID =
  process.env.DEMO_ORG_ID?.trim() || DEFAULT_DEMO_ORG_ID

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
}

// ─── TinyFish (server-only, additive) ──────────────────────────────────────

const DEFAULT_TINYFISH_AGENT_BASE_URL = "https://agent.tinyfish.ai"
const DEFAULT_TINYFISH_SEARCH_BASE_URL = "https://api.search.tinyfish.ai"
const DEFAULT_TINYFISH_FETCH_BASE_URL = "https://api.fetch.tinyfish.ai"
const DEFAULT_TINYFISH_AGENT_RUN_PATH = "/v1/automation/run"
const DEFAULT_TINYFISH_TIMEOUT_MS = 30_000

export const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY?.trim() ?? ""
export const TINYFISH_AGENT_BASE_URL =
  process.env.TINYFISH_AGENT_BASE_URL?.trim() || DEFAULT_TINYFISH_AGENT_BASE_URL
export const TINYFISH_SEARCH_BASE_URL =
  process.env.TINYFISH_SEARCH_BASE_URL?.trim() || DEFAULT_TINYFISH_SEARCH_BASE_URL
export const TINYFISH_FETCH_BASE_URL =
  process.env.TINYFISH_FETCH_BASE_URL?.trim() || DEFAULT_TINYFISH_FETCH_BASE_URL

/** The Agent API uses a canonical path under the agent base URL. */
export const TINYFISH_AGENT_PATH =
  process.env.TINYFISH_AGENT_PATH?.trim() ?? DEFAULT_TINYFISH_AGENT_RUN_PATH

/** Truthy unless explicitly set to "false" (trim + lower). Missing env => demo-safe default. */
function parseBooleanDefaultTrue(raw: string | undefined): boolean {
  if (raw === undefined) return true
  const v = raw.trim().toLowerCase()
  if (v === "false" || v === "0" || v === "no") return false
  return true
}

function parseBooleanDefaultFalse(raw: string | undefined): boolean {
  if (raw === undefined) return false
  const v = raw.trim().toLowerCase()
  if (v === "true" || v === "1" || v === "yes") return true
  return false
}

function parseTimeoutMs(raw: string | undefined): number {
  if (!raw) return DEFAULT_TINYFISH_TIMEOUT_MS
  const n = Number.parseInt(raw.trim(), 10)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TINYFISH_TIMEOUT_MS
}

export const TINYFISH_ENABLED   = parseBooleanDefaultFalse(process.env.TINYFISH_ENABLED)
export const TINYFISH_USE_MOCKS = parseBooleanDefaultTrue(process.env.TINYFISH_USE_MOCKS)
export const TINYFISH_TIMEOUT_MS = parseTimeoutMs(process.env.TINYFISH_TIMEOUT_MS)

/** API key + official base URLs present. Optional path overrides are not required. */
export function isTinyFishConfigured(): boolean {
  return Boolean(
    TINYFISH_API_KEY &&
    TINYFISH_AGENT_BASE_URL &&
    TINYFISH_SEARCH_BASE_URL &&
    TINYFISH_FETCH_BASE_URL
  )
}

/**
 * "Live intent" = operator has explicitly asked for live mode.
 * i.e. TINYFISH_ENABLED=true AND TINYFISH_USE_MOCKS=false.
 * A missing API key does NOT cancel live intent — the operator signaled they
 * want live, they just forgot a piece of config.
 */
export function hasTinyFishLiveIntent(): boolean {
  return TINYFISH_ENABLED && !TINYFISH_USE_MOCKS
}

/**
 * True only when the caller should return mock fixtures instead of attempting
 * the network. If the operator has live intent, we do NOT silently mock — the
 * caller will see `misconfigured` and can surface that distinctly.
 */
export function isTinyFishMockMode(): boolean {
  return !hasTinyFishLiveIntent()
}

/** True only if configured, enabled, and mocks are disabled. */
export function isTinyFishLiveReady(): boolean {
  if (!hasTinyFishLiveIntent()) return false
  return isTinyFishConfigured()
}

export type TinyFishMode = "mock" | "live" | "misconfigured"

/**
 * High-level classification for UI + logging:
 *   - "mock":         mocks explicitly on, or live not intended.
 *   - "live":         live intent + API key + official endpoints available.
 *   - "misconfigured": live intent but something required is missing.
 *                     Surfaces operator mistakes instead of hiding them.
 */
export function getTinyFishMode(): TinyFishMode {
  if (!hasTinyFishLiveIntent()) return "mock"
  if (isTinyFishLiveReady())    return "live"
  return "misconfigured"
}

// ─── AWS (optional, server-only) ───────────────────────────────────────────

export const AWS_REGION            = process.env.AWS_REGION?.trim()            ?? ""
export const AWS_S3_BUCKET         = process.env.AWS_S3_BUCKET?.trim()         ?? ""
export const AWS_ACCESS_KEY_ID     = process.env.AWS_ACCESS_KEY_ID?.trim()     ?? ""
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY?.trim() ?? ""

export function isAwsArtifactsConfigured(): boolean {
  return Boolean(
    AWS_REGION && AWS_S3_BUCKET && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY
  )
}

// ─── Demo mode ─────────────────────────────────────────────────────────────

/** Defaults to true. Only `DEMO_MODE=false` (trimmed, case-insensitive) turns it off. */
export function isDemoMode(): boolean {
  return parseBooleanDefaultTrue(process.env.DEMO_MODE)
}
