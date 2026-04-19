import { connection } from "next/server"
import { db } from "@/lib/db"
import {
  appointments,
  customers,
  services,
  financeTransactions,
  invoices,
} from "@/lib/db/schema"
import { eq, and, gte, lte, gt, inArray, count, desc } from "drizzle-orm"
import type { DashboardSummary } from "@/lib/schemas/dashboard"
import { listConnectors } from "@/lib/services/integrations"
import { getManagerSummaryForDashboard } from "@/lib/services/ai-summaries"
import { countUnhappyGuestsForDashboard, getFeedbackSpotlightForDashboard } from "@/lib/queries/feedback"
import { listRecentAiActions } from "@/lib/services/ai-actions"

export async function getDashboardSummary(
  organizationId: string
): Promise<DashboardSummary> {
  // Opt into dynamic rendering before reading the clock
  await connection()

  const now      = new Date()
  const weekISO  = startOfWeek(now).toISOString()

  // Use America/Chicago (Ember Table timezone) for "today" boundaries
  const chicagoFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric", month: "2-digit", day: "2-digit",
  })
  const parts = chicagoFormatter.formatToParts(now)
  const month = parts.find(p => p.type === "month")!.value
  const day   = parts.find(p => p.type === "day")!.value
  const year  = parts.find(p => p.type === "year")!.value
  const todayStr = `${year}-${month}-${day}`

  // Today's reservations — use a broad window to catch local-time stored records
  const todayAppts = await db
    .select({ id: appointments.id, status: appointments.status })
    .from(appointments)
    .where(
      and(
        eq(appointments.organizationId, organizationId),
        gte(appointments.startsAt, new Date(`${todayStr}T00:00:00`)),
        lte(appointments.startsAt, new Date(`${todayStr}T23:59:59`))
      )
    )

  const todayReservationCount = todayAppts.length

  // Upcoming (scheduled/confirmed, after today)
  const [upcomingResult] = await db
    .select({ count: count() })
    .from(appointments)
    .where(
      and(
        eq(appointments.organizationId, organizationId),
        inArray(appointments.status, ["scheduled", "confirmed"]),
        gt(appointments.startsAt, new Date(`${todayStr}T23:59:59`))
      )
    )

  const upcomingReservationCount = Number(upcomingResult?.count ?? 0)

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
    const rows = await db.query.aiActions.findMany({
      columns: { entityId: true },
      where: (a, { eq: eq_, inArray: inArray_, and: and_, ne }) =>
        and_(
          eq_(a.organizationId, organizationId),
          inArray_(a.actionType, ["receivable_risk_detected", "customer_followup_sent", "financing_options_scouted", "payment_plan_suggested"]),
          ne(a.actionType, "escalation_triggered"),
        ),
    })
    const seen = new Set(rows.map((r) => r.entityId))
    activeRescueActionsCount = seen.size
  } catch { /* ignore */ }

  let unhappyGuestCount = 0
  let feedbackSpotlight: DashboardSummary["feedbackSpotlight"] = []
  let recentAiActivity: DashboardSummary["recentAiActivity"] = []
  try {
    ;[unhappyGuestCount, feedbackSpotlight, recentAiActivity] = await Promise.all([
      countUnhappyGuestsForDashboard(organizationId),
      getFeedbackSpotlightForDashboard(organizationId, 4),
      listRecentAiActions(organizationId, 8).then((rows) =>
        rows.map((r) => ({
          id:           r.id as string,
          actionType:   String(r.actionType ?? ""),
          inputSummary: String(r.inputSummary ?? ""),
          status:       String(r.status ?? ""),
          createdAt:    r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt ?? ""),
        }))
      ),
    ])
  } catch {
    /* feedback / ai_actions tables may not exist until migration 004 is applied */
  }

  // Recent reservations (last 5)
  const recentAppts = await db
    .select({
      id: appointments.id,
      status: appointments.status,
      covers: appointments.covers,
      startsAt: appointments.startsAt,
      customerName: customers.fullName,
      serviceName: services.name,
    })
    .from(appointments)
    .leftJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(eq(appointments.organizationId, organizationId))
    .orderBy(desc(appointments.createdAt))
    .limit(5)

  const recentReservations: DashboardSummary["recentReservations"] = recentAppts.map(
    (a) => ({
      id:           a.id,
      customerName: a.customerName ?? "Unknown",
      serviceName:  a.serviceName ?? "Unknown",
      covers:       a.covers,
      startsAt:     a.startsAt.toISOString(),
      status:       a.status,
    })
  )

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
      todayReservationCount,
      upcomingReservationCount,
      todayRevenue,
      overdueInvoiceCount,
      overdueInvoiceAmount,
      pendingInvoiceCount,
      pendingInvoiceAmount,
      unhappyGuestCount,
      activeRescueActionsCount,
    },
    recentReservations,
    financeSnapshot: { weeklyRevenue, weeklyExpenses, netCashFlow },
    integrationConnectors: integrationConnectorsResult,
    managerSummary: {
      source:      managerSummary.source,
      headline:    managerSummary.headline,
      bullets:     managerSummary.bullets,
      riskNote:    managerSummary.riskNote,
      generatedAt: managerSummary.generatedAt,
    },
    feedbackSpotlight,
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
