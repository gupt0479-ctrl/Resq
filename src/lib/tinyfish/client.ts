import "server-only"
import {
  TINYFISH_AGENT_BASE_URL,
  TINYFISH_AGENT_PATH,
  TINYFISH_API_KEY,
  TINYFISH_FETCH_BASE_URL,
  TINYFISH_SEARCH_BASE_URL,
  TINYFISH_TIMEOUT_MS,
  getTinyFishMode,
  isTinyFishLiveReady,
  isTinyFishMockMode,
} from "@/lib/env"
import {
  TinyFishAgentRunResultSchema,
  TinyFishFetchResultSchema,
  TinyFishFinancingOutputsSchema,
  TinyFishHealthResultSchema,
  TinyFishSearchResultSchema,
  type TinyFishAgentRunResult,
  type TinyFishFetchResult,
  type TinyFishFinancingOffer,
  type TinyFishFinancingOutputs,
  type TinyFishHealthResult,
  type TinyFishScenario,
  type TinyFishSearchResult,
} from "./schemas"
import type { FetchOptions, RunAgentOptions, SearchOptions } from "./types"
import { FINANCING_OFFERS, mockAgentRun, mockFetch, mockSearch } from "./mock-data"

interface FinancingEvidence {
  url: string
  title?: string
  text: string
  snippet?: string
}

interface LiveAutomationResult {
  result: unknown
  status: string
  steps: Record<string, unknown>[]
}

export class TinyFishError extends Error {
  readonly kind: "network" | "parse" | "http" | "timeout" | "misconfigured" | "run_failed"
  readonly status?: number

  constructor(
    kind: "network" | "parse" | "http" | "timeout" | "misconfigured" | "run_failed",
    message: string,
    status?: number
  ) {
    super(message)
    this.name = "TinyFishError"
    this.kind = kind
    this.status = status
  }
}

type HttpMethod = "GET" | "POST"

async function tinyFishRequest(opts: {
  url: string
  method: HttpMethod
  body?: unknown
  headers?: Record<string, string>
  signalMs: number
}): Promise<{ status: number; json: unknown }> {
  let res: Response
  try {
    res = await fetch(opts.url, {
      method: opts.method,
      headers: {
        "Accept": "application/json",
        ...opts.headers,
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(opts.signalMs),
      cache: "no-store",
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown network error"
    if (message.toLowerCase().includes("timeout") || message.includes("aborted")) {
      throw new TinyFishError("timeout", `TinyFish request timed out after ${opts.signalMs}ms`)
    }
    throw new TinyFishError("network", `TinyFish network error: ${message}`)
  }

  const text = await res.text()
  let json: unknown = null
  try {
    json = text.length > 0 ? JSON.parse(text) : null
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

export async function healthCheck(): Promise<TinyFishHealthResult> {
  const mode = getTinyFishMode()

  if (mode === "mock") {
    return {
      ok: true,
      mode: "mock",
      details: "TinyFish mock mode active (no network calls). Use /api/tinyfish/demo-run to exercise the stable fixture path.",
    }
  }

  if (mode === "misconfigured" || !isTinyFishLiveReady()) {
    return {
      ok: false,
      mode: "misconfigured",
      details: missingLiveConfigMessage(),
    }
  }

  const parsed = TinyFishHealthResultSchema.safeParse({
    ok: true,
    mode: "live",
    details: [
      "TinyFish live mode configured for official Search/Fetch/Agent APIs.",
      "This health route reports mode and configuration only; degraded-from-live truth is surfaced on executed runs.",
      `search=${TINYFISH_SEARCH_BASE_URL}`,
      `fetch=${TINYFISH_FETCH_BASE_URL}`,
      `agent=${resolveEndpoint(TINYFISH_AGENT_BASE_URL, TINYFISH_AGENT_PATH)}`,
    ].join(" "),
  })

  return parsed.success
    ? parsed.data
    : { ok: true, mode: "live", details: "TinyFish live mode configured." }
}

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
      mode: "misconfigured",
      warning: missingLiveConfigMessage(),
    }
  }

  try {
    return await searchLive(query, opts)
  } catch (err) {
    return {
      ...mockSearch(query),
      mode: "mock",
      degradedFromLive: true,
      warning: liveFailureMessage(err),
    }
  }
}

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
      mode: "misconfigured",
      warning: missingLiveConfigMessage(),
    }
  }

  try {
    return await fetchUrlLive(url, opts)
  } catch (err) {
    return {
      ...mockFetch(url),
      mode: "mock",
      degradedFromLive: true,
      warning: liveFailureMessage(err),
    }
  }
}

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
      mode: "misconfigured",
      warning: missingLiveConfigMessage(),
    }
  }

  if (scenario === "financing") {
    return runLiveFinancingScout(task)
  }

  if (scenario === "full_survival_scan") {
    return runLiveFullSurvivalScan(task)
  }

  return {
    ...mockAgentRun(scenario, task),
    mode: "mock",
    degradedFromLive: true,
    warning: `TinyFish live mode is implemented for financing scout first; scenario "${scenario}" is using demo fixtures.`,
  }
}

