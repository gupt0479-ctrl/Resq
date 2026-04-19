import "server-only"
import { fetchUrl, search } from "@/lib/tinyfish/client"
import type { KycVerificationRequest, KycCheckRunResult } from "@/lib/types/kyc"

function extractCopyrightYear(text: string): number | null {
  const match = text.match(/©\s*(\d{4})|copyright\s+(\d{4})/i)
  if (!match) return null
  return parseInt(match[1] ?? match[2], 10)
}

function isParkedOrGeneric(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    lower.includes("domain for sale") ||
    lower.includes("this domain is parked") ||
    lower.includes("coming soon") ||
    lower.includes("under construction") ||
    lower.includes("godaddy") ||
    lower.includes("namecheap parked") ||
    (lower.includes("lorem ipsum") && text.length < 2000)
  )
}

function businessNameInSite(text: string, businessName: string): boolean {
  if (!businessName) return true
  const words = businessName.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  return words.some((w) => text.toLowerCase().includes(w))
}

async function whoisDomainAge(domain: string): Promise<number | null> {
  try {
    const url = `https://www.whoisxmlapi.com/whoisserver/WhoisService?domainName=${domain}&outputFormat=JSON&apiKey=at_free`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = await res.json() as { WhoisRecord?: { createdDate?: string } }
    const createdDate = data.WhoisRecord?.createdDate
    if (!createdDate) return null
    const months = (Date.now() - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
    return Math.round(months)
  } catch {
    return null
  }
}

export async function runWebsitePresenceCheck(
  request: KycVerificationRequest
): Promise<KycCheckRunResult> {
  const { websiteUrl, businessName } = request

  if (!websiteUrl) {
    return {
      status: "failed",
      pointsEarned: 0,
      resultSummary: "No website URL provided.",
      resultDetail: { error: "website_url_missing" },
      flags: ["No website URL submitted"],
    }
  }

  let domain: string
  try {
    domain = new URL(websiteUrl).hostname.replace("www.", "")
  } catch {
    return {
      status: "failed",
      pointsEarned: 0,
      resultSummary: "Invalid website URL format.",
      resultDetail: { error: "invalid_url", url: websiteUrl },
      flags: ["Submitted website URL is not a valid URL"],
    }
  }

  // TinyFish: visit the site and get its content
  const [siteResult, domainAgeMonths] = await Promise.all([
    fetchUrl(websiteUrl, { selector: "body, main, footer, .about, #about" }),
    whoisDomainAge(domain),
  ])

  const pageText = siteResult.text ?? ""
  const siteLoads = siteResult.status !== 404 && pageText.length > 200

  const parked = isParkedOrGeneric(pageText)
  const nameMatches = businessNameInSite(pageText, businessName ?? "")
  const hasAboutPage = /about|contact|team|mission|services/i.test(pageText)
  const copyrightYear = extractCopyrightYear(pageText)
  const domainNewlyRegistered = domainAgeMonths !== null && domainAgeMonths < 6

  const flags: string[] = []
  if (!siteLoads) {
    flags.push("Website does not load or returns an error")
  }
  if (parked) {
    flags.push("Website appears to be a parked domain or placeholder — no real business content")
  }
  if (!nameMatches && siteLoads && !parked) {
    flags.push(`Business name "${businessName}" not found on submitted website`)
  }
  if (domainNewlyRegistered) {
    flags.push(`Domain registered within last 6 months (${domainAgeMonths} months old) — newly created`)
  }

  const pointsEarned = flags.length === 0 ? 10 : flags.length === 1 ? 7 : flags.length === 2 ? 4 : 1
  const status = flags.length > 1 ? "flagged" : flags.length === 1 ? "passed" : "passed"

  const resultDetail = {
    site_loads: siteLoads,
    has_about_page: hasAboutPage,
    name_matches: nameMatches,
    copyright_year: copyrightYear,
    domain_age_months: domainAgeMonths,
    parked: parked,
    domain,
    tinyfish_mode: siteResult.mode,
  }

  return {
    status,
    pointsEarned,
    resultSummary: siteLoads
      ? `${domain} loads. Name match: ${nameMatches}. Domain age: ${domainAgeMonths ?? "unknown"} months.`
      : `${domain} did not load or returned an error.`,
    resultDetail,
    sourceUrl: websiteUrl,
    rawTinyfishResult: { site: siteResult },
    flags,
  }
}
