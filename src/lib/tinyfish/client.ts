import "server-only"
import {
  TINYFISH_AGENT_PATH,
  TINYFISH_API_KEY,
  TINYFISH_BASE_URL,
  TINYFISH_FETCH_PATH,
  TINYFISH_HEALTH_PATH,
  TINYFISH_SEARCH_PATH,
  TINYFISH_TIMEOUT_MS,
  getTinyFishMode,
  isTinyFishLiveReady,
  isTinyFishMockMode,
} from "@/lib/env"
import {
  TinyFishAgentRunResultSchema,
  TinyFishFetchResultSchema,
  TinyFishHealthResultSchema,
  TinyFishSearchResultSchema,
  type TinyFishAgentRunResult,
  type TinyFishFetchResult,
  type TinyFishHealthResult,
  type TinyFishScenario,
  type TinyFishSearchResult,
} from "./schemas"
import type { FetchOptions, RunAgentOptions, SearchOptions } from "./types"
import { mockAgentRun, mockFetch, mockSearch } from "./mock-data"

export class TinyFishError extends Error {
  readonly kind: "network" | "parse" | "http" | "timeout" | "misconfigured"
  readonly status?: number
  constructor(
    kind: "network" | "parse" | "http" | "timeout" | "misconfigured",
    message: string,
    status?: number
  ) {
    super(message)
    this.name   = "TinyFishError"
    this.kind   = kind
    this.status = status
  }
}

// ─── Internal request helper ───────────────────────────────────────────────
// All live TinyFish calls MUST go through this. To switch to real TinyFish
// docs later, change only this function's request shape + parsing.

type HttpMethod = "GET" | "POST"

