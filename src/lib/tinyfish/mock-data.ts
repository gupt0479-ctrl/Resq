import type {
  TinyFishAgentRunResult,
  TinyFishFetchResult,
  TinyFishScenario,
  TinyFishSearchResult,
} from "./schemas"

// Deterministic timestamp so demo replays stay stable.
const DEMO_FIXED_ISO = "2026-04-11T18:00:00.000Z"

// ─── Financing scout ───────────────────────────────────────────────────────

export const FINANCING_OFFERS = [
  {
    lender:          "BlueHarbor Capital",
    product:         "Working Capital Advance",
    aprPercent:      11.9,
    termMonths:      12,
    maxAmountUsd:    75_000,
    decisionSpeed:   "48 hours",
    notes:           "Soft credit pull. Daily ACH repayment.",
  },
  {
    lender:          "Kabbage-Lite Line",
    product:         "Revolving line of credit",
    aprPercent:      14.4,
    termMonths:      6,
    maxAmountUsd:    40_000,
    decisionSpeed:   "24 hours",
    notes:           "Draw as needed, interest-only on drawn balance.",
  },
  {
    lender:          "Backer SMB Loans",
    product:         "SBA 7(a) Micro",
    aprPercent:      9.25,
    termMonths:      60,
    maxAmountUsd:    150_000,
    decisionSpeed:   "14 days",
    notes:           "Requires 2 years tax returns. Lowest APR of the three.",
  },
] as const

// ─── Vendor / supply cost comparison ───────────────────────────────────────

export const VENDOR_DELTAS = [
  {
    category:           "produce",
    sku:                "heirloom-tomatoes-case-20lb",
    currentVendor:      "Riverbank Produce",
    currentUnitUsd:     72.50,
    alternativeVendor:  "Harvest Direct",
    alternativeUnitUsd: 58.90,
    monthlyVolumeUnits: 22,
    estMonthlySavings:  (72.50 - 58.90) * 22,
    spikeVsLastMonth:   0.184,
  },
  {
    category:           "beverage",
    sku:                "sparkling-water-24pk",
    currentVendor:      "Aurora Beverage Co.",
    currentUnitUsd:     19.80,
    alternativeVendor:  "Coastline Drinks",
    alternativeUnitUsd: 17.25,
    monthlyVolumeUnits: 48,
    estMonthlySavings:  (19.80 - 17.25) * 48,
    spikeVsLastMonth:   0.061,
  },
] as const

// ─── Insurance renewal scan ────────────────────────────────────────────────

export const INSURANCE_RENEWAL = {
  policy:                   "General Liability + BOP",
  carrier:                  "Meridian Mutual",
  currentAnnualPremiumUsd:  8_400,
  renewalAnnualPremiumUsd:  9_780,
  deltaPercent:             0.164,
  renewalDate:              "2026-06-01",
  recommendedAction:
    "Shop policy against 2 comparable carriers before May 15. Mid-market brokers quote 6–10% lower for similar limits.",
  comparableCarriers: [
    { carrier: "Hartford Alliance", estAnnualPremiumUsd: 8_600 },
    { carrier: "BrightPath SMB",    estAnnualPremiumUsd: 8_120 },
  ],
} as const

// ─── Scenario helpers ──────────────────────────────────────────────────────

function roundCents(n: number): number {
  return Math.round(n * 100) / 100
}

function steps(labels: Array<[string, string, number]>) {
  return labels.map(([label, observation, durationMs], index) => ({
    index,
    label,
    observation,
    durationMs,
  }))
}

export function mockAgentRun(
  scenario: TinyFishScenario,
  task: string
): TinyFishAgentRunResult {
  if (scenario === "financing") {
    return {
      task,
      scenario,
      mode: "mock",
      steps: steps([
        ["discover_lenders", "Searched 12 SMB lenders for working-capital offers.", 1200],
        ["score_offers",     "Ranked 3 viable offers by APR, speed, and term.", 800],
        ["summarize",        "Best APR is SBA 7(a) at 9.25% but slowest decision.", 400],
      ]),
      summary:
        "Three financing options surfaced. Recommend BlueHarbor (48h) for bridging, SBA 7(a) for long-term.",
      outputs: {
        offers: FINANCING_OFFERS.map((o) => ({ ...o, estMonthlySavings: undefined })),
      },
    }
  }

  if (scenario === "vendor") {
    const savings = roundCents(
      VENDOR_DELTAS.reduce((acc, d) => acc + d.estMonthlySavings, 0)
    )
    return {
      task,
      scenario,
      mode: "mock",
      steps: steps([
        ["pull_recent_invoices", "Loaded last 30 days of supplier invoices.", 900],
        ["compare_market_rates", "Queried market rates for top 2 SKU categories.", 1400],
        ["flag_spikes",          "Detected 18.4% spike on heirloom tomato case.", 500],
      ]),
      summary: `Two cheaper vendors found. Estimated monthly savings $${savings}.`,
      outputs: {
        deltas:               VENDOR_DELTAS,
        estMonthlySavingsUsd: savings,
      },
    }
  }

  if (scenario === "insurance") {
    return {
      task,
      scenario,
      mode: "mock",
      steps: steps([
        ["pull_current_policy", "Located current BOP + GL policy with Meridian Mutual.", 700],
        ["shop_comparables",    "Retrieved 2 comparable carrier quotes.", 1600],
        ["recommend_action",    "Renewal is +16.4%. BrightPath quote is 17% lower.", 500],
      ]),
      summary:
        "Insurance renewal premium rises 16.4%. BrightPath SMB quoted lower; shop before May 15.",
      outputs: { insurance: INSURANCE_RENEWAL },
    }
  }

  // full_survival_scan
  const financing = mockAgentRun("financing", task)
  const vendor    = mockAgentRun("vendor",    task)
  const insurance = mockAgentRun("insurance", task)
  return {
    task,
    scenario: "full_survival_scan",
    mode: "mock",
    steps: [
      ...financing.steps.map((s, i) => ({ ...s, index: i })),
      ...vendor.steps.map((s, i)    => ({ ...s, index: financing.steps.length + i })),
      ...insurance.steps.map((s, i) => ({
        ...s,
        index: financing.steps.length + vendor.steps.length + i,
      })),
    ],
    summary:
      "Survival scan complete: 3 financing offers, 2 vendor savings plays, 1 insurance renewal warning.",
    outputs: {
      financing: financing.outputs,
      vendor:    vendor.outputs,
      insurance: insurance.outputs,
    },
  }
}

