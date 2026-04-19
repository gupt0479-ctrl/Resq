/**
 * Portal Reconnaissance Service
 *
 * Orchestrates portal login reconnaissance across three modes:
 *   1. Mock — deterministic fixture data, no network calls (demo-safe)
 *   2. Misconfigured — live intent but missing config; returns warning + mock data
 *   3. Live — real TinyFish API calls with vault credentials
 *
 * Graceful degradation: live failures fall back to mock data with degradedFromLive: true.
 */

import { getPortalReconMode, isSupabaseConfigured, DEMO_ORG_ID } from "@/lib/env"
import { getMockPortalRecon, selectScenarioByInvoiceId } from "@/lib/tinyfish/portal-mock-data"
import { runPortalLogin, TinyFishError } from "@/lib/tinyfish/client"
import { parsePortalHtml } from "@/lib/services/portal-html-parser"
import type { PortalReconOptions } from "@/lib/tinyfish/portal-types"
import type {
  PortalReconnaissanceResponse,
  PortalReconnaissanceResult,
  PortalLoginResult,
  Screenshot,
} from "@/lib/tinyfish/portal-schemas"

// ─── Constants ─────────────────────────────────────────────────────────────

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const MOCK_DELAY_MS = 80 // small delay to simulate async work in mock mode
const LIVE_MODE_TIMEOUT_MS = 30_000 // never block collections workflow for more than 30s
const MAX_RETRY_ATTEMPTS = 2 // max retry attempts for retryable errors

// ─── Main Service ──────────────────────────────────────────────────────────

/**
 * Investigate a customer portal for invoice visibility, payment status,
 * customer activity, and optionally send a portal-native message.
 *
 * This is the primary entry point. Callers get a typed response regardless
 * of which mode is active — the mode field tells them what happened.
 */
export async function investigate(
  opts: PortalReconOptions
): Promise<PortalReconnaissanceResponse> {
  const mode = getPortalReconMode()

  let response: PortalReconnaissanceResponse

  if (mode === "mock") {
    response = await handleMockMode(opts)
  } else if (mode === "misconfigured") {
    response = await handleMisconfiguredMode(opts)
  } else {
    // Live mode — attempt real portal login, degrade on failure
    response = await handleLiveMode(opts)
  }

  // Fire-and-forget audit logging — never block the response
  logPortalReconAction(opts, response).catch((err) => {
    console.warn(
      "[portal-recon] audit log failed:",
      err instanceof Error ? err.message : err
    )
  })

  return response
}

// ─── Mock Mode ─────────────────────────────────────────────────────────────

async function handleMockMode(
  opts: PortalReconOptions
): Promise<PortalReconnaissanceResponse> {
  // Small async delay so callers always get a promise
  await delay(MOCK_DELAY_MS)

  const scenario = opts.scenario ?? selectScenarioByInvoiceId(opts.invoiceId)
  return getMockPortalRecon(scenario, opts.invoiceId)
}

// ─── Misconfigured Mode ────────────────────────────────────────────────────

async function handleMisconfiguredMode(
  opts: PortalReconOptions
): Promise<PortalReconnaissanceResponse> {
  await delay(MOCK_DELAY_MS)

  const scenario = opts.scenario ?? selectScenarioByInvoiceId(opts.invoiceId)
  const mock = getMockPortalRecon(scenario, opts.invoiceId)

  return {
    ...mock,
    mode: "misconfigured",
    warning: buildMisconfiguredWarning(),
  }
}

// ─── Live Mode ─────────────────────────────────────────────────────────────

async function handleLiveMode(
  opts: PortalReconOptions
): Promise<PortalReconnaissanceResponse> {
  // Wrap the entire live mode operation in a 30-second timeout
  // so we never block the collections workflow (Req 12.6)
  try {
    return await withTimeout(
      () => handleLiveModeInner(opts),
      LIVE_MODE_TIMEOUT_MS
    )
  } catch (err) {
    // Timeout or unexpected error — degrade to mock
    return degradeToMock(opts, err, "timeout")
  }
}

