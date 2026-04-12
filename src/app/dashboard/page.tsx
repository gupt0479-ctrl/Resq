import type { ReactNode } from "react"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { getDashboardSummary } from "@/lib/queries/dashboard"
import { isSupabaseConfigured } from "@/lib/env"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CalendarDays,
  DollarSign,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react"

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    completed:   "bg-green-100 text-green-800",
    confirmed:   "bg-blue-100 text-blue-800",
    in_progress: "bg-amber-100 text-amber-800",
    scheduled:   "bg-slate-100 text-slate-700",
    cancelled:   "bg-red-100 text-red-700",
    no_show:     "bg-zinc-100 text-zinc-600",
  }
  return map[status] ?? "bg-zinc-100 text-zinc-600"
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return <UnconfiguredBanner />
  }

  const client = createServerSupabaseClient()
  const summary = await getDashboardSummary(client, DEMO_ORG_ID).catch(() => null)

  if (!summary) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Failed to load dashboard data. Check your Supabase connection and run the seed.
      </div>
    )
  }

  const { kpis, recentReservations, financeSnapshot } = summary
  const cashTrend = financeSnapshot.netCashFlow > 0
    ? "positive"
    : financeSnapshot.netCashFlow < 0
    ? "negative"
    : "neutral"

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Good evening, Ember Table</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Here&apos;s what&apos;s happening today — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
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
          sub="from paid invoices"
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

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent reservations */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Recent Reservations</CardTitle>
            </CardHeader>
            <CardContent>
              {recentReservations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reservations yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentReservations.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-foreground">{r.customerName}</span>
                        <span className="text-muted-foreground ml-2">{r.serviceName}</span>
                        <span className="text-muted-foreground ml-1">· {r.covers} guest{r.covers !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge(r.status)}`}>
                          {r.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Finance snapshot */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">This Week</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Revenue</span>
                <span className="font-medium text-green-600">{fmt(financeSnapshot.weeklyRevenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expenses</span>
                <span className="font-medium text-red-500">{fmt(financeSnapshot.weeklyExpenses)}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between text-sm font-semibold">
                <span className="text-foreground">Net Cash Flow</span>
                <span className={`flex items-center gap-1 ${cashTrend === "positive" ? "text-green-600" : cashTrend === "negative" ? "text-red-500" : "text-muted-foreground"}`}>
                  {cashTrend === "positive" && <TrendingUp className="h-3.5 w-3.5" />}
                  {cashTrend === "negative" && <TrendingDown className="h-3.5 w-3.5" />}
                  {cashTrend === "neutral"  && <Minus className="h-3.5 w-3.5" />}
                  {fmt(Math.abs(financeSnapshot.netCashFlow))}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* AI summary stub */}
          <Card className="mt-4 border-dashed">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground font-medium mb-1">AI Manager Summary</p>
              <p className="text-xs text-muted-foreground italic">
                {kpis.overdueInvoiceCount > 0
                  ? `${kpis.overdueInvoiceCount} overdue invoice${kpis.overdueInvoiceCount > 1 ? "s" : ""} need attention — ${fmt(kpis.overdueInvoiceAmount)} at risk.`
                  : "All invoices are current. Great cash position this week."}
              </p>
              <Badge variant="outline" className="mt-2 text-[10px]">AI summary — coming in milestone 2</Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  sub,
  icon,
  color,
}: {
  title: string
  value: string
  sub: string
  icon: ReactNode
  color: "blue" | "green" | "red" | "amber"
}) {
  const colors = {
    blue:  "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    red:   "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
  }
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
          </div>
          <div className={`rounded-lg p-2 ${colors[color]}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function UnconfiguredBanner() {
  return (
    <div className="m-8 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm">
      <p className="font-semibold text-amber-800 mb-1">Supabase not configured</p>
      <p className="text-amber-700">
        Copy <code className="font-mono">.env.local.example</code> to{" "}
        <code className="font-mono">.env.local</code>, fill in your Supabase credentials, and run{" "}
        <code className="font-mono">supabase/seed.sql</code> in the Supabase SQL Editor.
      </p>
    </div>
  )
}
