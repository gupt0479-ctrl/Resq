import "server-only"
import { search, fetchUrl } from "@/lib/tinyfish/client"
import type { KycVerificationRequest, KycCheckRunResult } from "@/lib/types/kyc"

interface CompanyRecord {
  name: string
  status: "active" | "dissolved" | "unknown"
  state?: string
  incorporated?: string
  dissolved?: string
  address?: string
}

function parseCompaniesFromText(text: string): CompanyRecord[] {
  // Heuristic: look for patterns like "company name — dissolved YYYY" in TinyFish output
  const companies: CompanyRecord[] = []
  const lines = text.split("\n").filter((l) => l.trim())
  for (const line of lines.slice(0, 20)) {
    const isDissolvedLine = /dissolv|inactive|struck off|cancelled/i.test(line)
    const isActiveMarker = /active|good standing/i.test(line)
    if (line.length > 5 && line.length < 120) {
      companies.push({
        name: line.trim().slice(0, 80),
        status: isDissolvedLine ? "dissolved" : isActiveMarker ? "active" : "unknown",
      })
    }
  }
  return companies.slice(0, 10)
}

export async function runPeopleVerificationCheck(
  request: KycVerificationRequest
): Promise<KycCheckRunResult> {
  const { directorName, businessName } = request

  if (!directorName) {
    return {
      status: "failed",
      pointsEarned: 0,
      resultSummary: "No director name provided.",
      resultDetail: { error: "director_name_missing" },
      flags: ["No director name submitted"],
    }
  }

  const openCorpUrl = `https://opencorporates.com/officers?q=${encodeURIComponent(directorName)}`

  const [openCorpResult, searchResult] = await Promise.all([
    fetchUrl(openCorpUrl, { selector: ".officers, .company-list, table" }),
    search(`"${directorName}" director company registration incorporation dissolution`),
  ])

  const rawText = openCorpResult.text ?? ""
  const companies = parseCompaniesFromText(rawText)
  const dissolvedCount = companies.filter((c) => c.status === "dissolved").length

  const flags: string[] = []

  if (dissolvedCount > 2) {
    flags.push(`${dissolvedCount} dissolved companies found under director "${directorName}"`)
    flags.push("Rapid incorporation-dissolution pattern detected — possible shell company activity")
  } else if (dissolvedCount > 0) {
    flags.push(`${dissolvedCount} dissolved company found under director "${directorName}"`)
  }

  // Check for same address across unrelated businesses (heuristic from text)
  const addressMatches = rawText.match(/\d+\s+\w+\s+(st|ave|blvd|rd|dr|ln|ct|way)/gi) ?? []
  const uniqueAddresses = new Set(addressMatches.map((a) => a.toLowerCase()))
  if (uniqueAddresses.size < addressMatches.length / 2 && addressMatches.length > 2) {
    flags.push("Same address repeated across multiple registered companies")
  }

  const resultDetail = {
    director_name: directorName,
    companies_found: companies,
    dissolved_count: dissolvedCount,
    pattern_flag: dissolvedCount > 2,
    source_url: openCorpUrl,
    search_results: searchResult.results.slice(0, 3).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
    })),
    tinyfish_mode: openCorpResult.mode,
  }

  const pointsEarned = dissolvedCount > 2 ? 5 : dissolvedCount > 0 ? 10 : 15
  const status = flags.length > 0 ? "flagged" : "passed"

  return {
    status,
    pointsEarned,
    resultSummary: `${directorName}: ${companies.length} companies found, ${dissolvedCount} dissolved.`,
    resultDetail,
    sourceUrl: openCorpUrl,
    rawTinyfishResult: { opencorp: openCorpResult, search: searchResult },
    flags,
  }
}