async function searchLive(
  query: string,
  opts: SearchOptions = {}
): Promise<TinyFishSearchResult> {
  const url = new URL(TINYFISH_SEARCH_BASE_URL)
  url.searchParams.set("query", query)
  if (opts.limit) url.searchParams.set("num", String(opts.limit))

  const { json } = await tinyFishRequest({
    url: url.toString(),
    method: "GET",
    headers: {
      "X-API-Key": TINYFISH_API_KEY,
    },
    signalMs: TINYFISH_TIMEOUT_MS,
  })

  const payload = asRecord(json)
  const rawResults = asArray(
    payload.results ??
    asRecord(payload.data).results ??
    payload.data
  )
  const candidate = {
    query,
    mode: "live" as const,
    results: rawResults
      .map((raw) => {
        const record = asRecord(raw)
        const title = getString(record.title) ?? getString(record.name)
        const resultUrl = getString(record.url) ?? getString(record.link)
        const snippet = getString(record.snippet) ?? getString(record.description) ?? getString(record.content)
        const score = getNumber(record.score) ?? getNumber(record.relevance_score)
        if (!title || !resultUrl || !snippet) return null
        return {
          title,
          url: resultUrl,
          snippet,
          score: score ?? undefined,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
  }

  const parsed = TinyFishSearchResultSchema.safeParse(candidate)
  if (!parsed.success) {
    throw new TinyFishError("parse", "TinyFish search response did not match expected schema")
  }

  return parsed.data
}

async function fetchUrlLive(
  url: string,
  opts: FetchOptions = {}
): Promise<TinyFishFetchResult> {
  const { json } = await tinyFishRequest({
    url: TINYFISH_FETCH_BASE_URL,
    method: "POST",
    headers: {
      "X-API-Key": TINYFISH_API_KEY,
      "Content-Type": "application/json",
    },
    body: {
      urls: [url],
      format: "markdown",
      selector: opts.selector,
    },
    signalMs: TINYFISH_TIMEOUT_MS,
  })

  const payload = asRecord(json)
  const pages = asArray(
    payload.results ??
    payload.pages ??
    asRecord(payload.data).results ??
    asRecord(payload.data).pages ??
    payload.data
  )
  const pageRecord = pages
    .map((page) => asRecord(page))
    .find((page) => (getString(page.url) ?? "").toLowerCase() === url.toLowerCase())
    ?? asRecord(pages[0])

  const parsed = TinyFishFetchResultSchema.safeParse({
    url,
    mode: "live" as const,
    status: getNumber(pageRecord.status) ?? getNumber(pageRecord.status_code) ?? getNumber(pageRecord.http_status) ?? 200,
    title: getString(pageRecord.title) ?? undefined,
    text: getString(pageRecord.text) ?? getString(pageRecord.content) ?? getString(pageRecord.markdown) ?? "",
    fetchedAt: getString(pageRecord.fetched_at) ?? getString(pageRecord.fetchedAt) ?? new Date().toISOString(),
  })
  if (!parsed.success) {
    throw new TinyFishError("parse", "TinyFish fetch response did not match expected schema")
  }

  return parsed.data
}

async function runLiveFinancingScout(task: string): Promise<TinyFishAgentRunResult> {
  const queries = buildFinancingQueries(task)
  const warnings: string[] = []

  const searchStart = Date.now()
  const searchResults = await Promise.all(
    queries.map(async (query) => {
      try {
        return await searchLive(query, { limit: 4 })
      } catch (err) {
        warnings.push(`search "${query}": ${liveFailureMessage(err)}`)
        return null
      }
    })
  )
  const liveSearchResults = searchResults.flatMap((result) => result ? [result] : [])
  const uniqueHits = dedupeSearchHits(liveSearchResults).slice(0, 3)
  const searchDuration = Date.now() - searchStart

  const fetchStart = Date.now()
  const fetchedPages = await Promise.all(
    uniqueHits.map(async (hit) => {
      try {
        const page = await fetchUrlLive(hit.url)
        return { ...page, snippet: hit.snippet }
      } catch (err) {
        warnings.push(`fetch "${hit.url}": ${liveFailureMessage(err)}`)
        return null
      }
    })
  )
  const livePages = fetchedPages.flatMap((page) => page ? [page] : [])
  const fetchDuration = Date.now() - fetchStart

  let offers = normalizeFinancingOffers(
    livePages.map((page) => ({
      url: page.url,
      title: page.title,
      text: page.text,
      snippet: page.snippet,
    }))
  )

  let agentAssistedUrl: string | null = null
  let agentDuration = 0
  if (offers.length === 0 && uniqueHits[0]) {
    const agentStart = Date.now()
    try {
      offers = await runFinancingAgentAssist(uniqueHits[0].url)
      agentAssistedUrl = uniqueHits[0].url
    } catch (err) {
      warnings.push(`agent "${uniqueHits[0].url}": ${liveFailureMessage(err)}`)
    }
    agentDuration = Date.now() - agentStart
  }

  if (offers.length === 0) {
    const warning = [
      "TinyFish financing scout fell back to deterministic fixtures.",
      ...warnings,
    ].join(" | ")
    const fallback = mockAgentRun("financing", task)
    return {
      ...fallback,
      mode: "mock",
      degradedFromLive: true,
      warning,
      outputs: buildFinancingOutputs({
        offers: FINANCING_OFFERS.map((offer) => ({ ...offer })),
        searchQueries: queries,
        sourceUrls: uniqueHits.map((hit) => hit.url),
        mode: "mock",
        degradedFromLive: true,
        warning,
        liveAttempted: true,
        summary: fallback.summary,
      }),
    }
  }

  const steps = [
    makeStep(0, "search_financing_sources", `Queried ${queries.length} financing searches and kept ${uniqueHits.length} candidate pages.`, searchDuration),
    makeStep(1, "fetch_candidate_pages", `Fetched ${livePages.length} lender or financing pages for content extraction.`, fetchDuration),
    makeStep(2, "normalize_financing_offers", `Normalized ${offers.length} financing offers into the app's stable output shape.`, agentAssistedUrl ? Math.max(agentDuration, 1) : 1),
  ]
  if (agentAssistedUrl) {
    steps.push(
      makeStep(3, "agent_assist", `Used TinyFish Agent on ${agentAssistedUrl} to recover structured financing terms.`, agentDuration),
    )
  }

  const outputs = buildFinancingOutputs({
    offers,
    sourceUrls: uniqueHits.map((hit) => hit.url),
    searchQueries: queries,
    sources: uniqueHits.map((hit) => ({
      title: hit.title,
      url: hit.url,
      snippet: hit.snippet,
      score: hit.score ?? null,
    })),
    fetchedPages: livePages.map((page) => ({
      url: page.url,
      title: page.title ?? null,
      status: page.status,
      excerpt: page.text.slice(0, 280),
    })),
    agentAssistedUrl,
    mode: "live",
    degradedFromLive: false,
    warning: warnings.length > 0 ? warnings.join(" | ") : null,
    summary: summarizeFinancingOffers(offers),
  })

  const parsed = TinyFishAgentRunResultSchema.safeParse({
    task,
    scenario: "financing",
    mode: "live",
    steps,
    summary: summarizeFinancingOffers(offers),
    outputs,
    warning: warnings.length > 0 ? warnings.join(" | ") : undefined,
  })
  if (!parsed.success) {
    throw new TinyFishError("parse", "TinyFish financing scout result failed schema validation")
  }
  return parsed.data
}

async function runLiveFullSurvivalScan(task: string): Promise<TinyFishAgentRunResult> {
  const financing = await runLiveFinancingScout(task)
  const vendor = mockAgentRun("vendor", task)
  const insurance = mockAgentRun("insurance", task)
  const financingSteps = financing.steps.map((step, index) => ({ ...step, index }))
  const vendorSteps = vendor.steps.map((step, index) => ({
    ...step,
    index: financingSteps.length + index,
  }))
  const insuranceSteps = insurance.steps.map((step, index) => ({
    ...step,
    index: financingSteps.length + vendorSteps.length + index,
  }))
  const offerCount = Array.isArray((financing.outputs as Record<string, unknown>).offers)
    ? ((financing.outputs as Record<string, unknown>).offers as unknown[]).length
    : 0
  const warnings = [
    financing.warning,
    "Vendor and insurance branches remain deterministic demo fixtures in this live scan.",
  ].filter(Boolean)

  return {
    task,
    scenario: "full_survival_scan",
    mode: financing.mode === "live" ? "live" : "mock",
    degradedFromLive: true,
    warning: warnings.join(" | "),
    steps: [...financingSteps, ...vendorSteps, ...insuranceSteps],
    summary:
      financing.mode === "live"
        ? `Survival scan complete: ${offerCount} live financing offer${offerCount === 1 ? "" : "s"} plus fixture-backed vendor and insurance opportunities.`
        : "Survival scan complete in fixture-backed mode after TinyFish live financing degraded.",
    outputs: {
      financing: {
        ...(financing.outputs as TinyFishFinancingOutputs),
        mode: financing.mode,
        degradedFromLive: financing.degradedFromLive ?? false,
        warning: financing.warning ?? null,
        summary: financing.summary,
      },
      vendor: {
        ...vendor.outputs,
        mode: vendor.mode,
        degradedFromLive: vendor.degradedFromLive ?? false,
        warning: vendor.warning ?? null,
        summary: vendor.summary,
      },
      insurance: {
        ...insurance.outputs,
        mode: insurance.mode,
        degradedFromLive: insurance.degradedFromLive ?? false,
        warning: insurance.warning ?? null,
        summary: insurance.summary,
      },
    },
  }
}

export function buildGoalString(url: string): string {
  return [
    `STEP 1: Handle any cookie consent banners, popup overlays, or modal dialogs before interacting with page content.`,
    `STEP 2: Navigate to the primary financing or loan product section of ${url}.`,
    `STEP 3: Extract all available financing offers from the page.`,
    `STEP 4: Return strict JSON only — no surrounding prose, no markdown, no explanation.`,
    ``,
    `Required output schema:`,
    `{ "offers": [ { "lender": string, "product": string, "aprPercent": number|null, "termMonths": number|null, "maxAmountUsd": number|null, "decisionSpeed": string|null, "notes": string|null } ] }`,
    ``,
    `Use null for any field you cannot find. Do not invent values.`,
  ].join("\n")
}

async function runFinancingAgentAssist(url: string): Promise<TinyFishFinancingOffer[]> {
  const payload = await runAutomationLive({
    url,
    goal: buildGoalString(url),
  })

  if (payload.status !== "COMPLETED") {
    throw new TinyFishError("run_failed", `TinyFish agent run ended with status ${payload.status}`)
  }

  let resultValue = payload.result
  if (typeof resultValue === "string") {
    try {
      resultValue = JSON.parse(resultValue)
    } catch {
      // pass raw string through — normalizeAgentFinancingOffers handles strings
    }
  }
  return normalizeAgentFinancingOffers(resultValue, url)
}

async function runAutomationLive(opts: {
  url: string
  goal: string
}): Promise<LiveAutomationResult> {
  const { json } = await tinyFishRequest({
    url: resolveEndpoint(TINYFISH_AGENT_BASE_URL, TINYFISH_AGENT_PATH),
    method: "POST",
    headers: {
      "X-API-Key": TINYFISH_API_KEY,
      "Content-Type": "application/json",
    },
    body: {
      url: opts.url,
      goal: opts.goal,
      browser_profile: "lite",
    },
    signalMs: TINYFISH_TIMEOUT_MS,
  })

  const payload = asRecord(json)
  return {
    status: getString(payload.status) ?? "UNKNOWN",
    result: payload.result ?? asRecord(payload.data).result ?? null,
    steps: asArray(payload.steps ?? asRecord(payload.data).steps).map((step) => asRecord(step)),
  }
}

function liveFailureMessage(err: unknown): string {
  if (err instanceof TinyFishError) return `TinyFish ${err.kind}: ${err.message}`
  if (err instanceof Error) return err.message
  return "Unknown TinyFish error"
}

function missingLiveConfigMessage(): string {
  const missing: string[] = []
  if (!TINYFISH_API_KEY) missing.push("TINYFISH_API_KEY")
  return missing.length > 0
    ? `TinyFish live mode missing: ${missing.join(", ")}`
    : "TinyFish live mode not ready."
}

function resolveEndpoint(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  if (!path) return baseUrl
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const cleaned = value.replace(/[$,%\s]/g, "").replace(/,/g, "")
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function makeStep(index: number, label: string, observation: string, durationMs: number) {
  return {
    index,
    label,
    observation,
    durationMs: Math.max(1, Math.round(durationMs)),
  }
}

function buildFinancingOutputs(candidate: TinyFishFinancingOutputs): TinyFishFinancingOutputs {
  const parsed = TinyFishFinancingOutputsSchema.safeParse(candidate)
  if (!parsed.success) {
    throw new TinyFishError("parse", "TinyFish financing outputs failed schema validation")
  }
  return parsed.data
}

function dedupeSearchHits(results: TinyFishSearchResult[]) {
  const seen = new Set<string>()
  const hits: Array<TinyFishSearchResult["results"][number]> = []
  for (const result of results) {
    for (const hit of result.results) {
      if (seen.has(hit.url)) continue
      seen.add(hit.url)
      hits.push(hit)
    }
  }
  return hits
}

function buildFinancingQueries(task: string): string[] {
  return [
    task,
    "small business working capital line of credit fast approval",
    "SMB financing offers same day funding term loan APR",
  ]
}

function normalizeFinancingOffers(evidence: FinancingEvidence[]): TinyFishFinancingOffer[] {
  return evidence
    .flatMap((page) => {
      const text = `${page.title ?? ""}\n${page.text}\n${page.snippet ?? ""}`
      const lender = deriveLenderName(page)
      const product = matchProduct(text)
      const aprPercent = matchApr(text)
      const termMonths = matchTermMonths(text)
      const maxAmountUsd = matchMaxAmount(text)
      const decisionSpeed = matchDecisionSpeed(text)
      const confidence = calculateConfidence({
        aprPercent,
        termMonths,
        maxAmountUsd,
        decisionSpeed,
        title: page.title,
      })
      if (!lender || !product || confidence < 0.45) return []
      return [{
        lender,
        product,
        aprPercent: aprPercent ?? undefined,
        termMonths: termMonths ?? undefined,
        maxAmountUsd: maxAmountUsd ?? undefined,
        decisionSpeed: decisionSpeed ?? undefined,
        notes: buildNotes(text, page.snippet),
        sourceUrl: page.url,
        sourceTitle: page.title,
        confidence,
      }]
    })
}

function normalizeAgentFinancingOffers(raw: unknown, fallbackUrl: string): TinyFishFinancingOffer[] {
  return asOfferArray(raw)
    .flatMap((offer) => {
      const record = asRecord(offer)
      const lender = getString(record.lender) ?? getString(record.provider)
      const product = getString(record.product) ?? getString(record.offer_type)
      if (!lender || !product) return []
      return [{
        lender,
        product,
        aprPercent: getNumber(record.aprPercent ?? record.apr ?? record.rate_percent) ?? undefined,
        termMonths: getNumber(record.termMonths ?? record.term_months) ?? undefined,
        maxAmountUsd: getNumber(record.maxAmountUsd ?? record.max_amount_usd ?? record.maxAmount) ?? undefined,
        decisionSpeed: getString(record.decisionSpeed) ?? getString(record.speed_to_decision) ?? undefined,
        notes: getString(record.notes) ?? "Structured from TinyFish Agent output.",
        sourceUrl: getString(record.sourceUrl) ?? fallbackUrl,
        sourceTitle: getString(record.sourceTitle) ?? undefined,
        confidence: Math.min(0.95, Math.max(0.55, getNumber(record.confidence) ?? 0.7)),
      }]
    })
}

function asOfferArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === "string") {
    try {
      return asOfferArray(JSON.parse(raw))
    } catch {
      return []
    }
  }
  const record = asRecord(raw)
  if (Array.isArray(record.offers)) return record.offers
  if (record.offer) return [record.offer]
  return Object.keys(record).length > 0 ? [record] : []
}

function deriveLenderName(page: FinancingEvidence): string | null {
  const title = page.title ?? ""
  const fromTitle = title.split(/[|\-–:]/)[0]?.trim()
  if (fromTitle && fromTitle.length >= 3) return fromTitle
  try {
    const hostname = new URL(page.url).hostname.replace(/^www\./, "")
    const base = hostname.split(".")[0]
    return base
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  } catch {
    return null
  }
}

function matchProduct(text: string): string | null {
  const lower = text.toLowerCase()
  if (lower.includes("line of credit")) return "Line of credit"
  if (lower.includes("working capital")) return "Working capital loan"
  if (lower.includes("merchant cash advance")) return "Merchant cash advance"
  if (lower.includes("term loan")) return "Term loan"
  if (lower.includes("microloan")) return "Microloan"
  if (lower.includes("sba")) return "SBA financing"
  if (lower.includes("invoice factoring")) return "Invoice factoring"
  return null
}

function matchApr(text: string): number | null {
  const patterns = [
    /(?:apr|interest rate)[^0-9]{0,16}(\d{1,2}(?:\.\d{1,2})?)\s*%/i,
    /(\d{1,2}(?:\.\d{1,2})?)\s*%\s*(?:apr|interest rate)/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (!match) continue
    const parsed = Number(match[1])
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function matchTermMonths(text: string): number | null {
  const match = text.match(/(\d{1,3})\s*(?:month|months|mo\b)/i)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

function matchMaxAmount(text: string): number | null {
  const matches = [...text.matchAll(/\$ ?([0-9][0-9,]{2,})(?:\.\d+)?/g)]
  const parsed = matches
    .map((match) => Number(match[1].replace(/,/g, "")))
    .filter((amount) => Number.isFinite(amount) && amount >= 1_000 && amount <= 5_000_000)
  if (parsed.length === 0) return null
  return Math.max(...parsed)
}

function matchDecisionSpeed(text: string): string | null {
  const lower = text.toLowerCase()
  if (lower.includes("same day")) return "Same day"
  if (lower.includes("24 hours")) return "24 hours"
  if (lower.includes("48 hours")) return "48 hours"
  const dayMatch = text.match(/(\d{1,2})\s*(?:business\s*)?days?/i)
  if (dayMatch) return `${dayMatch[1]} days`
  return null
}

function calculateConfidence(input: {
  aprPercent: number | null
  termMonths: number | null
  maxAmountUsd: number | null
  decisionSpeed: string | null
  title?: string
}) {
  let score = 0.25
  if (input.title) score += 0.1
  if (input.aprPercent !== null) score += 0.2
  if (input.termMonths !== null) score += 0.15
  if (input.maxAmountUsd !== null) score += 0.2
  if (input.decisionSpeed) score += 0.1
  return Math.min(0.95, score)
}

function buildNotes(text: string, snippet?: string) {
  const cleanSnippet = snippet?.trim()
  if (cleanSnippet) return cleanSnippet
  return text.replace(/\s+/g, " ").trim().slice(0, 180)
}

function summarizeFinancingOffers(offers: TinyFishFinancingOffer[]) {
  const sorted = [...offers].sort((a, b) => {
    const aRate = a.aprPercent ?? Number.POSITIVE_INFINITY
    const bRate = b.aprPercent ?? Number.POSITIVE_INFINITY
    return aRate - bRate
  })
  const top = sorted[0]
  if (!top) return "Financing scout completed with normalized offer output."
  const rate = top.aprPercent !== undefined ? `${top.aprPercent}% APR` : "terms still partial"
  const speed = top.decisionSpeed ? ` and ${top.decisionSpeed.toLowerCase()} decision speed` : ""
  return `${offers.length} financing offer${offers.length === 1 ? "" : "s"} surfaced. Best current fit is ${top.lender} (${rate}${speed}).`
}
