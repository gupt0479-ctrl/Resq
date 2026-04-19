import "server-only"
import { createServerSupabaseClient } from "@/lib/db/supabase-server"
import { DEMO_ORG_ID } from "@/lib/db"
import { createHash } from "crypto"
import {
  getObligations,
  getReceivables,
  getRefundExposure,
  type CashObligation,
  type CashReceivable,
  type RefundExposureItem,
} from "@/lib/data/cash-forecast-config"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WeeklyBucket {
  weekNumber: number
  weekStart: string
  weekEnd: string
  openingBalance: number
  inflows: number
  inflowDetails: { description: string; amount: number; source: string }[]
  outflows: number
  outflowDetails: { description: string; amount: number; category: string }[]
  refundExposure: number
  closingBalance: number
  isBreakpoint: boolean
}

export interface ForecastResult {
  asOfDate: string
  scenario: "base" | "stress" | "upside"
  startingCash: number
  endingCash: number
  breakpointWeek: number | null
  runwayWeeks: number
  thresholdCash: number
  weeklyBuckets: WeeklyBucket[]
  topDrivers: DriverRanking[]
  actions: ActionItem[]
  summary: {
    actual90: { openingCash: number; totalCollected: number; totalSpent: number; refundsPaid: number; endingCash: number }
    forecast90: { startingCash: number; expectedInflows: number; expectedOutflows: number; refundExposure: number; projectedEndingCash: number; firstRiskWeek: number | null }
  }
  inputPayload: Record<string, unknown>
  payloadHash: string
}

export interface DriverRanking {
  id: string
  factor: string
  description: string
  impactWeeks: number
  impactAmount: number
  category: "receivable_slippage" | "obligation_spike" | "refund_exposure" | "baseline_variance"
}

export interface ActionItem {
  id: string
  category: "accelerate_collection" | "sequence_or_defer_payment" | "reduce_discretionary_spend" | "bridge_financing"
  description: string
  basis: string
  impactLow: number
  impactHigh: number
  speedDays: number
  riskLevel: "low" | "medium" | "high"
  confidence: number
  executable: boolean
  manualGuidance: string
}

// ── Scenario multipliers ──────────────────────────────────────────────────────

const SCENARIO_MULTIPLIERS: Record<string, number> = {
  base: 1.0,
  stress: 0.82,
  upside: 1.12,
}

// ── Core forecast engine ──────────────────────────────────────────────────────