export function mockCollectionsSearch(customerName: string, query: string): TinyFishSearchResult {
  const isMarketQuery = /market|industry|sector|conditions/i.test(query)
  const isNewsQuery   = /news|bankruptcy|insolvency|financial|difficulties/i.test(query)

  if (isMarketQuery) {
    return {
      query,
      mode: "mock",
      results: [
        {
          title:   "Service sector payment delays rising in Q1 2026",
          url:     "https://example.com/service-sector-2026",
          snippet: "Small and mid-size service businesses are reporting longer payment cycles, with average DSO up 8 days year-over-year amid tightening credit conditions.",
          score:   0.88,
        },
        {
          title:   "SMB cashflow pressure index reaches 18-month high",
          url:     "https://example.com/smb-cashflow-index",
          snippet: "Receivables aging is accelerating across hospitality, retail, and professional services as customers extend payment windows.",
          score:   0.74,
        },
        {
          title:   "Industry receivables benchmarks: Q1 2026 report",
          url:     "https://example.com/receivables-benchmarks-q1",
          snippet: "Median days-sales-outstanding climbed to 42 days in Q1 2026, up from 38 days in Q4 2025, driven by broader economic caution.",
          score:   0.67,
        },
      ],
    }
  }

  if (isNewsQuery) {
    return {
      query,
      mode: "mock",
      results: [
        {
          title:   `No insolvency or bankruptcy filings found for ${customerName}`,
          url:     "https://example.com/public-records-search",
          snippet: `Public records search returned no active bankruptcy petitions, court judgments, or insolvency notices linked to ${customerName} as of April 2026.`,
          score:   0.91,
        },
        {
          title:   `${customerName}: no major negative press coverage detected`,
          url:     "https://example.com/news-monitor",
          snippet: "No news articles referencing business closure, fraud, or financial distress were found in recent web index for this entity.",
          score:   0.79,
        },
        {
          title:   "How to interpret absence of negative signals in B2B collections",
          url:     "https://example.com/collections-guide",
          snippet: "When no derogatory public records are found, focus shifts to internal payment behavior and direct outreach strategy.",
          score:   0.62,
        },
      ],
    }
  }

  // Generic collections fallback
  return {
    query,
    mode: "mock",
    results: [
      {
        title:   `${customerName} — public profile overview`,
        url:     "https://example.com/business-profiles",
        snippet: "Business appears active with no significant public derogatory records in recent searches.",
        score:   0.84,
      },
      {
        title:   "Collections risk assessment: external data sources guide",
        url:     "https://example.com/collections-external-data",
        snippet: "Combining internal payment history with external news and filing searches improves recovery rate predictions by 22%.",
        score:   0.71,
      },
    ],
  }
}

export function mockSearch(query: string): TinyFishSearchResult {
  return {
    query,
    mode: "mock",
    results: [
      {
        title:   "SMB working-capital options for independent restaurants",
        url:     "https://example.com/working-capital-guide",
        snippet: "Compare term loans, lines of credit, and SBA 7(a) programs.",
        score:   0.91,
      },
      {
        title:   "How to benchmark supplier pricing for produce SKUs",
        url:     "https://example.com/supplier-benchmarks",
        snippet: "Use 30/60/90-day moving averages against market indices.",
        score:   0.77,
      },
      {
        title:   "BOP insurance renewal negotiation playbook",
        url:     "https://example.com/bop-renewal",
        snippet: "Get quotes 45 days before renewal; carriers discount to win.",
        score:   0.72,
      },
    ],
  }
}

export function mockWatchlistSearch(name: string, query: string): TinyFishSearchResult {
  return {
    query,
    mode: "mock",
    results: [
      {
        title:   `Sanctions search — no records found for "${name}"`,
        url:     "https://example.com/sanctions-search",
        snippet: `Automated watchlist search returned no matching records for "${name}" across OFAC SDN, Interpol, EU consolidated sanctions, UN Security Council, World Bank debarred entities, and U.S. BIS entity list as of April 2026.`,
        score:   0.97,
      },
      {
        title:   "How to interpret a clean sanctions screening result",
        url:     "https://example.com/sanctions-guide",
        snippet: "A clean result means no exact or close matches were found in the screened databases. Ongoing monitoring is still recommended for high-value counterparties.",
        score:   0.72,
      },
    ],
  }
}

export function mockFetch(url: string): TinyFishFetchResult {
  return {
    url,
    mode:      "mock",
    status:    200,
    title:     "Example SMB resource",
    text:      `Deterministic mock body for ${url}. Live TinyFish fetch is disabled in demo mode.`,
    fetchedAt: DEMO_FIXED_ISO,
  }
}