async function handleLiveModeInner(
  opts: PortalReconOptions
): Promise<PortalReconnaissanceResponse> {
  let loginResult: PortalLoginResult

  try {
    // Retry retryable TinyFish errors (429, 5xx, timeout, network) with exponential backoff
    loginResult = await retryWithBackoff(() => runPortalLogin(opts), MAX_RETRY_ATTEMPTS)
  } catch (err) {
    // Graceful degradation: fall back to mock data
    const errorType = err instanceof TinyFishError ? err.kind : "unknown"
    return degradeToMock(opts, err, errorType)
  }

  // If the client itself degraded (e.g. network error caught internally)
  if (loginResult.degradedFromLive) {
    return buildResponseFromLoginResult(loginResult, opts)
  }

  // If auth failed or bot detected, return the result as-is (no parsing needed)
  if (loginResult.status === "AUTH_FAILED" || loginResult.status === "BOT_DETECTED") {
    return buildResponseFromLoginResult(loginResult, opts)
  }

  // Parse the live result into our reconnaissance response
  try {
    return buildLiveResponse(loginResult, opts)
  } catch (err) {
    // Parsing failed — return error response with parsingFailed: true (Req 12.5)
    return buildParsingFailedResponse(opts, loginResult, err)
  }
}

// ─── Response Builders ─────────────────────────────────────────────────────

function buildLiveResponse(
  loginResult: PortalLoginResult,
  opts: PortalReconOptions
): PortalReconnaissanceResponse {
  const invoiceData = loginResult.result.invoiceData as Record<string, unknown>
  const activityData = loginResult.result.activityData as Record<string, unknown>

  // Extract invoice fields
  const visibility = Boolean(loginResult.result.invoiceFound)
  const visibilityReason = visibility
    ? null
    : String(invoiceData.visibilityReason ?? "not in customer view")
  const paymentStatus = normalizePaymentStatus(
    String(invoiceData.paymentStatus ?? invoiceData.payment_status ?? "unknown")
  )
  const paymentDate = stringOrNull(invoiceData.paymentDate ?? invoiceData.payment_date)
  const paymentMethod = stringOrNull(invoiceData.paymentMethod ?? invoiceData.payment_method)
  const shouldSkipCollection = paymentStatus === "processing" || paymentStatus === "paid"

  // Extract activity fields
  const lastLoginAt = stringOrNull(activityData.lastLoginAt ?? activityData.last_login_at)
  const hasRecentActivity = isWithinDays(lastLoginAt, 7)
  const invoiceViewCount = numberOrNull(activityData.invoiceViewCount ?? activityData.invoice_view_count ?? activityData.viewCount)
  const invoiceViewTimestamps = extractStringArray(activityData.invoiceViewTimestamps ?? activityData.invoice_view_timestamps ?? activityData.viewTimestamps)
  const engagementLevel = deriveEngagementLevel(hasRecentActivity, invoiceViewCount, invoiceViewTimestamps)

  // Confidence scoring
  const visibilityConfidence = visibility ? 90 : 75
  const activityConfidence = lastLoginAt ? 85 : 50

  // Screenshots
  const screenshots = mapScreenshots(loginResult.result.screenshots, opts.invoiceId)

  const result: PortalReconnaissanceResult = {
    visibility,
    visibilityReason,
    visibilityConfidence,
    paymentStatus,
    paymentDate,
    paymentMethod,
    shouldSkipCollection,
    lastLoginAt,
    hasRecentActivity,
    invoiceViewCount,
    invoiceViewTimestamps,
    engagementLevel,
    activityConfidence,
    messageSent: loginResult.result.messageSent,
    messageSentAt: loginResult.result.messageSent ? new Date().toISOString() : null,
    messageFailureReason: loginResult.result.messageSent ? null : "Portal messaging not attempted or not supported",
    screenshots,
    portalUrl: opts.portalUrl ?? "https://customer-portal.example.com",
    tinyfishRunId: loginResult.tinyfishRunId,
    authFailed: loginResult.status === "AUTH_FAILED",
    botDetected: loginResult.status === "BOT_DETECTED",
    parsingFailed: false,
  }

  return {
    mode: "live",
    degradedFromLive: false,
    warning: loginResult.warning,
    result,
  }
}