export async function runForecast(opts: {
  organizationId?: string
  scenario?: "base" | "stress" | "upside"
  asOfDate?: string
  overrides?: {
    obligations?: CashObligation[]
    receivables?: CashReceivable[]
    refundExposure?: RefundExposureItem[]
  }
}): Promise<ForecastResult> {
  const orgId = opts.organizationId ?? DEMO_ORG_ID
  const scenario = opts.scenario ?? "base"
  const asOfDate = opts.asOfDate ?? new Date().toISOString().slice(0, 10)
  const multiplier = SCENARIO_MULTIPLIERS[scenario] ?? 1.0

  const supabase = createServerSupabaseClient()

  // 1. Starting cash: cleared net from finance_transactions up to asOfDate
  const { data: txns } = await supabase
    .from("finance_transactions")
    .select("amount, direction, type, category, occurred_at")
    .eq("organization_id", orgId)
    .lte("occurred_at", asOfDate + "T23:59:59Z")
    .order("occurred_at", { ascending: true })

  const allTxns = (txns ?? []) as { amount: string; direction: string; type: string; category: string; occurred_at: string }[]

  let startingCash = 0
  let totalCollected = 0
  let totalSpent = 0
  let refundsPaid = 0
  const ninetyDaysAgo = new Date(new Date(asOfDate).getTime() - 90 * 86400000).toISOString()

  // Opening cash 90 days ago
  let openingCash90 = 0
  for (const t of allTxns) {
    const amt = Number(t.amount)
    if (t.occurred_at < ninetyDaysAgo) {
      openingCash90 += t.direction === "in" ? amt : -amt
    }
  }

  for (const t of allTxns) {
    const amt = Number(t.amount)
    if (t.direction === "in") {
      startingCash += amt
      if (t.occurred_at >= ninetyDaysAgo) totalCollected += amt
    } else {
      startingCash -= amt
      if (t.occurred_at >= ninetyDaysAgo) {
        if (t.type === "refund") refundsPaid += amt
        else totalSpent += amt
      }
    }
  }

  // 2. Load obligations, receivables, refund exposure
  const obligations = opts.overrides?.obligations ?? getObligations()
  const receivables = opts.overrides?.receivables ?? getReceivables()
  const refundExp = opts.overrides?.refundExposure ?? getRefundExposure()

  // 3. Trailing 8-week category averages for baseline recurring outflows
  const eightWeeksAgo = new Date(new Date(asOfDate).getTime() - 56 * 86400000).toISOString()
  const recentOutflows = allTxns.filter(t => t.direction === "out" && t.occurred_at >= eightWeeksAgo)
  const categoryTotals: Record<string, number> = {}
  for (const t of recentOutflows) {
    categoryTotals[t.category] = (categoryTotals[t.category] ?? 0) + Number(t.amount)
  }
  const categoryWeeklyAvg: Record<string, number> = {}
  for (const [cat, total] of Object.entries(categoryTotals)) {
    categoryWeeklyAvg[cat] = Math.round(total / 8 * 100) / 100
  }

  // Categories covered by explicit obligations
  const explicitCategories = new Set(obligations.filter(o => o.status === "scheduled").map(o => o.category))

  // 4. Build 13 weekly buckets (Monday–Sunday)
  const weekStart = getNextMonday(asOfDate)
  const buckets: WeeklyBucket[] = []
  let runningBalance = startingCash

  // Trailing 4-week avg outflows for threshold
  const trailing4WeekOutflows = Object.values(categoryTotals).reduce((s, v) => s + v, 0) / 8 * 4 / 4
  const nextPayroll = obligations.find(o => o.category === "payroll" && o.status === "scheduled")
  const thresholdCash = Math.max(trailing4WeekOutflows, nextPayroll?.amount ?? 0)

  let breakpointWeek: number | null = null
  let totalForecastInflows = 0
  let totalForecastOutflows = 0
  const totalRefundExposure = refundExp.filter(r => r.status === "pending").reduce((s, r) => s + r.amount, 0)

  for (let w = 0; w < 13; w++) {
    const wStart = addDays(weekStart, w * 7)
    const wEnd = addDays(weekStart, w * 7 + 6)
    const opening = runningBalance

    // Inflows: receivables expected this week, multiplied by scenario
    const weekInflows: { description: string; amount: number; source: string }[] = []
    for (const r of receivables) {
      if (r.status !== "expected") continue
      if (r.expectedDate >= wStart && r.expectedDate <= wEnd) {
        const amt = Math.round(r.amount * r.confidence * multiplier * 100) / 100
        weekInflows.push({ description: r.description, amount: amt, source: "receivable" })
      }
    }
    const inflowTotal = weekInflows.reduce((s, i) => s + i.amount, 0)

    // Outflows: explicit obligations + baseline recurring
    const weekOutflows: { description: string; amount: number; category: string }[] = []
    for (const o of obligations) {
      if (o.status !== "scheduled") continue
      const dueDate = o.deferredTo ?? o.dueAt
      if (dueDate >= wStart && dueDate <= wEnd) {
        weekOutflows.push({ description: o.description, amount: o.amount, category: o.category })
      }
    }

    // Baseline recurring for categories NOT covered by explicit obligations this week
    const explicitCatsThisWeek = new Set(weekOutflows.map(o => o.category))
    for (const [cat, avg] of Object.entries(categoryWeeklyAvg)) {
      if (!explicitCatsThisWeek.has(cat) && !explicitCategories.has(cat as CashObligation["category"])) {
        if (avg > 100) {
          weekOutflows.push({ description: `Baseline ${cat} (trailing avg)`, amount: avg, category: cat })
        }
      }
    }

    // Refund exposure hitting this week
    let weekRefundExp = 0
    for (const r of refundExp) {
      if (r.status === "pending" && r.expectedPayDate >= wStart && r.expectedPayDate <= wEnd) {
        weekRefundExp += r.amount
        weekOutflows.push({ description: r.description, amount: r.amount, category: "refund_exposure" })
      }
    }

    const outflowTotal = weekOutflows.reduce((s, o) => s + o.amount, 0)
    const closing = Math.round((opening + inflowTotal - outflowTotal) * 100) / 100
    const isBreakpoint = closing < thresholdCash && breakpointWeek === null

    if (isBreakpoint) breakpointWeek = w + 1

    totalForecastInflows += inflowTotal
    totalForecastOutflows += outflowTotal

    buckets.push({
      weekNumber: w + 1,
      weekStart: wStart,
      weekEnd: wEnd,
      openingBalance: Math.round(opening * 100) / 100,
      inflows: Math.round(inflowTotal * 100) / 100,
      inflowDetails: weekInflows,
      outflows: Math.round(outflowTotal * 100) / 100,
      outflowDetails: weekOutflows,
      refundExposure: weekRefundExp,
      closingBalance: closing,
      isBreakpoint,
    })

    runningBalance = closing
  }

  const endingCash = runningBalance
  const runwayWeeks = breakpointWeek ? breakpointWeek - 1 : 13

  // 5. Driver ranking (counterfactual analysis)
  const topDrivers = await rankDrivers(orgId, scenario, asOfDate, obligations, receivables, refundExp, breakpointWeek, buckets)

  // 6. Action queue
  const actions = buildActions(breakpointWeek, buckets, receivables, obligations, refundExp, endingCash, thresholdCash)

  // 7. Build input payload and hash
  const inputPayload = {
    organizationId: orgId,
    scenario,
    asOfDate,
    obligationCount: obligations.length,
    receivableCount: receivables.length,
    refundExposureCount: refundExp.length,
    transactionCount: allTxns.length,
    startingCash,
  }
  const payloadHash = createHash("sha256").update(JSON.stringify(inputPayload)).digest("hex").slice(0, 16)

  const result: ForecastResult = {
    asOfDate,
    scenario,
    startingCash: Math.round(startingCash * 100) / 100,
    endingCash: Math.round(endingCash * 100) / 100,
    breakpointWeek,
    runwayWeeks,
    thresholdCash: Math.round(thresholdCash * 100) / 100,
    weeklyBuckets: buckets,
    topDrivers,
    actions,
    summary: {
      actual90: {
        openingCash: Math.round(openingCash90 * 100) / 100,
        totalCollected: Math.round(totalCollected * 100) / 100,
        totalSpent: Math.round(totalSpent * 100) / 100,
        refundsPaid: Math.round(refundsPaid * 100) / 100,
        endingCash: Math.round(startingCash * 100) / 100,
      },
      forecast90: {
        startingCash: Math.round(startingCash * 100) / 100,
        expectedInflows: Math.round(totalForecastInflows * 100) / 100,
        expectedOutflows: Math.round(totalForecastOutflows * 100) / 100,
        refundExposure: totalRefundExposure,
        projectedEndingCash: Math.round(endingCash * 100) / 100,
        firstRiskWeek: breakpointWeek,
      },
    },
    inputPayload,
    payloadHash,
  }

  return result
}


