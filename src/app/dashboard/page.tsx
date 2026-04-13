import type { ReactNode } from "react"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { getLedgerSchemaHealth } from "@/lib/db/ledger-schema"
import { getDashboardSummary } from "@/lib/queries/dashboard"
import { isSupabaseConfigured } from "@/lib/env"
import { LedgerSchemaBanner } from "@/components/ops/ledger-schema-banner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CalendarDays,
  DollarSign,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
} from "lucide-react"

export const dynamic = "force-dynamic"

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

// TODO: replace with Supabase query
const MOCK_AI_ACTIONS = [
  {
    id: "1",
    agent: "customer_service",
    action_type: "send_reminder",
    input_summary: "INV-2025-002 overdue — Priya Nair $94.95",
    status: "executed",
    created_at: "2026-04-12T08:10:00Z",
  },
  {
    id: "2",
    agent: "performance",
    action_type: "daily_summary_generated",
    input_summary: "End of day performance summary — Apr 11",
    status: "executed",
    created_at: "2026-04-12T07:00:00Z",
  },
  {
    id: "3",
    agent: "marketing",
    action_type: "draft_return_nudge",
    input_summary: "Sofia Morales has not returned in 45 days",
    status: "executed",
    created_at: "2026-04-12T05:00:00Z",
  },
  {
    id: "4",
    agent: "inventory",
    action_type: "reorder_alert",
    input_summary: "Wagyu Ribeye at 4 portions, below reorder level",
    status: "executed",
    created_at: "2026-04-12T03:10:00Z",
  },
  {
    id: "5",
    agent: "customer_service",
    action_type: "flag_and_draft_recovery",
    input_summary: "Priya Nair left score 2, allergy incident",
    status: "executed",
    created_at: "2026-04-11T10:15:00Z",
  },
  {
    id: "6",
    agent: "customer_service",
    action_type: "invoice_generated",
    input_summary: "Reservation completed for Marcus Webb, party of 2",
    status: "executed",
    created_at: "2026-04-09T21:30:00Z",
  },
]

// TODO: replace with Supabase query
const MOCK_FINANCE = {
  revenueThisWeek: 822,
  pendingReceivables: 313,
  overdue: 382,
}