function buildResponseFromLoginResult(
  loginResult: PortalLoginResult,
  opts: PortalReconOptions
): PortalReconnaissanceResponse {
  // When the client already handled mode/degradation, translate to our response shape
  if (loginResult.mode === "mock" || loginResult.degradedFromLive) {
    // The client fell back to mock data — re-derive from fixtures
    const scenario = opts.scenario ?? selectScenarioByInvoiceId(opts.invoiceId)
    const mock = getMockPortalRecon(scenario, opts.invoiceId)
    return {
      ...mock,
      mode: loginResult.mode,
      degradedFromLive: loginResult.degradedFromLive,
      warning: loginResult.warning,
    }
  }

  // Auth failed or bot detected in live mode
  if (loginResult.status === "AUTH_FAILED") {
    return buildErrorResponse(opts, {
      authFailed: true,
      botDetected: false,
      parsingFailed: false,
      warning: "Portal authentication failed — credentials may be invalid or expired.",
      tinyfishRunId: loginResult.tinyfishRunId,
    })
  }

  if (loginResult.status === "BOT_DETECTED") {
    // Fall back to mock data on bot detection
    const scenario = opts.scenario ?? selectScenarioByInvoiceId(opts.invoiceId)
    const mock = getMockPortalRecon(scenario, opts.invoiceId)
    return {
      ...mock,
      mode: "live",
      degradedFromLive: true,
      warning: "Bot detection triggered — falling back to fixture data.",
      result: {
        ...mock.result,
        botDetected: true,
        tinyfishRunId: loginResult.tinyfishRunId,
      },
    }
  }

  // Shouldn't reach here, but handle gracefully
  return buildLiveResponse(loginResult, opts)
}

function buildErrorResponse(
  opts: PortalReconOptions,
  overrides: {
    authFailed: boolean
    botDetected: boolean
    parsingFailed: boolean
    warning: string
    tinyfishRunId: string | null
  }
): PortalReconnaissanceResponse {
  return {
    mode: "live",
    degradedFromLive: false,
    warning: overrides.warning,
    result: {
      visibility: false,
      visibilityReason: overrides.authFailed ? "Authentication failed" : "Error during reconnaissance",
      visibilityConfidence: 0,
      paymentStatus: "unknown",
      paymentDate: null,
      paymentMethod: null,
      shouldSkipCollection: false,
      lastLoginAt: null,
      hasRecentActivity: false,
      invoiceViewCount: null,
      invoiceViewTimestamps: [],
      engagementLevel: "none",
      activityConfidence: 0,
      messageSent: false,
      messageSentAt: null,
      messageFailureReason: overrides.authFailed ? "Authentication failed" : "Reconnaissance error",
      screenshots: [],
      portalUrl: opts.portalUrl ?? "https://customer-portal.example.com",
      tinyfishRunId: overrides.tinyfishRunId,
      authFailed: overrides.authFailed,
      botDetected: overrides.botDetected,
      parsingFailed: overrides.parsingFailed,
    },
  }
}

function degradeToMock(
  opts: PortalReconOptions,
  err: unknown,
  errorType?: string
): PortalReconnaissanceResponse {
  const scenario = opts.scenario ?? selectScenarioByInvoiceId(opts.invoiceId)
  const mock = getMockPortalRecon(scenario, opts.invoiceId)
  const message = err instanceof TinyFishError
    ? `TinyFish ${err.kind}: ${err.message}`
    : err instanceof Error
      ? err.message
      : "Unknown error during portal reconnaissance"

  // Fire-and-forget error audit log (Req 12.7)
  const recoveryAction = "degraded_to_mock"
  logPortalReconError(opts, errorType ?? "unknown", message, recoveryAction).catch(() => {})

  return {
    ...mock,
    mode: "live",
    degradedFromLive: true,
    warning: `Live portal reconnaissance failed, using fixture data. ${message}`,
  }
}

