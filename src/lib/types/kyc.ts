export type KycStatus =
  | "not_started"
  | "pending"
  | "in_progress"
  | "completed_verified"
  | "completed_review"
  | "completed_flagged"
  | "completed_failed"

export type KycBand = "verified" | "review" | "flagged" | "failed"

export type KycCheckType =
  | "business_name"
  | "office_address"
  | "people_verification"
  | "watchlist_screening"
  | "bank_account"
  | "owner_kyc"
  | "adverse_media"
  | "website_presence"

export type KycCheckStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed"
  | "flagged"
  | "skipped"

export interface KycVerificationRequest {
  id: string
  organizationId: string
  customerId: string
  invoiceId: string | null
  token: string
  status: KycStatus
  currentStep: KycCheckType | null
  riskScore: number | null
  riskBand: KycBand | null
  scoreBreakdown: KycScoreBreakdown | null
  watchlistFlagged: boolean
  livenessFlagged: boolean
  adverseMediaFlagged: boolean
  businessName: string | null
  registeredState: string | null
  businessAddress: string | null
  websiteUrl: string | null
  directorName: string | null
  directorDob: string | null
  bankAccountLast4: string | null
  bankRoutingNumber: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  linkOpenedAt: string | null
  linkExpiresAt: string
}

export interface KycCheck {
  id: string
  requestId: string
  checkType: KycCheckType
  status: KycCheckStatus
  pointsPossible: number
  pointsEarned: number | null
  resultSummary: string | null
  resultDetail: Record<string, unknown> | null
  sourceUrl: string | null
  rawTinyfishResult: unknown | null
  claudeAnalysis: string | null
  flags: string[]
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

export interface KycAuditEvent {
  id: string
  requestId: string
  eventType: string
  eventData: Record<string, unknown> | null
  actor: "system" | "client" | "operator"
  createdAt: string
}

export interface KycOperatorAlert {
  id: string
  requestId: string
  organizationId: string
  customerId: string
  customerName: string
  alertType: "kyc_flagged" | "kyc_failed" | "watchlist_hit"
  severity: "high" | "critical"
  summary: string
  failedChecks: KycFailedCheckDetail[]
  watchlistMatches: Record<string, unknown> | null
  adverseMedia: KycAdverseMediaItem[] | null
  claudeAnalysis: string | null
  status: "open" | "escalated" | "approved" | "declined"
  resolvedBy: string | null
  resolvedAt: string | null
  resolutionNotes: string | null
  createdAt: string
  updatedAt: string
}

export interface KycFailedCheckDetail {
  checkType: KycCheckType
  reason: string
  detail: string
}

export interface KycAdverseMediaItem {
  headline: string
  source: string
  url: string
  date?: string
}

export interface KycScoreBreakdown {
  business_name?: KycCheckScore
  office_address?: KycCheckScore
  people_verification?: KycCheckScore
  watchlist_screening?: KycCheckScore
  bank_account?: KycCheckScore
  owner_kyc?: KycCheckScore
  adverse_media?: KycCheckScore
  website_presence?: KycCheckScore
  caps_applied?: string[]
}

export interface KycCheckScore {
  points_earned: number
  points_possible: number
  status: KycCheckStatus
}

export interface KycCheckRunResult {
  status: "passed" | "failed" | "flagged"
  pointsEarned: number
  resultSummary: string
  resultDetail: Record<string, unknown>
  sourceUrl?: string
  rawTinyfishResult?: unknown
  claudeAnalysis?: string
  flags: string[]
}

export interface KycRequestWithChecks extends KycVerificationRequest {
  checks: KycCheck[]
  auditTrail: KycAuditEvent[]
  alert: KycOperatorAlert | null
}

// Points per check — max raw total is 110, normalized to 100
export const KYC_CHECK_POINTS: Record<KycCheckType, number> = {
  business_name:       15,
  office_address:      10,
  people_verification: 15,
  watchlist_screening: 25,
  bank_account:        10,
  owner_kyc:           15,
  adverse_media:       10,
  website_presence:    10,
}

export const KYC_MAX_RAW_POINTS = 110

// Ordered sequence for sequential execution
export const KYC_CHECK_ORDER: KycCheckType[] = [
  "business_name",
  "office_address",
  "people_verification",
  "watchlist_screening",
  "bank_account",
  "owner_kyc",
  "adverse_media",
  "website_presence",
]