// TODO: replace with Supabase query
const MOCK_INVENTORY_ALERTS = [
  { name: "Wagyu Ribeye", qty: 4, unit: "portions", status: "critical" },
  { name: "Braised Short Rib", qty: 7, unit: "portions", status: "low" },
  { name: "Heirloom Beets", qty: 2.5, unit: "kg", status: "low" },
]

  const client = createServerSupabaseClient()

  const schema = await getLedgerSchemaHealth(client)
  if (!schema.ok) {
    return <LedgerSchemaBanner message={schema.message} />
  }

  let loadError: string | null = null
  const summary = await getDashboardSummary(client, DEMO_ORG_ID).catch((err: unknown) => {
    loadError = err instanceof Error ? err.message : String(err)
    return null
  })

  if (!summary) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-3 text-center">
        <p className="text-muted-foreground">
          Failed to load dashboard data. Check your Supabase connection and run the seed.
        </p>
        {loadError ? (
          <p className="text-left text-xs font-mono rounded-lg border border-border bg-muted/40 p-3 text-red-800 whitespace-pre-wrap">
            {loadError}
          </p>
        ) : null}
      </div>
    )
  }
}

  const { kpis, recentReservations, financeSnapshot, integrationConnectors, managerSummary } = summary
  const cashTrend = financeSnapshot.netCashFlow > 0
    ? "positive"
    : financeSnapshot.netCashFlow < 0
    ? "negative"
    : "neutral"

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="space-y-5 p-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Good morning, Sarah</h1>
        <p className="text-xs text-muted-foreground">{today()} · Ember Table</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Today's Reservations"
          value={String(kpis.todayReservationCount)}
          sub={`${kpis.upcomingReservationCount} upcoming`}
          icon={<CalendarDays className="h-4 w-4" />}
          color="blue"
        />
        <KpiCard
          title="Today's Revenue"
          value={fmt(kpis.todayRevenue)}
          sub="from finance_transactions (ledger)"
          icon={<DollarSign className="h-4 w-4" />}
          color="green"
        />
        <KpiCard
          title="Overdue Invoices"
          value={String(kpis.overdueInvoiceCount)}
          sub={fmt(kpis.overdueInvoiceAmount) + " outstanding"}
          icon={<AlertTriangle className="h-4 w-4" />}
          color={kpis.overdueInvoiceCount > 0 ? "red" : "green"}
        />
        <KpiCard
          title="Pending Receivables"
          value={fmt(kpis.pendingInvoiceAmount)}
          sub={`${kpis.pendingInvoiceCount} invoice${kpis.pendingInvoiceCount !== 1 ? "s" : ""}`}
          icon={<Clock className="h-4 w-4" />}
          color="amber"
        />
      </div>

      {/* AI Briefing + Activity */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* AI Briefing */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              AI Manager Briefing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-5">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800">
                    2 guests need attention — 1 allergy complaint, 1 at-risk return
                  </p>
                  <p className="mt-1.5 text-xs text-red-700 leading-relaxed">
                    <strong>Priya Nair</strong> submitted a 2-star review citing a nut allergy incident — recovery message drafted and awaiting your approval. <strong>Sofia Morales</strong> has not returned in 45 days — a return-visit nudge has been queued.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  urgent
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Wagyu Ribeye at 4 portions — reorder before dinner service
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    Also low: Braised Short Rib, Heirloom Beets, Burrata. Review inventory for full picture.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

          <Card className="mt-4">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground font-medium">Manager summary</p>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {managerSummary.source === "ai" ? "AI (persisted)" : "Deterministic fallback"}
                </Badge>
              </div>
              <p className="text-sm font-medium text-foreground">{managerSummary.headline}</p>
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                {managerSummary.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
              {managerSummary.riskNote ? (
                <p className="text-[11px] text-amber-800 bg-amber-50 rounded-md px-2 py-1.5">{managerSummary.riskNote}</p>
              ) : null}
              {managerSummary.generatedAt ? (
                <p className="text-[10px] text-muted-foreground">
                  Generated {new Date(managerSummary.generatedAt).toLocaleString()}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Integrations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {integrationConnectors.length === 0 ? (
                <p className="text-xs text-muted-foreground">No connectors in Supabase.</p>
              ) : (
                integrationConnectors.map((c) => (
                  <div key={c.provider} className="flex justify-between text-xs gap-2">
                    <span className="font-medium text-foreground">{c.displayName}</span>
                    <span className={c.status === "connected" ? "text-green-600" : c.status === "error" ? "text-red-600" : "text-muted-foreground"}>
                      {c.status}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Finance + Inventory */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Financial snapshot */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Financial Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="grid grid-cols-3 divide-x divide-border">
              {[
                { label: "Revenue this week", value: `$${MOCK_FINANCE.revenueThisWeek}`, color: "text-emerald-600" },
                { label: "Pending receivables", value: `$${MOCK_FINANCE.pendingReceivables}`, color: "text-blue-600" },
                { label: "Overdue", value: `$${MOCK_FINANCE.overdue}`, color: "text-red-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="px-4 first:pl-0 last:pr-0 text-center">
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-snug">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              Revenue up 12% vs last week
            </div>
          </CardContent>
        </Card>

        {/* Inventory alerts preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Inventory Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-5">
            {MOCK_INVENTORY_ALERTS.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`h-2 w-2 rounded-full ${item.status === "critical" ? "bg-red-500" : "bg-amber-400"}`}
                  />
                  <span className="text-sm text-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {item.qty} {item.unit}
                  </span>
                  <Badge
                    variant={item.status === "critical" ? "destructive" : "outline"}
                    className="text-[10px]"
                  >
                    {item.status}
                  </Badge>
                </div>
              </div>
            ))}
            <a
              href="/inventory"
              className="block pt-1 text-center text-xs text-primary hover:underline"
            >
              View all inventory →
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