function buildParsingFailedResponse(
  opts: PortalReconOptions,
  loginResult: PortalLoginResult,
  err: unknown
): PortalReconnaissanceResponse {
  const message = err instanceof Error ? err.message : "Unknown parsing error"

  // Fire-and-forget error audit log (Req 12.7)
  logPortalReconError(opts, "parsing", message, "returned_parsing_failed").catch(() => {})

  return {
    mode: "live",
    degradedFromLive: false,
    warning: `Portal data parsing failed: ${message}`,
    result: {
      visibility: false,
      visibilityReason: "Parsing failed",
      visibilityConfidence: 10,
      paymentStatus: "unknown",
      paymentDate: null,
      paymentMethod: null,
      shouldSkipCollection: false,
      lastLoginAt: null,
      hasRecentActivity: false,
      invoiceViewCount: null,
      invoiceViewTimestamps: [],
      engagementLevel: "none",
      activityConfidence: 0,
      messageSent: false,
      messageSentAt: null,
      messageFailureReason: "Parsing failed",
      screenshots: [],
      portalUrl: opts.portalUrl ?? "https://customer-portal.example.com",
      tinyfishRunId: loginResult.tinyfishRunId,
      authFailed: false,
      botDetected: false,
      parsingFailed: true,
    },
  }
}

// ─── Retry & Timeout ───────────────────────────────────────────────────────

/**
 * Determine whether a TinyFish error is retryable.
 * Retryable: timeout, network, or HTTP 429 / 5xx.
 */
function shouldRetry(err: unknown): boolean {
  if (!(err instanceof TinyFishError)) return false
  if (err.kind === "timeout" || err.kind === "network") return true
  if (err.kind === "http" && err.status != null) {
    return err.status === 429 || err.status >= 500
  }
  return false
}

/**
 * Retry a function with exponential backoff.
 * Only retries errors that pass `shouldRetry`.
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (shouldRetry(err) && attempt < maxAttempts - 1) {
        await delay(Math.pow(2, attempt) * 1000) // 1s, 2s, …
      } else {
        throw err
      }
    }
  }
  throw lastError
}

/**
 * Run an async function with a hard timeout.
 * Rejects with a TinyFishError("timeout", …) if the deadline is exceeded.
 */
async function withTimeout<T>(
  fn: () => Promise<T>,
  ms: number
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new TinyFishError("timeout", `Live mode operation timed out after ${ms}ms`)),
      ms
    )
    fn().then(
      (val) => { clearTimeout(timer); resolve(val) },
      (err) => { clearTimeout(timer); reject(err) }
    )
  })
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function normalizePaymentStatus(
  raw: string
): "unpaid" | "processing" | "paid" | "failed" | "unknown" {
  const lower = raw.toLowerCase().trim()
  if (lower === "unpaid" || lower === "overdue" || lower === "open") return "unpaid"
  if (lower === "processing" || lower === "pending" || lower === "in_progress") return "processing"
  if (lower === "paid" || lower === "completed" || lower === "settled") return "paid"
  if (lower === "failed" || lower === "declined" || lower === "rejected") return "failed"
  return "unknown"
}

function deriveEngagementLevel(
  hasRecentActivity: boolean,
  viewCount: number | null,
  viewTimestamps: string[]
): "high" | "medium" | "low" | "none" {
  if (!hasRecentActivity && (viewCount === null || viewCount === 0)) return "none"
  if (!hasRecentActivity) return "low"

  const recentViews = viewTimestamps.filter((ts) => isWithinDays(ts, 7)).length
  if (recentViews >= 3 || (viewCount !== null && viewCount >= 5)) return "high"
  if (recentViews >= 1 || (viewCount !== null && viewCount >= 2)) return "medium"
  return "low"
}

function isWithinDays(isoDate: string | null, days: number): boolean {
  if (!isoDate) return false
  const date = new Date(isoDate)
  if (isNaN(date.getTime())) return false
  return Date.now() - date.getTime() < days * 24 * 60 * 60 * 1000
}

