import { connection } from "next/server"
import { db } from "@/lib/db"
import {
  financeTransactions,
  invoices,
  aiActions,
} from "@/lib/db/schema"
import { eq, and, gte, inArray } from "drizzle-orm"
import type { DashboardSummary } from "@/lib/schemas/dashboard"
import { listConnectors } from "@/lib/services/integrations"
import { getManagerSummaryForDashboard } from "@/lib/services/ai-summaries"
import { listRecentAiActions } from "@/lib/services/ai-actions"

export async function getDashboardSummary(
  organizationId: string
): Promise<DashboardSummary> {
  // Opt into dynamic rendering before reading the clock
  await connection()

  const now      = new Date()
  const weekISO  = startOfWeek(now).toISOString()

  // Use America/Chicago for "today" boundaries in demo data and local reporting.
  const chicagoFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric", month: "2-digit", day: "2-digit",
  })
  const parts = chicagoFormatter.formatToParts(now)
  const month = parts.find(p => p.type === "month")!.value
  const day   = parts.find(p => p.type === "day")!.value
  const year  = parts.find(p => p.type === "year")!.value
  const todayStr = `${year}-${month}-${day}`

  // Revenue today
  const revTodayRows = await db
    .select({ amount: financeTransactions.amount })
    .from(financeTransactions)
    .where(
      and(
        eq(financeTransactions.organizationId, organizationId),
        eq(financeTransactions.type, "revenue"),
        eq(financeTransactions.direction, "in"),
        gte(financeTransactions.occurredAt, new Date(`${todayStr}T00:00:00Z`))
      )
    )

  const todayRevenue = sumAmounts(revTodayRows)

  // Overdue invoices
  const overdueInvs = await db
    .select({ totalAmount: invoices.totalAmount, amountPaid: invoices.amountPaid })
    .from(invoices)
    .where(
      and(
        eq(invoices.organizationId, organizationId),
        eq(invoices.status, "overdue")
      )
    )

  const overdueInvoiceCount  = overdueInvs.length
  const overdueInvoiceAmount = sumRemaining(overdueInvs)

  // Pending invoices
  const pendingInvs = await db
    .select({ totalAmount: invoices.totalAmount, amountPaid: invoices.amountPaid })
    .from(invoices)
    .where(
      and(
        eq(invoices.organizationId, organizationId),
        inArray(invoices.status, ["sent", "pending"])
      )
    )

  const pendingInvoiceCount  = pendingInvs.length
  const pendingInvoiceAmount = sumRemaining(pendingInvs)

  // Active rescue actions (investigating or action_taken state)
  let activeRescueActionsCount = 0
  try {
    const rescueRows = await db
      .select({ entityId: aiActions.entityId })
      .from(aiActions)
      .where(
        and(
          eq(aiActions.organizationId, organizationId),
          inArray(aiActions.actionType, ["receivable_risk_detected", "customer_followup_sent", "financing_options_scouted", "payment_plan_suggested"]),
        )
      )
    // Count distinct invoices with an active rescue action
    const seen = new Set(rescueRows.map((r) => r.entityId))
    activeRescueActionsCount = seen.size
  } catch { /* ignore */ }

  let recentAiActivity: DashboardSummary["recentAiActivity"] = []
  try {
    recentAiActivity = await listRecentAiActions(organizationId, 8).then((rows) =>
      rows.map((r) => ({
        id:           r.id as string,
        actionType:   String(r.actionType ?? ""),
        inputSummary: String(r.inputSummary ?? ""),
        status:       String(r.status ?? ""),
        createdAt:    r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt ?? ""),
      }))
    )
  } catch {
    /* ai_actions table may not exist until migrations are applied */
  }

  // Finance snapshot
  const revWeekRows = await db
    .select({ amount: financeTransactions.amount })
    .from(financeTransactions)
    .where(
      and(
        eq(financeTransactions.organizationId, organizationId),
        eq(financeTransactions.type, "revenue"),
        eq(financeTransactions.direction, "in"),
        gte(financeTransactions.occurredAt, new Date(weekISO))
      )
    )

  const expWeekRows = await db
    .select({ amount: financeTransactions.amount })
    .from(financeTransactions)
    .where(
      and(
        eq(financeTransactions.organizationId, organizationId),
        eq(financeTransactions.direction, "out"),
        gte(financeTransactions.occurredAt, new Date(weekISO))
      )
    )

  const weeklyRevenue  = sumAmounts(revWeekRows)
  const weeklyExpenses = sumAmounts(expWeekRows)
  const netCashFlow    = round2(weeklyRevenue - weeklyExpenses)

  const connectorsRaw = await listConnectors(organizationId).catch(() => [])
  const integrationConnectorsResult = connectorsRaw.map((c: Record<string, unknown>) => ({
    provider:    String(c.provider ?? ""),
    displayName: String(c.displayName ?? c.display_name ?? c.provider ?? ""),
    status:      String(c.status ?? "disabled"),
    lastSyncAt:  (c.lastSyncAt as string | null) ?? (c.last_sync_at as string | null) ?? null,
    lastError:   (c.lastError as string | null) ?? (c.last_error as string | null) ?? null,
  }))

  const managerSummary = await getManagerSummaryForDashboard(organizationId)

  return {
    kpis: {
      todayRevenue,
      overdueInvoiceCount,
      overdueInvoiceAmount,
      pendingInvoiceCount,
      pendingInvoiceAmount,
      activeRescueActionsCount,
    },
    financeSnapshot: { weeklyRevenue, weeklyExpenses, netCashFlow },
    integrationConnectors: integrationConnectorsResult,
    managerSummary: {
      source:      managerSummary.source,
      headline:    managerSummary.headline,
      bullets:     managerSummary.bullets,
      riskNote:    managerSummary.riskNote,
      generatedAt: managerSummary.generatedAt,
    },
    recentAiActivity,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function sumAmounts(rows: Array<{ amount: string | null }> | null): number {
  return round2((rows ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0))
}

function sumRemaining(
  rows: Array<{ totalAmount: string | null; amountPaid: string | null }> | null
): number {
  return round2(
    (rows ?? []).reduce(
      (s, r) =>
        s + Math.max(0, (Number(r.totalAmount) || 0) - (Number(r.amountPaid) || 0)),
      0
    )
  )
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function startOfWeek(d: Date): Date {
  const out = new Date(d)
  out.setDate(out.getDate() - out.getDay())
  out.setHours(0, 0, 0, 0)
  return out
}
