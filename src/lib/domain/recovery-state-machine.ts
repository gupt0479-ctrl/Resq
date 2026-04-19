// Pure domain logic — no DB calls, no side effects.

export const RECOVERY_STATUS = [
  "none",
  "queued",
  "reminder_sent",
  "payment_plan_offered",
  "settlement_offered",
  "escalated",
  "disputed",
  "resolved",
  "written_off",
] as const

export type RecoveryStatus = (typeof RECOVERY_STATUS)[number]

export const RECOVERY_ACTION_TYPE = [
  "send_reminder",
  "offer_payment_plan",
  "offer_settlement",
  "escalate",
  "dispute_clarification",
  "financing_flagged",
  "write_off",
  "resolve",
  "skip",
  "drop_back",
] as const

export type RecoveryActionType = (typeof RECOVERY_ACTION_TYPE)[number]

export type CreditTier = "excellent" | "good" | "fair" | "poor" | "new_client"

// ─── Valid state transitions ───────────────────────────────────────────────

const TRANSITIONS: Record<RecoveryStatus, RecoveryStatus[]> = {
  none:                 ["queued"],
  queued:               ["reminder_sent", "payment_plan_offered", "settlement_offered", "escalated", "written_off"],
  reminder_sent:        ["reminder_sent", "payment_plan_offered", "settlement_offered", "escalated", "disputed", "resolved", "written_off"],
  payment_plan_offered: ["settlement_offered", "escalated", "disputed", "resolved", "written_off", "reminder_sent"],  // Can drop back to reminder
  settlement_offered:   ["escalated", "disputed", "resolved", "written_off", "payment_plan_offered"],  // Can drop back to payment plan
  escalated:            ["disputed", "resolved", "written_off", "settlement_offered"],  // Can drop back to settlement
  disputed:             ["resolved", "written_off", "reminder_sent"],  // Can restart after dispute resolution
  resolved:             [],
  written_off:          [],
}

export function canTransition(from: RecoveryStatus, to: RecoveryStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}

