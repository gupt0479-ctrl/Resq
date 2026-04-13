import type { SupabaseClient } from "@supabase/supabase-js"
import type { DashboardSummary } from "@/lib/schemas/dashboard"
import { listConnectors } from "@/lib/services/integrations"
import { getManagerSummaryForDashboard } from "@/lib/services/ai-summaries"

export async function getDashboardSummary(
  client: SupabaseClient,
  organizationId: string
): Promise<DashboardSummary> {
  const now      = new Date()
  const todayStr = toDateString(now)
  const weekISO  = startOfWeek(now).toISOString()

  // Today's reservations
  const { data: todayAppts } = await client
    .from("appointments")
    .select("id, status")
    .eq("organization_id", organizationId)
    .gte("starts_at", `${todayStr}T00:00:00Z`)
    .lte("starts_at", `${todayStr}T23:59:59Z`)

  const todayReservationCount = todayAppts?.length ?? 0

  // Upcoming (scheduled/confirmed, not today's)
  const { count: upcomingCount } = await client
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .in("status", ["scheduled", "confirmed"])
    .gt("starts_at", `${todayStr}T23:59:59Z`)

  const upcomingReservationCount = upcomingCount ?? 0

  // Revenue today
  const { data: revToday } = await client
    .from("finance_transactions")
    .select("amount")
    .eq("organization_id", organizationId)
    .eq("type", "revenue")
    .eq("direction", "in")
    .gte("occurred_at", `${todayStr}T00:00:00Z`)

  const todayRevenue = sumAmounts(revToday)

  // Overdue invoices
  const { data: overdueInvs } = await client
    .from("invoices")
    .select("total_amount, amount_paid")
    .eq("organization_id", organizationId)
    .eq("status", "overdue")

  const overdueInvoiceCount  = overdueInvs?.length ?? 0
  const overdueInvoiceAmount = sumRemaining(overdueInvs)

  // Pending invoices
  const { data: pendingInvs } = await client
    .from("invoices")
    .select("total_amount, amount_paid")
    .eq("organization_id", organizationId)
    .in("status", ["sent", "pending"])

  const pendingInvoiceCount  = pendingInvs?.length ?? 0
  const pendingInvoiceAmount = sumRemaining(pendingInvs)

  // Unhappy guests (stub — 0 until feedback module is built)
  const unhappyGuestCount = 0

  // Recent reservations (last 5)
  const { data: recentAppts } = await client
    .from("appointments")
    .select(`
      id, status, covers, starts_at,
      customers ( full_name ),
      services  ( name )
    `)
    .eq("organization_id", organizationId)
    .order("starts_at", { ascending: false })
    .limit(5)

  const recentReservations: DashboardSummary["recentReservations"] = (recentAppts ?? []).map(
    (a: Record<string, unknown>) => ({
      id:           a.id as string,
      customerName: (a.customers as Record<string, unknown>)?.full_name as string ?? "Unknown",
      serviceName:  (a.services as Record<string, unknown>)?.name as string ?? "Unknown",
      covers:       a.covers as number,
      startsAt:     a.starts_at as string,
      status:       a.status as string,
    })
  )

  // Finance snapshot
  const { data: revWeek } = await client
    .from("finance_transactions")
    .select("amount")
    .eq("organization_id", organizationId)
    .eq("type", "revenue")
    .eq("direction", "in")
    .gte("occurred_at", weekISO)

  const { data: expWeek } = await client
    .from("finance_transactions")
    .select("amount")
    .eq("organization_id", organizationId)
    .eq("direction", "out")
    .gte("occurred_at", weekISO)

  const weeklyRevenue  = sumAmounts(revWeek)
  const weeklyExpenses = sumAmounts(expWeek)
  const netCashFlow    = round2(weeklyRevenue - weeklyExpenses)

  const connectorsRaw = await listConnectors(client, organizationId).catch(() => [])
  const integrationConnectors = connectorsRaw.map((c: Record<string, unknown>) => ({
    provider:    String(c.provider ?? ""),
    displayName: String(c.display_name ?? c.provider ?? ""),
    status:      String(c.status ?? "disabled"),
    lastSyncAt:  (c.last_sync_at as string | null) ?? null,
    lastError:   (c.last_error as string | null) ?? null,
  }))

  const managerSummary = await getManagerSummaryForDashboard(client, organizationId)

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
    },
    recentReservations,
    financeSnapshot: { weeklyRevenue, weeklyExpenses, netCashFlow },
    integrationConnectors,
    managerSummary: {
      source:      managerSummary.source,
      headline:    managerSummary.headline,
      bullets:     managerSummary.bullets,
      riskNote:    managerSummary.riskNote,
      generatedAt: managerSummary.generatedAt,
    },
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function sumAmounts(rows: Array<{ amount: number | string }> | null): number {
  return round2((rows ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0))
}

function sumRemaining(
  rows: Array<{ total_amount: number | string; amount_paid: number | string }> | null
): number {
  return round2(
    (rows ?? []).reduce(
      (s, r) =>
        s + Math.max(0, (Number(r.total_amount) || 0) - (Number(r.amount_paid) || 0)),
      0
    )
  )
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function startOfWeek(d: Date): Date {
  const out = new Date(d)
  out.setDate(out.getDate() - out.getDay())
  out.setHours(0, 0, 0, 0)
  return out
}
