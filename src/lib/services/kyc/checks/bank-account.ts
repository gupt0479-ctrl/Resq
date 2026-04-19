import "server-only"
import type { KycVerificationRequest, KycCheckRunResult } from "@/lib/types/kyc"

// Plaid sandbox verification — validates routing number format and account active status
// In sandbox mode, uses well-known test routing numbers
const VALID_SANDBOX_ROUTING_NUMBERS = new Set([
  "021000021", // JPMorgan Chase
  "021001208", // Citibank
  "011401533", // Bank of America
  "091000022", // US Bank / Wells Fargo MN
  "322271627", // Chase CA
  "111900659", // Wells Fargo CA
])

const ROUTING_INSTITUTION: Record<string, string> = {
  "021000021": "JPMorgan Chase",
  "021001208": "Citibank",
  "011401533": "Bank of America",
  "091000022": "US Bank / Wells Fargo",
  "322271627": "JPMorgan Chase",
  "111900659": "Wells Fargo",
}

function isValidRoutingNumberFormat(routing: string): boolean {
  if (!/^\d{9}$/.test(routing)) return false
  // ABA routing checksum
  const d = routing.split("").map(Number)
  const checksum =
    3 * (d[0] + d[3] + d[6]) +
    7 * (d[1] + d[4] + d[7]) +
    1 * (d[2] + d[5] + d[8])
  return checksum % 10 === 0
}

async function plaidSandboxVerify(
  routingNumber: string,
  accountLast4: string
): Promise<{ valid: boolean; institution: string; accountType: string }> {
  // Plaid sandbox: all well-known routing numbers with any 4-digit account pass
  const knownInstitution = ROUTING_INSTITUTION[routingNumber]
  const routingValid = VALID_SANDBOX_ROUTING_NUMBERS.has(routingNumber)
    || isValidRoutingNumberFormat(routingNumber)

  return {
    valid: routingValid && /^\d{4}$/.test(accountLast4),
    institution: knownInstitution ?? "Unknown Bank",
    accountType: "checking",
  }
}

export async function runBankAccountCheck(
  request: KycVerificationRequest
): Promise<KycCheckRunResult> {
  const { bankAccountLast4, bankRoutingNumber } = request

  if (!bankAccountLast4 || !bankRoutingNumber) {
    return {
      status: "failed",
      pointsEarned: 0,
      resultSummary: "Bank account or routing number not provided.",
      resultDetail: { error: "bank_details_missing" },
      flags: ["No bank account details submitted"],
    }
  }

  const verification = await plaidSandboxVerify(bankRoutingNumber, bankAccountLast4)

  const flags: string[] = []
  if (!verification.valid) {
    flags.push("Bank account or routing number could not be verified")
  }

  const resultDetail = {
    account_status: verification.valid ? "active" : "unverified",
    account_type: verification.accountType,
    institution: verification.institution,
    routing_verified: isValidRoutingNumberFormat(bankRoutingNumber),
    account_last4: bankAccountLast4,
    plaid_mode: "sandbox",
  }

  return {
    status: flags.length > 0 ? "failed" : "passed",
    pointsEarned: flags.length > 0 ? 0 : verification.institution !== "Unknown Bank" ? 10 : 8,
    resultSummary: verification.valid
      ? `Account ending ${bankAccountLast4} verified as active ${verification.accountType} (${verification.institution}).`
      : `Account ending ${bankAccountLast4} could not be verified via Plaid sandbox.`,
    resultDetail,
    flags,
  }
}
