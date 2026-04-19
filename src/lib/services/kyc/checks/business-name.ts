import "server-only"
import { search, fetchUrl } from "@/lib/tinyfish/client"
import type { KycVerificationRequest, KycCheckRunResult } from "@/lib/types/kyc"

// SOS registry URLs by state
const SOS_URLS: Record<string, string> = {
  MN: "https://mblsportal.sos.state.mn.us/",
  DE: "https://icis.corp.delaware.gov/",
  NY: "https://apps.dos.ny.gov/publicInquiry/",
  CA: "https://businesssearch.sos.ca.gov/",
  TX: "https://www.sos.state.tx.us/corp/businesssearch.shtml",
  IL: "https://apps.ilsos.gov/corporatellc/",
  FL: "https://search.sunbiz.org/",
}

export async function runBusinessNameCheck(
  request: KycVerificationRequest
): Promise<KycCheckRunResult> {
  const { businessName, registeredState, directorName } = request

  if (!businessName) {
    return {
      status: "failed",
      pointsEarned: 0,
      resultSummary: "No business name provided.",
      resultDetail: { error: "business_name_missing" },
      flags: ["No business name submitted"],
    }
  }

  const state = registeredState ?? "MN"
  const sosUrl = SOS_URLS[state] ?? `https://www.google.com/search?q=${encodeURIComponent(state + " secretary of state business search")}`

  // TinyFish: fetch the SOS registry page and search for the business
  const searchQuery = `"${businessName}" site:${new URL(sosUrl).hostname} business registration`
  const [sosPageResult, searchResult] = await Promise.all([
    fetchUrl(sosUrl, { selector: "table, .business-details, #results" }),
    search(`${businessName} ${state} secretary of state business registration status`),
  ])

  // Parse result — in live mode TinyFish returns real content, in mock mode we get fixture
  const pageText = sosPageResult.text ?? ""
  const topSearchResult = searchResult.results[0]

  // Determine registration status from page content + search results
  const isActive = !pageText.toLowerCase().includes("dissolved")
    && !pageText.toLowerCase().includes("inactive")
    && !pageText.toLowerCase().includes("revoked")

  // Count name changes (flag if >1)
  const nameChangeCount = (pageText.match(/name change|former name|previous name/gi) ?? []).length
  const nameChangeFlagged = nameChangeCount > 1

  const resultDetail = {
    business_name: businessName,
    state,
    registration_status: isActive ? "active" : "unknown",
    name_changes: nameChangeCount,
    sos_page_excerpt: pageText.slice(0, 500),
    search_snippet: topSearchResult?.snippet ?? null,
    source_url: topSearchResult?.url ?? sosUrl,
    tinyfish_mode: sosPageResult.mode,
  }

  const flags: string[] = []
  if (nameChangeFlagged) {
    flags.push(`Business name changed ${nameChangeCount} times — possible rebranding to evade records`)
  }
  if (!isActive && pageText.length > 100) {
    flags.push("Business registration may be inactive or dissolved")
  }

  const pointsEarned = flags.length > 0 ? 8 : 15
  const status = flags.length > 0 ? "flagged" : "passed"

  return {
    status,
    pointsEarned,
    resultSummary: `${businessName} registration check complete via ${state} SOS registry.`,
    resultDetail,
    sourceUrl: topSearchResult?.url ?? sosUrl,
    rawTinyfishResult: { page: sosPageResult, search: searchResult },
    flags,
  }
}