// ── Driver ranking ────────────────────────────────────────────────────────────

async function rankDrivers(
  _orgId: string,
  _scenario: string,
  _asOfDate: string,
  obligations: CashObligation[],
  receivables: CashReceivable[],
  refundExp: RefundExposureItem[],
  breakpointWeek: number | null,
  buckets: WeeklyBucket[],
): Promise<DriverRanking[]> {
  const drivers: DriverRanking[] = []
  const minBalance = Math.min(...buckets.map(b => b.closingBalance))

  // Receivable slippage — each slipped receivable
  for (const r of receivables) {
    if (r.collectionLagDays > 0 && r.status === "expected") {
      drivers.push({
        id: `driver-${r.id}`,
        factor: "receivable_slippage",
        description: `${r.description} slipped ${r.collectionLagDays} days ($${r.amount.toLocaleString()})`,
        impactWeeks: Math.ceil(r.collectionLagDays / 7),
        impactAmount: r.amount,
        category: "receivable_slippage",
      })
    }
  }

  // Large obligations near breakpoint
  if (breakpointWeek) {
    const nearBreakpoint = obligations.filter(o => {
      const weekNum = getWeekNumber(o.deferredTo ?? o.dueAt, buckets)
      return weekNum !== null && Math.abs(weekNum - breakpointWeek) <= 1 && o.amount > 5000
    })
    for (const o of nearBreakpoint) {
      drivers.push({
        id: `driver-${o.id}`,
        factor: "obligation_spike",
        description: `${o.description} ($${o.amount.toLocaleString()}) due near breakpoint week`,
        impactWeeks: 1,
        impactAmount: o.amount,
        category: "obligation_spike",
      })
    }
  }

  // Refund exposure
  for (const r of refundExp) {
    if (r.status === "pending") {
      drivers.push({
        id: `driver-${r.id}`,
        factor: "refund_exposure",
        description: `Pending refund: ${r.description} ($${r.amount.toLocaleString()})`,
        impactWeeks: 0,
        impactAmount: r.amount,
        category: "refund_exposure",
      })
    }
  }

  // Sort by impact amount descending
  drivers.sort((a, b) => b.impactAmount - a.impactAmount)
  return drivers.slice(0, 5)
}

