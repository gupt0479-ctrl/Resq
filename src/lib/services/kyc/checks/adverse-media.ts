import "server-only"
import { search } from "@/lib/tinyfish/client"
import type { KycVerificationRequest, KycCheckRunResult, KycAdverseMediaItem } from "@/lib/types/kyc"

const ADVERSE_TERMS = [
  "fraud",
  "lawsuit",
  "investigation",
  "regulatory action",
  "scam",
  "indicted",
  "charged",
  "convicted",
  "sanctions",
  "money laundering",
  "embezzlement",
  "SEC",
  "CFTC",
  "DOJ",
]

const CREDIBLE_SOURCES = [
  "reuters.com",
  "bloomberg.com",
  "wsj.com",
  "ft.com",
  "sec.gov",
  "doj.gov",
  "cfpb.gov",
  "justice.gov",
  "courtlistener.com",
  "pacer.gov",
  "law360.com",
  "bloomberg.com/news",
  "nytimes.com",
  "washingtonpost.com",
]

function isCredibleSource(url: string): boolean {
  return CREDIBLE_SOURCES.some((domain) => url.includes(domain))
}

function isAdverseContent(title: string, snippet: string): boolean {
  const text = `${title} ${snippet}`.toLowerCase()
  return ADVERSE_TERMS.some((term) => text.includes(term.toLowerCase()))
}

export async function runAdverseMediaCheck(
  request: KycVerificationRequest
): Promise<KycCheckRunResult> {
  const { directorName, businessName } = request

  if (!directorName && !businessName) {
    return {
      status: "failed",
      pointsEarned: 0,
      resultSummary: "No names to search for adverse media.",
      resultDetail: { error: "no_names_provided" },
      flags: ["No director or business name submitted"],
    }
  }

  const searchNames = [directorName, businessName].filter(Boolean).map((n) => `"${n}"`).join(" OR ")

  // Run multiple adversarial search queries
  const [fraudSearch, lawsuitSearch, investigationSearch] = await Promise.all([
    search(`${searchNames} fraud scam lawsuit`),
    search(`${searchNames} investigation regulatory SEC DOJ`),
    search(`${searchNames} court criminal charges indicted`),
  ])

  const allResults = [
    ...fraudSearch.results,
    ...lawsuitSearch.results,
    ...investigationSearch.results,
  ]

  // Deduplicate by URL
  const seen = new Set<string>()
  const uniqueResults = allResults.filter((r) => {
    if (seen.has(r.url)) return false
    seen.add(r.url)
    return true
  })

  const adverseItems: KycAdverseMediaItem[] = uniqueResults
    .filter((r) => isAdverseContent(r.title, r.snippet) && isCredibleSource(r.url))
    .slice(0, 5)
    .map((r) => ({
      headline: r.title,
      source: new URL(r.url).hostname.replace("www.", ""),
      url: r.url,
    }))

  const flags: string[] = []
  for (const item of adverseItems) {
    flags.push(`Adverse media: "${item.headline}" (${item.source})`)
  }

  const resultDetail = {
    results_found: adverseItems.length,
    credible_adverse: adverseItems.length > 0,
    articles: adverseItems,
    total_results_checked: uniqueResults.length,
    tinyfish_mode: fraudSearch.mode,
  }

  return {
    status: adverseItems.length > 0 ? "flagged" : "passed",
    pointsEarned: adverseItems.length > 0 ? 0 : 10,
    resultSummary: adverseItems.length > 0
      ? `${adverseItems.length} credible adverse media article(s) found for ${directorName ?? businessName}.`
      : `No credible adverse media found for ${[directorName, businessName].filter(Boolean).join(" / ")}.`,
    resultDetail,
    rawTinyfishResult: { fraudSearch, lawsuitSearch, investigationSearch },
    flags,
  }
}