function mapScreenshots(
  raw: Array<{ step: string; data: string }>,
  invoiceId: string
): Screenshot[] {
  const validSteps = new Set(["login", "invoice_list", "invoice_detail", "payment_status", "message_sent"])
  return raw
    .filter((s) => validSteps.has(s.step))
    .map((s) => ({
      step: s.step as Screenshot["step"],
      url: s.data,
      timestamp: new Date().toISOString(),
      invoiceId,
    }))
}

function stringOrNull(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim()
  return null
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const n = parseInt(value, 10)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function extractStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === "string" ? v : null))
    .filter((v): v is string => v !== null)
}

function buildMisconfiguredWarning(): string {
  const missing: string[] = []
  if (!process.env.TINYFISH_API_KEY) missing.push("TINYFISH_API_KEY")
  if (process.env.TINYFISH_VAULT_ENABLED !== "true") missing.push("TINYFISH_VAULT_ENABLED")
  if (process.env.TINYFISH_PORTAL_RECON_ENABLED !== "true") missing.push("TINYFISH_PORTAL_RECON_ENABLED")
  return missing.length > 0
    ? `Portal reconnaissance misconfigured — missing: ${missing.join(", ")}. Using fixture data.`
    : "Portal reconnaissance misconfigured. Using fixture data."
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Audit Logging ─────────────────────────────────────────────────────────

/**
 * Fire-and-forget audit log to ai_actions table.
 * Silently skips if Supabase is not configured.
 */
async function logPortalReconAction(
  opts: PortalReconOptions,
  response: PortalReconnaissanceResponse
): Promise<void> {
  if (!isSupabaseConfigured()) return

  const { createServerSupabaseClient } = await import("@/lib/db/supabase-server")
  const { recordAiAction } = await import("@/lib/services/ai-actions")

  const client = createServerSupabaseClient()

  await recordAiAction(client, {
    organizationId: DEMO_ORG_ID,
    entityType:     "invoice",
    entityId:       opts.invoiceId,
    triggerType:    "portal_reconnaissance",
    actionType:     "portal_reconnaissance",
    inputSummary:   buildAuditInputSummary(opts, response.mode),
    outputPayload: {
      visibility:           response.result.visibility,
      paymentStatus:        response.result.paymentStatus,
      shouldSkipCollection: response.result.shouldSkipCollection,
      engagementLevel:      response.result.engagementLevel,
      messageSent:          response.result.messageSent,
      degradedFromLive:     response.degradedFromLive,
      mode:                 response.mode,
    },
    status: "executed",
  })
}

function buildAuditInputSummary(
  opts: PortalReconOptions,
  mode: string
): string {
  const parts = [`mode=${mode}`, `invoice=${opts.invoiceId}`]
  if (opts.customerId) parts.push(`customer=${opts.customerId}`)
  if (opts.portalUrl) parts.push(`portal=${opts.portalUrl}`)
  if (opts.scenario) parts.push(`scenario=${opts.scenario}`)
  return parts.join(" ")
}

/**
 * Fire-and-forget error audit log to ai_actions table.
 * Logs error type and recovery action for traceability (Req 12.7).
 */
async function logPortalReconError(
  opts: PortalReconOptions,
  errorType: string,
  errorMessage: string,
  recoveryAction: string
): Promise<void> {
  if (!isSupabaseConfigured()) return

  const { createServerSupabaseClient } = await import("@/lib/db/supabase-server")
  const { recordAiAction } = await import("@/lib/services/ai-actions")

  const client = createServerSupabaseClient()

  await recordAiAction(client, {
    organizationId: DEMO_ORG_ID,
    entityType:     "invoice",
    entityId:       opts.invoiceId,
    triggerType:    "portal_reconnaissance",
    actionType:     "portal_reconnaissance_error",
    inputSummary:   `error_type=${errorType} recovery=${recoveryAction} invoice=${opts.invoiceId}`,
    outputPayload: {
      errorType,
      errorMessage,
      recoveryAction,
      invoiceId: opts.invoiceId,
      portalUrl: opts.portalUrl ?? null,
    },
    status: "failed",
  })
}
