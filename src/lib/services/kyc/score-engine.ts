import "server-only"
import type { KycBand, KycCheckType, KycScoreBreakdown, KycCheck } from "@/lib/types/kyc"
import { KYC_CHECK_POINTS, KYC_MAX_RAW_POINTS } from "@/lib/types/kyc"

export interface ScoreResult {
  rawScore: number
  normalizedScore: number
  finalScore: number
  band: KycBand
  scoreBreakdown: KycScoreBreakdown
  capsApplied: string[]
  watchlistFlagged: boolean
  livenessFlagged: boolean
  adverseMediaFlagged: boolean
}

export function calculateScore(checks: KycCheck[]): ScoreResult {
  const breakdown: KycScoreBreakdown = {}
  const capsApplied: string[] = []
  let rawEarned = 0
  let watchlistFlagged = false
  let livenessFlagged = false
  let adverseMediaFlagged = false

  for (const check of checks) {
    const possible = KYC_CHECK_POINTS[check.checkType as KycCheckType] ?? 0
    const earned = check.pointsEarned ?? 0

    breakdown[check.checkType as KycCheckType] = {
      points_earned: earned,
      points_possible: possible,
      status: check.status as "passed" | "failed" | "flagged" | "pending" | "running" | "skipped",
    }

    rawEarned += earned

    if (check.checkType === "watchlist_screening" && check.status === "flagged") {
      watchlistFlagged = true
    }
    if (check.checkType === "adverse_media" && check.status === "flagged") {
      adverseMediaFlagged = true
    }
    // Liveness is a sub-step of owner_kyc — flag if score < 80% in detail
    if (check.checkType === "owner_kyc") {
      const detail = check.resultDetail as { liveness_score?: number } | null
      if (detail?.liveness_score !== undefined && detail.liveness_score < 0.8) {
        livenessFlagged = true
      }
    }
  }

  const rawScore = rawEarned
  let normalizedScore = Math.round((rawEarned / KYC_MAX_RAW_POINTS) * 100)

  let finalScore = normalizedScore

  // Apply caps in priority order
  if (watchlistFlagged) {
    if (finalScore > 30) {
      finalScore = 30
      capsApplied.push("watchlist_hit_cap_30")
    }
  }
  if (livenessFlagged) {
    if (finalScore > 50) {
      finalScore = 50
      capsApplied.push("liveness_fail_cap_50")
    }
  }
  if (adverseMediaFlagged) {
    finalScore = Math.max(0, finalScore - 10)
    capsApplied.push("adverse_media_deduction_10")
  }

  finalScore = Math.max(0, Math.min(100, finalScore))

  if (capsApplied.length > 0) {
    breakdown.caps_applied = capsApplied
  }

  const band = scoreToBand(finalScore, watchlistFlagged)

  return {
    rawScore,
    normalizedScore,
    finalScore,
    band,
    scoreBreakdown: breakdown,
    capsApplied,
    watchlistFlagged,
    livenessFlagged,
    adverseMediaFlagged,
  }
}

function scoreToBand(score: number, watchlistFlagged: boolean): KycBand {
  if (watchlistFlagged) return "flagged"
  if (score >= 85) return "verified"
  if (score >= 60) return "review"
  if (score >= 30) return "flagged"
  return "failed"
}

export function bandToKycStatus(band: KycBand): string {
  switch (band) {
    case "verified": return "completed_verified"
    case "review":   return "completed_review"
    case "flagged":  return "completed_flagged"
    case "failed":   return "completed_failed"
  }
}

export function shouldCreateAlert(band: KycBand): boolean {
  return band === "flagged" || band === "failed"
}

export function alertSeverity(watchlistFlagged: boolean): "high" | "critical" {
  return watchlistFlagged ? "critical" : "high"
}

export function alertType(watchlistFlagged: boolean, band: KycBand) {
  if (watchlistFlagged) return "watchlist_hit" as const
  if (band === "failed") return "kyc_failed" as const
  return "kyc_flagged" as const
}
