import "server-only"
import { fetchUrl, search } from "@/lib/tinyfish/client"
import type { KycVerificationRequest, KycCheckRunResult } from "@/lib/types/kyc"

// Virtual office patterns: high-numbered suites in commercial mail centers
const VIRTUAL_OFFICE_PATTERNS = [
  /suite\s*#?\s*(1000|2000|3000|4000|5000)/i,
  /\bpmb\s*\d+/i,
  /\bpo\s*box/i,
  /\bunit\s*#?\s*(1000|2000|3000)\b/i,
]

function isVirtualOfficePattern(address: string): boolean {
  return VIRTUAL_OFFICE_PATTERNS.some((re) => re.test(address))
}

export async function runOfficeAddressCheck(
  request: KycVerificationRequest
): Promise<KycCheckRunResult> {
  const { businessAddress } = request

  if (!businessAddress) {
    return {
      status: "failed",
      pointsEarned: 0,
      resultSummary: "No business address provided.",
      resultDetail: { error: "address_missing" },
      flags: ["No business address submitted"],
    }
  }

  const encodedAddress = encodeURIComponent(businessAddress)
  const mapsUrl = `https://maps.google.com/?q=${encodedAddress}`

  const virtualOfficeFlag = isVirtualOfficePattern(businessAddress)

  // TinyFish: visit Google Maps for this address
  const mapsResult = await fetchUrl(mapsUrl, { selector: ".section-result, .place-desc" })

  // Also do a search to cross-reference
  const searchResult = await search(`"${businessAddress}" commercial office location`)
  const topHit = searchResult.results[0]

  const mapsText = mapsResult.text ?? ""
  const isResidential = mapsText.toLowerCase().includes("residential")
    || mapsText.toLowerCase().includes("apartment")
    || mapsText.toLowerCase().includes("house")
  const isEmptyLot = mapsText.toLowerCase().includes("vacant lot")
    || mapsText.toLowerCase().includes("empty lot")

  const flags: string[] = []
  if (virtualOfficeFlag) {
    flags.push(`Suite pattern suggests virtual/mail-forwarding office (${businessAddress})`)
  }
  if (isResidential) {
    flags.push("Address appears to be a residential location, not commercial")
  }
  if (isEmptyLot) {
    flags.push("Address may be a vacant or empty lot")
  }

  const resultDetail = {
    address: businessAddress,
    geocoded: true,
    location_type: isResidential ? "residential" : "commercial",
    virtual_office_flag: virtualOfficeFlag,
    maps_result: mapsText.slice(0, 400),
    search_snippet: topHit?.snippet ?? null,
    tinyfish_mode: mapsResult.mode,
  }

  const pointsEarned = flags.length === 0 ? 10 : flags.length === 1 ? 7 : 4
  const status = flags.length > 0 ? "flagged" : "passed"

  return {
    status,
    pointsEarned,
    resultSummary: `Address ${businessAddress} verified via Google Maps${virtualOfficeFlag ? " — virtual office pattern detected" : ""}.`,
    resultDetail,
    sourceUrl: mapsUrl,
    rawTinyfishResult: { maps: mapsResult, search: searchResult },
    flags,
  }
}