async function tinyFishRequest(opts: {
  path:     string
  method:   HttpMethod
  body?:    unknown
  signalMs: number
}): Promise<{ status: number; json: unknown }> {
  const url = `${TINYFISH_BASE_URL.replace(/\/$/, "")}/${opts.path.replace(/^\//, "")}`

  let res: Response
  try {
    res = await fetch(url, {
      method:  opts.method,
      headers: {
        "Authorization": `Bearer ${TINYFISH_API_KEY}`,
        "Content-Type":  "application/json",
        "Accept":        "application/json",
      },
      body:   opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(opts.signalMs),
      cache:  "no-store",
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown network error"
    if (message.toLowerCase().includes("timeout") || message.includes("aborted")) {
      throw new TinyFishError("timeout", `TinyFish request timed out after ${opts.signalMs}ms`)
    }
    throw new TinyFishError("network", `TinyFish network error: ${message}`)
  }

  let json: unknown
  try {
    json = await res.json()
  } catch {
    if (!res.ok) {
      throw new TinyFishError("http", `TinyFish HTTP ${res.status}`, res.status)
    }
    throw new TinyFishError("parse", "TinyFish response was not valid JSON")
  }

  if (!res.ok) {
    throw new TinyFishError("http", `TinyFish HTTP ${res.status}`, res.status)
  }

  return { status: res.status, json }
}

// ─── Health ────────────────────────────────────────────────────────────────

export async function healthCheck(): Promise<TinyFishHealthResult> {
  const mode = getTinyFishMode()

  if (mode === "mock") {
    return { ok: true, mode: "mock", details: "TinyFish mock mode active (no network calls)." }
  }

  if (mode === "misconfigured" || !isTinyFishLiveReady()) {
    return {
      ok:      false,
      mode:    "misconfigured",
      details: missingLivePathsMessage(),
    }
  }

  try {
    const { json } = await tinyFishRequest({
      path:     TINYFISH_HEALTH_PATH,
      method:   "GET",
      signalMs: TINYFISH_TIMEOUT_MS,
    })
    const parsed = TinyFishHealthResultSchema.safeParse({
      ok:      true,
      mode:    "live",
      details: typeof (json as { status?: unknown } | null)?.status === "string"
        ? (json as { status: string }).status
        : "live",
    })
    if (!parsed.success) {
      return { ok: true, mode: "live", details: "Live, unrecognized response shape." }
    }
    return parsed.data
  } catch (err) {
    // Live attempt failed. Flag it so sponsors/judges can tell the difference
    // between "always mocked" and "tried live, had to fall back".
    return {
      ok:               false,
      mode:             "mock",
      details:          liveFailureMessage(err),
      degradedFromLive: true,
      warning:          "TinyFish live health check failed; downgraded to mock.",
    }
  }
}

// ─── Search ────────────────────────────────────────────────────────────────

export async function search(
  query: string,
  opts: SearchOptions = {}
): Promise<TinyFishSearchResult> {
  if (!query || typeof query !== "string") {
    throw new TinyFishError("parse", "TinyFish search: query is required")
  }

  if (isTinyFishMockMode()) return mockSearch(query)
  if (!isTinyFishLiveReady()) {
    return {
      ...mockSearch(query),
      mode:    "misconfigured",
      warning: missingLivePathsMessage(),
    }
  }

  try {
    // TinyFish search uses GET with query params and X-API-Key header.
    // TINYFISH_SEARCH_PATH may be a full URL (different domain) or a path.
    const searchUrl = /^https?:\/\//i.test(TINYFISH_SEARCH_PATH)
      ? TINYFISH_SEARCH_PATH
      : `${TINYFISH_BASE_URL.replace(/\/$/, "")}/${TINYFISH_SEARCH_PATH.replace(/^\//, "")}`
    const url = new URL(searchUrl)
    url.searchParams.set("query", query)
    if (opts.limit) url.searchParams.set("num", String(opts.limit))

    let res: Response
    try {
      res = await fetch(url.toString(), {
        method:  "GET",
        headers: {
          "X-API-Key": TINYFISH_API_KEY,
          "Accept":    "application/json",
        },
        signal: AbortSignal.timeout(TINYFISH_TIMEOUT_MS),
        cache:  "no-store",
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown network error"
      throw new TinyFishError("network", `TinyFish search network error: ${message}`)
    }

    let json: unknown
    try { json = await res.json() } catch { json = {} }

    if (!res.ok) {
      throw new TinyFishError("http", `TinyFish search HTTP ${res.status}`, res.status)
    }

    // TinyFish returns { results: [{ position, title, url, snippet, site_name }] }
    const rawResults = Array.isArray((json as { results?: unknown })?.results)
      ? (json as { results: Record<string, unknown>[] }).results
      : []

    const candidate = {
      query,
      mode: "live" as const,
      results: rawResults.map(r => ({
        title:   String(r.title   ?? ""),
        url:     String(r.url     ?? ""),
        snippet: String(r.snippet ?? ""),
        score:   typeof r.score === "number" ? r.score : undefined,
      })),
    }
    const parsed = TinyFishSearchResultSchema.safeParse(candidate)
    if (!parsed.success) {
      return {
        ...mockSearch(query),
        mode:             "mock",
        degradedFromLive: true,
        warning:          "TinyFish live response failed schema validation; returned fixture.",
      }
    }
    return parsed.data
  } catch (err) {
    return {
      ...mockSearch(query),
      mode:             "mock",
      degradedFromLive: true,
      warning:          liveFailureMessage(err),
    }
  }
}

// ─── Fetch ─────────────────────────────────────────────────────────────────

export async function fetchUrl(
  url: string,
  opts: FetchOptions = {}
): Promise<TinyFishFetchResult> {
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new TinyFishError("parse", "TinyFish fetchUrl: http(s) URL required")
  }

  if (isTinyFishMockMode()) return mockFetch(url)
  if (!isTinyFishLiveReady()) {
    return {
      ...mockFetch(url),
      mode:    "misconfigured",
      warning: missingLivePathsMessage(),
    }
  }

  try {
    const { json } = await tinyFishRequest({
      path:     TINYFISH_FETCH_PATH,
      method:   "POST",
      body:     { url, selector: opts.selector },
      signalMs: TINYFISH_TIMEOUT_MS,
    })
    const payload = json as Record<string, unknown>
    const parsed = TinyFishFetchResultSchema.safeParse({
      url,
      mode:      "live",
      status:    typeof payload.status === "number" ? payload.status : 200,
      title:     typeof payload.title  === "string" ? payload.title  : undefined,
      text:      typeof payload.text   === "string" ? payload.text   : "",
      fetchedAt: typeof payload.fetchedAt === "string"
        ? payload.fetchedAt
        : new Date().toISOString(),
    })
    if (!parsed.success) {
      return {
        ...mockFetch(url),
        mode:             "mock",
        degradedFromLive: true,
        warning:          "TinyFish live response failed schema validation; returned fixture.",
      }
    }
    return parsed.data
  } catch (err) {
    return {
      ...mockFetch(url),
      mode:             "mock",
      degradedFromLive: true,
      warning:          liveFailureMessage(err),
    }
  }
}

// ─── Agent run ─────────────────────────────────────────────────────────────

export async function runAgent(
  task: string,
  opts: RunAgentOptions = {}
): Promise<TinyFishAgentRunResult> {
  if (!task || typeof task !== "string") {
    throw new TinyFishError("parse", "TinyFish runAgent: task is required")
  }
  const scenario: TinyFishScenario = opts.scenario ?? "full_survival_scan"

  if (isTinyFishMockMode()) return mockAgentRun(scenario, task)
  if (!isTinyFishLiveReady()) {
    return {
      ...mockAgentRun(scenario, task),
      mode:    "misconfigured",
      warning: missingLivePathsMessage(),
    }
  }

  try {
    const { json } = await tinyFishRequest({
      path:     TINYFISH_AGENT_PATH,
      method:   "POST",
      body: {
        task,
        scenario,
        context: {
          organizationId: opts.organizationId,
          invoiceId:      opts.invoiceId,
          customerName:   opts.customerName,
          dryRun:         opts.dryRun ?? false,
        },
      },
      signalMs: TINYFISH_TIMEOUT_MS,
    })
    const payload = json as Record<string, unknown>
    const parsed = TinyFishAgentRunResultSchema.safeParse({
      task,
      scenario,
      mode:    "live",
      steps:   Array.isArray(payload.steps) ? payload.steps : [],
      summary: typeof payload.summary === "string" ? payload.summary : "",
      outputs: (payload.outputs && typeof payload.outputs === "object")
        ? (payload.outputs as Record<string, unknown>)
        : {},
    })
    if (!parsed.success) {
      return {
        ...mockAgentRun(scenario, task),
        mode:             "mock",
        degradedFromLive: true,
        warning:          "TinyFish live response failed schema validation; returned fixture.",
      }
    }
    return parsed.data
  } catch (err) {
    return {
      ...mockAgentRun(scenario, task),
      mode:             "mock",
      degradedFromLive: true,
      warning:          liveFailureMessage(err),
    }
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function liveFailureMessage(err: unknown): string {
  if (err instanceof TinyFishError) return `TinyFish ${err.kind}: ${err.message}`
  if (err instanceof Error)         return err.message
  return "Unknown TinyFish error"
}

function missingLivePathsMessage(): string {
  const missing: string[] = []
  if (!TINYFISH_API_KEY)    missing.push("TINYFISH_API_KEY")
  if (!TINYFISH_BASE_URL)   missing.push("TINYFISH_BASE_URL")
  if (!TINYFISH_HEALTH_PATH) missing.push("TINYFISH_HEALTH_PATH")
  if (!TINYFISH_SEARCH_PATH) missing.push("TINYFISH_SEARCH_PATH")
  if (!TINYFISH_FETCH_PATH)  missing.push("TINYFISH_FETCH_PATH")
  if (!TINYFISH_AGENT_PATH)  missing.push("TINYFISH_AGENT_PATH")
  return missing.length
    ? `TinyFish live mode missing: ${missing.join(", ")}`
    : "TinyFish live mode not ready."
}