// ── Action queue ──────────────────────────────────────────────────────────────

function buildActions(
  breakpointWeek: number | null,
  buckets: WeeklyBucket[],
  receivables: CashReceivable[],
  obligations: CashObligation[],
  refundExp: RefundExposureItem[],
  endingCash: number,
  thresholdCash: number,
): ActionItem[] {
  const actions: ActionItem[] = []
  const shortfall = breakpointWeek ? Math.max(0, thresholdCash - Math.min(...buckets.map(b => b.closingBalance))) : 0

  // 1. Accelerate collection on slipping receivables
  const slippingReceivables = receivables.filter(r => r.collectionLagDays > 0 && r.status === "expected")
  for (const r of slippingReceivables) {
    actions.push({
      id: `action-accelerate-${r.id}`,
      category: "accelerate_collection",
      description: `Accelerate collection on ${r.description}`,
      basis: `This $${r.amount.toLocaleString()} receivable has slipped ${r.collectionLagDays} days from its original due date. Accelerating collection by ${Math.min(r.collectionLagDays, 7)} days would improve cash position in week ${getWeekForDate(r.expectedDate, buckets) ?? "N/A"}.`,
      impactLow: Math.round(r.amount * 0.7),
      impactHigh: r.amount,
      speedDays: 3,
      riskLevel: "low",
      confidence: r.confidence,
      executable: true,
      manualGuidance: `Contact AP at the client organization. Reference the original payment terms and request expedited processing. Offer early payment discount of 1-2% if needed.`,
    })
  }

  // 2. Defer deferrable obligations
  const deferrableNearBreakpoint = obligations.filter(o =>
    o.isDeferrable && o.status === "scheduled" && breakpointWeek !== null
  )
  for (const o of deferrableNearBreakpoint) {
    actions.push({
      id: `action-defer-${o.id}`,
      category: "sequence_or_defer_payment",
      description: `Defer ${o.description} by 2 weeks`,
      basis: `This $${o.amount.toLocaleString()} ${o.category} payment is deferrable. Moving it 2 weeks later would reduce pressure on the breakpoint week.`,
      impactLow: Math.round(o.amount * 0.8),
      impactHigh: o.amount,
      speedDays: 1,
      riskLevel: o.category === "insurance" ? "medium" : "low",
      confidence: 0.95,
      executable: true,
      manualGuidance: `Contact the ${o.category} provider and request a 2-week extension on the payment due date. Most vendors will accommodate a short deferral with advance notice.`,
    })
  }

  // 3. Reduce discretionary spend
  if (breakpointWeek && breakpointWeek <= 6) {
    actions.push({
      id: "action-reduce-discretionary",
      category: "reduce_discretionary_spend",
      description: "Reduce discretionary spending across all departments",
      basis: `Breakpoint detected at week ${breakpointWeek}. Reducing non-essential spending by 15-25% across software, supplies, and non-critical vendor orders would improve runway.`,
      impactLow: 2000,
      impactHigh: 5000,
      speedDays: 7,
      riskLevel: "low",
      confidence: 0.85,
      executable: true,
      manualGuidance: "Review all non-essential subscriptions, defer non-critical maintenance, and pause discretionary purchases until cash position stabilizes.",
    })
  }

  // 4. Bridge financing (external, advisory only) — only if shortfall is severe
  if (shortfall > 10000) {
    actions.push({
      id: "action-bridge-financing",
      category: "bridge_financing",
      description: "Explore short-term bridge financing",
      basis: `Projected shortfall of $${shortfall.toLocaleString()} at breakpoint week ${breakpointWeek}. A short-term credit line or merchant cash advance could bridge the gap while receivables collect.`,
      impactLow: Math.round(shortfall * 0.6),
      impactHigh: shortfall,
      speedDays: 5,
      riskLevel: "high",
      confidence: 0.60,
      executable: false,
      manualGuidance: "Contact your bank about a short-term credit line. Typical SMB bridge financing ranges from 8-18% APR for 30-90 day terms. Do not commit without reviewing total cost of capital.",
    })
  }

  return actions
}

