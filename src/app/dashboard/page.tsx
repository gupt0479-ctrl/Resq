import Link from "next/link"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { getDashboardSummary } from "@/lib/queries/dashboard"
import { isSupabaseConfigured } from "@/lib/env"
import { KpiCard } from "@/components/KpiCard"
import { ArrowUpRight, Zap, AlertTriangle } from "lucide-react"

export const dynamic = "force-dynamic"

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 60) return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}

type InvoiceCustomer = { full_name: string } | null

function getInvoiceCustomer(
  customer: InvoiceCustomer | InvoiceCustomer[] | null | undefined
): InvoiceCustomer {
  if (Array.isArray(customer)) return customer[0] ?? null
  return customer ?? null
}

function formatDueDateLabel(iso: string | null | undefined) {
  if (!iso) return "Due date unavailable"
  return `Due ${new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="m-8 rounded-lg border border-amber/30 bg-amber/10 p-6 text-sm text-amber">
        Supabase not configured.
      </div>
    )
  }

  const client = createServerSupabaseClient()
  const summary = await getDashboardSummary(client, DEMO_ORG_ID).catch(() => null)

  if (!summary) {
    return (
      <div className="m-8 text-sm text-steel">Failed to load dashboard data.</div>
    )
  }

  const { kpis, financeSnapshot, recentAiActivity, integrationConnectors } = summary

  // Derive cash runway estimate: cash on hand / weekly burn * 7
  const weeklyBurn = financeSnapshot.weeklyExpenses
  const cashOnHand = financeSnapshot.weeklyRevenue * 4 // rough proxy
  const runwayDays  = weeklyBurn > 0 ? Math.round((cashOnHand / weeklyBurn) * 7) : 0

  // Top overdue invoices for survival briefing + top risks
  const { data: overdueInvoices } = await client
    .from("invoices")
    .select("id, invoice_number, total_amount, amount_paid, due_at, customers(full_name)")
    .eq("organization_id", DEMO_ORG_ID)
    .eq("status", "overdue")
    .order("total_amount", { ascending: false })
    .limit(5)

  const topInvoice = overdueInvoices?.[0]
  const topCust = getInvoiceCustomer(topInvoice?.customers as InvoiceCustomer | InvoiceCustomer[] | undefined)

  return (
    <div className="p-8 lg:p-10 max-w-[1280px] mx-auto">
      {/* Page header */}
      <div className="mb-10">
        <div className="text-[11px] uppercase tracking-[0.18em] text-steel">Financial health</div>
        <h1 className="font-display text-2xl lg:text-3xl mt-1">Dashboard</h1>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <KpiCard
          label="At-risk receivables"
          value={fmt(kpis.overdueInvoiceAmount)}
          delta={`${kpis.overdueInvoiceCount} overdue invoice${kpis.overdueInvoiceCount !== 1 ? "s" : ""}`}
          tone={kpis.overdueInvoiceAmount > 0 ? "amber" : "teal"}
        />
        <KpiCard
          label="Cash runway"
          value={`${runwayDays}d`}
          delta="Estimated based on burn rate"
          tone={runwayDays < 30 ? "crimson" : runwayDays < 60 ? "amber" : "teal"}
        />
        <KpiCard
          label="Active rescue cases"
          value={String(kpis.activeRescueActionsCount)}
          delta="Invoices in recovery"
          tone={kpis.activeRescueActionsCount > 0 ? "amber" : "neutral"}
        />
        <KpiCard
          label="Weekly net cash"
          value={fmt(financeSnapshot.netCashFlow)}
          delta={financeSnapshot.netCashFlow >= 0 ? "Revenue ahead" : "Expenses ahead"}
          tone={financeSnapshot.netCashFlow >= 0 ? "teal" : "crimson"}
        />
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Survival briefing */}
          {topInvoice && (
            <div className="card-elevated p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-1">Survival briefing</div>
                  <h2 className="font-display text-lg">Action required today</h2>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-crimson/10 text-crimson border border-crimson/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
                  Urgent
                </span>
              </div>
              <div className="mt-5 rounded-md border border-border bg-surface p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-amber mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[13.5px] font-medium">
                      {topCust?.full_name} — {fmt(Number(topInvoice.total_amount) - Number(topInvoice.amount_paid))} overdue
                    </p>
                    <p className="text-[11.5px] text-steel mt-0.5">
                      Invoice {topInvoice.invoice_number} · Due {topInvoice.due_at ? new Date(topInvoice.due_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                    </p>
                  </div>
                </div>
              </div>
              <Link
                href="/rescue"
                className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-foreground hover:underline"
              >
                Open Rescue Queue
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {/* Top risks */}
          <div className="card-elevated p-6">
            <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-4">Top risks</div>
            <div className="space-y-3">
              {(overdueInvoices ?? []).slice(0, 3).map((inv) => {
                const cust  = getInvoiceCustomer(inv.customers as InvoiceCustomer | InvoiceCustomer[] | undefined)
                const bal   = Number(inv.total_amount) - Number(inv.amount_paid)
                return (
                  <div key={inv.id} className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-[13px] font-medium">{cust?.full_name ?? "Unknown"}</p>
                      <p className="text-[11px] text-steel">{formatDueDateLabel(inv.due_at)} · {inv.invoice_number}</p>
                    </div>
                    <span className="font-display text-base text-crimson shrink-0">{fmt(bal)}</span>
                  </div>
                )
              })}
              {!overdueInvoices?.length && (
                <p className="text-[12.5px] text-steel">No overdue invoices — all clear.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-5 space-y-6">
          {/* Recent AI activity */}
          <div className="card-elevated p-6">
            <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-4">Agent activity</div>
            <div className="space-y-3">
              {recentAiActivity.length === 0 ? (
                <p className="text-[12.5px] text-steel">No AI actions yet.</p>
              ) : recentAiActivity.slice(0, 6).map((action) => (
                <div key={action.id} className="flex items-start gap-3 py-1.5 border-b border-border last:border-0">
                  <div className="h-5 w-5 rounded-full bg-surface-muted flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="h-3 w-3 text-steel" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium truncate">{action.inputSummary}</p>
                    <p className="text-[11px] text-steel">{action.actionType.replace(/_/g, " ")}</p>
                  </div>
                  <span className="text-[10px] text-steel shrink-0">{timeAgo(action.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Agent health */}
          <div className="card-elevated p-6">
            <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-4">Agent health</div>
            <div className="space-y-2.5">
              {integrationConnectors.slice(0, 4).map((c) => (
                <div key={c.provider} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${c.status === "connected" ? "bg-teal" : c.status === "error" ? "bg-crimson" : "bg-steel"}`} />
                    <span className="text-[12.5px]">{c.displayName}</span>
                  </div>
                  <span className={`text-[11px] ${c.status === "connected" ? "text-teal" : c.status === "error" ? "text-crimson" : "text-steel"}`}>
                    {c.status}
                  </span>
                </div>
              ))}
              <div className="pt-2">
                <Link href="/integrations" className="inline-flex items-center gap-1 text-[12px] text-steel hover:text-foreground">
                  All integrations <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="card-elevated p-6">
            <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-4">Quick actions</div>
            <div className="space-y-2">
              {[
                { href: "/rescue",   label: "Open Rescue Queue",   desc: "Triage overdue invoices" },
                { href: "/invoices", label: "View all invoices",    desc: `${kpis.overdueInvoiceCount + kpis.pendingInvoiceCount} open` },
                { href: "/finance",  label: "Cashflow projections", desc: "30-day view" },
              ].map(({ href, label, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between rounded-md border border-border bg-surface hover:bg-surface-muted px-4 py-3 transition-colors"
                >
                  <div>
                    <p className="text-[13px] font-medium">{label}</p>
                    <p className="text-[11px] text-steel">{desc}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-steel shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
