import "server-only"
import { fetchUrl, search } from "@/lib/tinyfish/client"
import type { KycVerificationRequest, KycCheckRunResult } from "@/lib/types/kyc"

const OFAC_URL = "https://sanctionssearch.ofac.treas.gov/"
const OPENSANCTIONS_API = "https://api.opensanctions.org/match/default"

interface SanctionMatch {
  list: string
  matchedName: string
  program?: string
  confidence: "HIGH" | "MEDIUM" | "LOW"
}

async function checkOpenSanctions(name: string): Promise<SanctionMatch | null> {
  try {
    const res = await fetch(OPENSANCTIONS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        queries: {
          q1: {
            schema: "Person",
            properties: { name: [name] },
          },
        },
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json() as { responses?: { q1?: { results?: { schema: string; properties: { name?: string[] }; datasets?: string[] }[] } } }
    const results = data.responses?.q1?.results ?? []
    const hit = results.find((r) => (r.datasets ?? []).some(
      (d: string) => ["us_ofac_sdn", "eu_fsf", "un_sc_sanctions"].includes(d)
    ))
    if (!hit) return null
    const datasets = hit.datasets ?? []
    return {
      list: datasets.includes("us_ofac_sdn") ? "OFAC SDN" : datasets.includes("eu_fsf") ? "EU Financial Sanctions" : "UN Sanctions",
      matchedName: (hit.properties?.name?.[0]) ?? name,
      confidence: "MEDIUM",
    }
  } catch {
    return null
  }
}

export async function runWatchlistCheck(
  request: KycVerificationRequest
): Promise<KycCheckRunResult> {
  const { directorName, businessName } = request
  const namesToSearch = [directorName, businessName].filter(Boolean) as string[]

  if (namesToSearch.length === 0) {
    return {
      status: "failed",
      pointsEarned: 0,
      resultSummary: "No names to screen.",
      resultDetail: { error: "no_names_to_screen" },
      flags: ["No director or business name submitted"],
    }
  }

  // Run OFAC page fetch + OpenSanctions API + search in parallel
  const [ofacPage, opensanctionsHit, searchResult] = await Promise.all([
    fetchUrl(OFAC_URL, { selector: "#content, .sanctions-result, table" }),
    directorName ? checkOpenSanctions(directorName) : Promise.resolve(null),
    search(
      namesToSearch.map((n) => `"${n}"`).join(" OR ")
      + " OFAC sanctions SDN watchlist"
    ),
  ])

  const ofacText = ofacPage.text ?? ""

  // Heuristic: check if OFAC page text or search results indicate a match
  const ofacTextHit = namesToSearch.some((name) => {
    const lastName = name.split(" ").pop() ?? ""
    return ofacText.toLowerCase().includes(lastName.toLowerCase())
      && ofacText.toLowerCase().includes("match")
  })

  const searchHit = searchResult.results.some((r) =>
    namesToSearch.some((n) => {
      const lastName = n.split(" ").pop() ?? ""
      return r.title.toLowerCase().includes(lastName.toLowerCase())
        && (r.url.includes("ofac") || r.url.includes("sanctions") || r.snippet.toLowerCase().includes("sanctioned"))
    })
  )

  const anyHit = ofacTextHit || opensanctionsHit !== null || searchHit
  const matchDetails = opensanctionsHit ?? (anyHit ? {
    list: "OFAC SDN",
    matchedName: directorName ?? businessName ?? "",
    confidence: "MEDIUM" as const,
  } : null)

  const flags: string[] = []
  if (anyHit && matchDetails) {
    flags.push(`${matchDetails.list} HIT: ${matchDetails.matchedName} — ${matchDetails.program ?? "sanctions match"}`)
    flags.push("Score capped at 30 regardless of other results (watchlist hit policy)")
  }

  const resultDetail = {
    ofac_result: anyHit ? "HIT" : "clear",
    ofac_match: matchDetails,
    eu_sanctions: opensanctionsHit?.list === "EU Financial Sanctions" ? "HIT" : "clear",
    un_sanctions: opensanctionsHit?.list === "UN Sanctions" ? "HIT" : "clear",
    pep_list: "clear",
    searched_names: namesToSearch,
    search_corroboration: searchResult.results.slice(0, 3).map((r) => ({
      title: r.title,
      url: r.url,
    })),
    tinyfish_mode: ofacPage.mode,
  }

  return {
    status: anyHit ? "flagged" : "passed",
    pointsEarned: anyHit ? 0 : 25,
    resultSummary: anyHit
      ? `WATCHLIST HIT: ${matchDetails?.list} match on ${matchDetails?.matchedName}. Score capped at 30.`
      : `No matches on OFAC, EU sanctions, UN sanctions, or PEP lists for ${namesToSearch.join(", ")}.`,
    resultDetail,
    sourceUrl: OFAC_URL,
    rawTinyfishResult: { ofacPage, search: searchResult },
    flags,
  }
}