// ── Audit trail ───────────────────────────────────────────────────────────────

export async function logForecastRun(
  result: ForecastResult,
  organizationId: string,
): Promise<string> {
  try {
    const supabase = createServerSupabaseClient()

    // Get previous run's hash from ai_actions (forecast audit entries)
    const { data: prevAction } = await supabase
      .from("ai_actions")
      .select("output_payload_json")
      .eq("organization_id", organizationId)
      .eq("action_type", "forecast_run_logged")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const prevHash = (prevAction?.output_payload_json as Record<string, unknown> | null)?.payloadHash as string ?? null

    // Log the forecast run as an ai_action (this table is in PostgREST cache)
    const { data, error } = await supabase
      .from("ai_actions")
      .insert({
        organization_id: organizationId,
        entity_type: "forecast",
        entity_id: "00000000-0000-0000-0000-" + result.payloadHash.padEnd(12, "0").slice(0, 12),
        trigger_type: "forecast_run",
        action_type: "forecast_run_logged",
        input_summary: `${result.scenario} forecast: ${result.startingCash.toFixed(0)} → ${result.endingCash.toFixed(0)}, breakpoint w${result.breakpointWeek ?? "none"}, runway ${result.runwayWeeks}w`,
        output_payload_json: {
          scenario: result.scenario,
          asOfDate: result.asOfDate,
          startingCash: result.startingCash,
          endingCash: result.endingCash,
          breakpointWeek: result.breakpointWeek,
          runwayWeeks: result.runwayWeeks,
          thresholdCash: result.thresholdCash,
          driverCount: result.topDrivers.length,
          actionCount: result.actions.length,
          payloadHash: result.payloadHash,
          prevPayloadHash: prevHash,
        },
        status: "executed",
      })
      .select("id")
      .single()

    if (error) {
      console.error("Audit log failed:", error.message)
      return ""
    }

    return (data as { id: string }).id
  } catch (err) {
    console.error("Audit log failed:", err instanceof Error ? err.message : err)
    return ""
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNextMonday(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function getWeekNumber(dateStr: string, buckets: WeeklyBucket[]): number | null {
  for (const b of buckets) {
    if (dateStr >= b.weekStart && dateStr <= b.weekEnd) return b.weekNumber
  }
  return null
}

function getWeekForDate(dateStr: string, buckets: WeeklyBucket[]): number | null {
  return getWeekNumber(dateStr, buckets)
}