export function assertTransition(from: RecoveryStatus, to: RecoveryStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid recovery transition: ${from} → ${to}. ` +
        `Allowed: [${(TRANSITIONS[from] ?? []).join(", ")}]`
    )
  }
}

// ─── FICO-style credit scoring ─────────────────────────────────────────────

export interface CreditScoreContext {
  onTimePct:              number | null  // 0–100, null = no history
  relationshipMonths:     number
  totalOverdueAmount:     number
  totalOutstandingAmount: number         // all open invoices amount
  avgDaysLate:            number | null
  totalPaidAmount:        number
  writtenOffCount:        number
  stripePaymentFailed:    boolean
}

export interface ClientCreditScore {
  score:   number      // 300–850
  tier:    CreditTier
  factors: {
    paymentHistory:    number
    relationshipLength: number
    utilizationRisk:   number
    recentBehavior:    number
    volume:            number
    deductions:        number
  }
  rationale: string
}

// 850 − 300 = 550 distributable points
const RANGE = 550

export function computeClientCreditScore(ctx: CreditScoreContext): ClientCreditScore {
  if (ctx.relationshipMonths < 3) {
    return {
      score: 650,
      tier: "new_client",
      factors: { paymentHistory: 0, relationshipLength: 0, utilizationRisk: 0, recentBehavior: 0, volume: 0, deductions: 0 },
      rationale: "Insufficient payment history (< 3 months). Default score 650 assigned.",
    }
  }

  // Payment history — 35%
  const phMax = Math.round(RANGE * 0.35)
  const phPts = ctx.onTimePct === null
    ? Math.round(phMax * 0.6)
    : Math.round((ctx.onTimePct / 100) * phMax)

  // Relationship length — 20%, capped at 60 months
  const rlMax = Math.round(RANGE * 0.20)
  const rlPts = Math.round(Math.min(ctx.relationshipMonths, 60) / 60 * rlMax)

  // Utilization risk — 15%, penalty-based (lower overdue rate = more points)
  const urMax = Math.round(RANGE * 0.15)
  let urPts = urMax
  if (ctx.totalOutstandingAmount > 0) {
    const overdueRate = Math.min(ctx.totalOverdueAmount / ctx.totalOutstandingAmount, 1)
    urPts = Math.round((1 - overdueRate) * urMax)
  } else if (ctx.totalOverdueAmount > 0) {
    urPts = 0
  }

  // Recent behavior — 20%, avg days late normalized to 90 days
  const rbMax = Math.round(RANGE * 0.20)
  let rbPts = rbMax
  if (ctx.avgDaysLate !== null) {
    rbPts = Math.round((1 - Math.min(ctx.avgDaysLate, 90) / 90) * rbMax)
  }

  // Volume — 10%, normalized to $50k
  const volMax = Math.round(RANGE * 0.10)
  const volPts = Math.round(Math.min(ctx.totalPaidAmount, 50_000) / 50_000 * volMax)

  // Deductions
  const deductPts = ctx.writtenOffCount * 25 + (ctx.stripePaymentFailed ? 15 : 0)

  const raw = 300 + phPts + rlPts + urPts + rbPts + volPts - deductPts
  const score = Math.max(300, Math.min(850, Math.round(raw)))

  const tier: CreditTier =
    score >= 750 ? "excellent" :
    score >= 670 ? "good" :
    score >= 580 ? "fair" : "poor"

  const parts: string[] = [`Score ${score} (${tier}).`]
  parts.push(`Payment history: ${phPts}/${phMax}pts.`)
  parts.push(`Relationship: ${rlPts}/${rlMax}pts (${ctx.relationshipMonths}mo).`)
  if (ctx.writtenOffCount > 0) parts.push(`Write-offs: −${ctx.writtenOffCount * 25}pts.`)
  if (ctx.stripePaymentFailed) parts.push("Stripe failure: −15pts.")

  return {
    score,
    tier,
    factors: {
      paymentHistory:     phPts,
      relationshipLength: rlPts,
      utilizationRisk:    urPts,
      recentBehavior:     rbPts,
      volume:             volPts,
      deductions:         -deductPts,
    },
    rationale: parts.join(" "),
  }
}

// ─── Risk scoring (deterministic 0–100) ───────────────────────────────────

export interface RiskContext {
  daysOverdue:       number
  balance:           number
  reminderCount:     number
  onTimePct:         number | null
  avgDaysLate:       number | null
  priorOverdueCount: number
  riskStatus:        string | null
  lifetimeValue:     number
}

export function scoreRisk(ctx: RiskContext & { creditTier?: CreditTier }): number {
  let score = 0

  // Days overdue — 30 pts max (2 pts/day, capped at 15 days)
  score += Math.min(30, ctx.daysOverdue * 2)

  // On-time payment history — 25 pts max
  if (ctx.onTimePct === null) {
    score += 10
  } else {
    score += Math.round(((100 - ctx.onTimePct) / 100) * 25)
  }

  // Reminder fatigue — 15 pts max (5 pts each, capped at 3)
  score += Math.min(15, ctx.reminderCount * 5)

  // Avg days late — 15 pts max
  if (ctx.avgDaysLate !== null) {
    score += Math.min(15, Math.round(ctx.avgDaysLate * 0.5))
  }

  // Prior overdue count — 10 pts max (3 pts each)
  score += Math.min(10, ctx.priorOverdueCount * 3)

  // CRM risk status — 10 pts
  if (ctx.riskStatus === "churned") score += 10
  else if (ctx.riskStatus === "at_risk") score += 6

  // High balance relative to LTV — 5 pts max
  if (ctx.lifetimeValue > 0) {
    const exposure = ctx.balance / ctx.lifetimeValue
    if (exposure >= 0.5) score += 5
    else if (exposure >= 0.25) score += 2
  }

  // Credit tier modulation: poor = +15, fair = +8
  if (ctx.creditTier === "poor") score += 15
  else if (ctx.creditTier === "fair") score += 8

  return Math.min(100, Math.round(score))
}

// ─── Channel selection ─────────────────────────────────────────────────────

export function selectChannel(
  ctx: { hasStripeCustomer: boolean },
  _urgency: string // eslint-disable-line @typescript-eslint/no-unused-vars
): "stripe" | "email" {
  return ctx.hasStripeCustomer ? "stripe" : "email"
}

// ─── Full recovery context ─────────────────────────────────────────────────

export interface RecoveryContext extends RiskContext {
  currentStatus:       RecoveryStatus
  // Payment profile additions
  relationshipMonths:  number
  totalPaidAmount:     number
  totalOverdueAmount:  number
  totalOutstandingAmount: number
  writtenOffCount:     number
  // Stripe context
  hasStripeCustomer:   boolean
  stripePaymentFailed: boolean
  // Partial payment signal
  partialPaymentReceived?: boolean
  partialPaymentAmount?: number
}

export interface RecoveryDecision {
  action:              RecoveryActionType
  nextRecoveryStatus:  RecoveryStatus
  riskScore:           number
  creditScore:         ClientCreditScore
  urgency:             "low" | "medium" | "high" | "critical"
  suggestedChannel:    "stripe" | "email"
  escalateToFinancing: boolean
  reason:              string
  settlementDiscount?: number  // Percentage discount for settlement offers
}

export function decideNextAction(ctx: RecoveryContext): RecoveryDecision {
  const creditScore = computeClientCreditScore({
    onTimePct:              ctx.onTimePct,
    relationshipMonths:     ctx.relationshipMonths,
    totalOverdueAmount:     ctx.totalOverdueAmount,
    totalOutstandingAmount: ctx.totalOutstandingAmount,
    avgDaysLate:            ctx.avgDaysLate,
    totalPaidAmount:        ctx.totalPaidAmount,
    writtenOffCount:        ctx.writtenOffCount,
    stripePaymentFailed:    ctx.stripePaymentFailed,
  })

  const riskScore = scoreRisk({
    ...ctx,
    creditTier: creditScore.tier === "new_client" ? undefined : creditScore.tier,
  })

  const suggestedChannel = selectChannel({ hasStripeCustomer: ctx.hasStripeCustomer }, "")

  const base = { riskScore, creditScore, suggestedChannel }

  // Handle partial payment drop-back
  if (ctx.partialPaymentReceived && ctx.partialPaymentAmount && ctx.partialPaymentAmount > 0) {
    // Customer is engaging - drop back one rung
    const dropBackStatus: RecoveryStatus = 
      ctx.currentStatus === "escalated" ? "settlement_offered" :
      ctx.currentStatus === "settlement_offered" ? "payment_plan_offered" :
      ctx.currentStatus === "payment_plan_offered" ? "reminder_sent" :
      ctx.currentStatus
    
    return {
      ...base,
      action:              "drop_back",
      nextRecoveryStatus:  dropBackStatus,
      urgency:             "low",
      reason:              `Partial payment of ${ctx.partialPaymentAmount.toFixed(0)} received. Customer is engaging - dropping back to ${dropBackStatus} for gentler approach.`,
      escalateToFinancing: false,
    }
  }

  if (ctx.currentStatus === "resolved" || ctx.currentStatus === "written_off") {
    return {
      ...base,
      action:              "skip",
      nextRecoveryStatus:  ctx.currentStatus,
      urgency:             "low",
      reason:              "Invoice is already in a terminal recovery state.",
      escalateToFinancing: false,
    }
  }

  if (riskScore >= 80 || (ctx.daysOverdue >= 90 && ctx.reminderCount >= 3)) {
    return {
      ...base,
      action:              "write_off",
      nextRecoveryStatus:  "written_off",
      urgency:             "critical",
      reason:              `Risk ${riskScore}/100, credit ${creditScore.tier}. ${ctx.daysOverdue}d overdue, ${ctx.reminderCount} reminders — collection unlikely.`,
      escalateToFinancing: false,
    }
  }

  if (riskScore >= 70 || (ctx.daysOverdue >= 75 && ctx.reminderCount >= 2)) {
    return {
      ...base,
      action:              "escalate",
      nextRecoveryStatus:  "escalated",
      urgency:             "critical",
      reason:              `Risk ${riskScore}/100, credit ${creditScore.tier}. Formal escalation after ${ctx.reminderCount} reminder(s), ${ctx.daysOverdue}d overdue.`,
      escalateToFinancing: riskScore >= 75,
    }
  }

  // Settlement offer rung (new)
  if (
    riskScore >= 55 ||
    ctx.currentStatus === "payment_plan_offered" ||
    (ctx.daysOverdue >= 60 && ctx.reminderCount >= 2)
  ) {
    // Calculate settlement discount (5-15% based on risk)
    const discountPct = Math.min(15, Math.max(5, Math.floor((riskScore - 40) / 4)))
    
    return {
      ...base,
      action:              "offer_settlement",
      nextRecoveryStatus:  "settlement_offered",
      urgency:             "high",
      reason:              `Risk ${riskScore}/100, credit ${creditScore.tier}. Offering ${discountPct}% settlement discount to close ${ctx.daysOverdue}d overdue invoice.`,
      escalateToFinancing: riskScore >= 60,
      settlementDiscount:  discountPct,
    }
  }

  if (
    riskScore >= 45 ||
    ctx.currentStatus === "reminder_sent" ||
    (ctx.daysOverdue >= 30 && ctx.reminderCount >= 1)
  ) {
    return {
      ...base,
      action:              "offer_payment_plan",
      nextRecoveryStatus:  "payment_plan_offered",
      urgency:             "medium",
      reason:              `Risk ${riskScore}/100, credit ${creditScore.tier}. Offering payment plan, ${ctx.daysOverdue}d overdue.`,
      escalateToFinancing: riskScore >= 55,
    }
  }

  return {
    ...base,
    action:              "send_reminder",
    nextRecoveryStatus:  "reminder_sent",
    urgency:             riskScore >= 30 ? "medium" : "low",
    reason:              `Risk ${riskScore}/100, credit ${creditScore.tier}. Sending reminder for ${ctx.daysOverdue}d overdue invoice.`,
    escalateToFinancing: false,
  }
}
