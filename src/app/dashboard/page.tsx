import type { ReactNode } from "react"
import Link from "next/link"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { getLedgerSchemaHealth } from "@/lib/db/ledger-schema"
import { getDashboardSummary } from "@/lib/queries/dashboard"
import { isSupabaseConfigured } from "@/lib/env"
import { LedgerSchemaBanner } from "@/components/ops/ledger-schema-banner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  DollarSign,
  MessageSquare,
  Plug,
  TrendingUp,
  Zap,
} from "lucide-react"

export const dynamic = "force-dynamic"

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

function agentBadgeClass(agent: string) {
  switch (agent) {
    case "customer_service":
      return "bg-teal-100 text-teal-700"
    case "inventory":
      return "bg-amber-100 text-amber-700"
    case "marketing":
      return "bg-purple-100 text-purple-700"
    case "performance":
      return "bg-blue-100 text-blue-700"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function agentLabel(agent: string) {
  return agent.replace(/_/g, " ")
}

function agentKeyFromActionType(actionType: string): string {
  if (actionType.includes("customer_service") || actionType.includes("analyze_review")) {
    return "customer_service"
  }
  if (actionType.includes("inventory")) return "inventory"
  if (actionType.includes("marketing")) return "marketing"
  if (actionType.includes("performance")) return "performance"
  return "customer_service"
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 60) return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}

function today() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="m-8 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm">
        <p className="font-semibold text-amber-800">
          Supabase not configured — connect a project to see dashboard data.
        </p>
      </div>
    )
  }

  const client = createServerSupabaseClient()
  const schema = await getLedgerSchemaHealth(client)

  if (!schema.ok) {
    return <LedgerSchemaBanner message={schema.message} />
  }

  const summaryResult = await getDashboardSummary(client, DEMO_ORG_ID)
    .then((data) => ({ summary: data, error: null as string | null }))
    .catch((err: unknown) => ({
      summary: null,
      error: err instanceof Error ? err.message : String(err),
    }))

  const { summary, error: loadError } = summaryResult

  if (!summary) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-8 text-center">
        <p className="text-muted-foreground">
          Failed to load dashboard data. Check your Supabase connection and run the seed.
        </p>
        {loadError ? (
          <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 text-left font-mono text-xs text-red-800">
            {loadError}
          </p>
        ) : null}
      </div>
    )
  }

  const {
    financeSnapshot,
    integrationConnectors,
    kpis,
    managerSummary,
    feedbackSpotlight,
    recentAiActivity,
  } = summary
  const cashTrend =
    financeSnapshot.netCashFlow > 0
      ? "Revenue ahead of expenses this week"
      : financeSnapshot.netCashFlow < 0
        ? "Expenses are outpacing revenue this week"
        : "Revenue and expenses are flat this week"

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Good morning, Sarah</h1>
        <p className="text-xs text-muted-foreground">{today()} · OpsPilot Rescue</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          title="Overdue Receivables"
          value={String(kpis.overdueInvoiceCount)}
          sub={`${fmt(kpis.overdueInvoiceAmount)} total owed`}
          icon={<AlertTriangle className="h-4 w-4" />}
          color={kpis.overdueInvoiceCount > 0 ? "red" : "green"}
        />
        <KpiCard
          title="At-Risk Cash"
          value={fmt(kpis.overdueInvoiceAmount + kpis.pendingInvoiceAmount)}
          sub={`${kpis.pendingInvoiceCount} pending + ${kpis.overdueInvoiceCount} overdue`}
          icon={<DollarSign className="h-4 w-4" />}
          color={kpis.overdueInvoiceAmount > 0 ? "amber" : "green"}
        />
        <KpiCard
          title="Active Rescue Cases"
          value={String(kpis.activeRescueActionsCount)}
          sub="invoices with recovery in progress"
          icon={<Zap className="h-4 w-4" />}
          color={kpis.activeRescueActionsCount > 0 ? "blue" : "green"}
        />
        <KpiCard
          title="Pending Receivables"
          value={fmt(kpis.pendingInvoiceAmount)}
          sub={`${kpis.pendingInvoiceCount} invoice${kpis.pendingInvoiceCount !== 1 ? "s" : ""} sent`}
          icon={<Clock className="h-4 w-4" />}
          color="amber"
        />
        <KpiCard
          title="Customers Needing Attention"
          value={String(kpis.unhappyGuestCount)}
          sub="flagged reviews or urgency ≥ 4"
          icon={<MessageSquare className="h-4 w-4" />}
          color={kpis.unhappyGuestCount > 0 ? "red" : "green"}
        />
      </div>

      {/* Phase 3: MCP bridge + feedback must remain visible on dashboard (PRD §4.3, §12.1). */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-primary/15 bg-primary/[0.03]">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Plug className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">MCP bridge &amp; connectors</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              External tools and automations POST to{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">/api/integrations/webhooks/:provider</code>
              . Events are logged and normalized into the same services as the UI.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="font-normal">
                {integrationConnectors.length} connector{integrationConnectors.length === 1 ? "" : "s"} linked
              </Badge>
              {integrationConnectors.some((c) => c.status === "error") ? (
                <Badge variant="destructive" className="text-[10px]">
                  Attention: connector error
                </Badge>
              ) : null}
            </div>
            {integrationConnectors.length === 0 ? (
              <p className="text-xs text-muted-foreground">No connectors in Supabase yet — seed adds demo rows.</p>
            ) : (
              <ul className="max-h-28 space-y-1 overflow-y-auto text-xs">
                {integrationConnectors.map((connector) => (
                  <li key={connector.provider} className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{connector.displayName}</span>
                    <span
                      className={
                        connector.status === "connected"
                          ? "text-green-600"
                          : connector.status === "error"
                            ? "text-red-600"
                            : "text-muted-foreground"
                      }
                    >
                      {connector.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/integrations"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Open integrations &amp; webhook docs
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-amber-200/80 bg-amber-50/40">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-amber-700" />
              <CardTitle className="text-sm font-semibold">Feedback &amp; recovery</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Flagged reviews and guest recovery drafts. Low scores and safety-related notes surface here first.
            </p>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            {feedbackSpotlight.length === 0 ? (
              <p className="text-xs text-muted-foreground">No urgent feedback in queue — great service week.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-4 text-xs text-foreground">
                {feedbackSpotlight.map((f) => (
                  <li key={f.id}>
                    <span className="font-medium">{f.guestName}</span> — {f.score}★
                    {f.safetyFlag ? " · safety" : ""}
                    {f.urgency >= 4 ? ` · urgency ${f.urgency}/5` : ""}
                    <span className="text-muted-foreground"> — {f.summary.slice(0, 90)}
                      {f.summary.length > 90 ? "…" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[10px] text-muted-foreground">
              Data from Supabase feedback table. Open the queue for full detail and drafts.
            </p>
            <Link
              href="/feedback"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Open feedback queue
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
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
                    <p className="text-sm font-semibold text-red-800">{managerSummary.headline}</p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-red-700">
                      {managerSummary.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  </div>
                  <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    urgent
                  </span>
                </div>
              </div>

              {managerSummary.riskNote ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Risk note</p>
                      <p className="mt-1 text-xs text-amber-700">{managerSummary.riskNote}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">Manager summary source</p>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {managerSummary.source === "ai" ? "AI (persisted)" : "Deterministic fallback"}
                </Badge>
              </div>
              {managerSummary.generatedAt ? (
                <p className="text-[10px] text-muted-foreground">
                  Generated {new Date(managerSummary.generatedAt).toLocaleString()}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Recent AI Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <ul className="divide-y divide-border">
                {recentAiActivity.length === 0 ? (
                  <li className="py-3 text-xs text-muted-foreground">No AI actions recorded yet.</li>
                ) : (
                  recentAiActivity.map((action) => {
                    const agent = agentKeyFromActionType(action.actionType)
                    return (
                      <li key={action.id} className="flex items-center gap-3 py-2.5">
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize ${agentBadgeClass(agent)}`}
                        >
                          {agentLabel(agent)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs text-foreground">{action.inputSummary}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {action.actionType.replace(/_/g, " ")} · {action.status}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {timeAgo(action.createdAt)}
                        </span>
                      </li>
                    )
                  })
                )}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/15 bg-primary/[0.03]">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Cashflow Rescue</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">
                AI-powered recovery for overdue receivables — follow-up, financing, and payment plans.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              <div className="flex items-center gap-3 text-xs">
                <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 font-semibold text-red-700">
                  {kpis.overdueInvoiceCount} overdue
                </span>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                  {kpis.activeRescueActionsCount} in recovery
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                  {fmt(kpis.overdueInvoiceAmount)} at risk
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Each case moves through: detect → follow-up → financing → payment plan → escalate.
                All steps are AI-generated and logged for audit.
              </p>
              <Link
                href="/rescue"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Open rescue queue
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Financial Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <div className="grid grid-cols-3 divide-x divide-border">
            {[
              {
                label: "Revenue this week",
                value: fmt(financeSnapshot.weeklyRevenue),
                color: "text-emerald-600",
              },
              {
                label: "Expenses this week",
                value: fmt(financeSnapshot.weeklyExpenses),
                color: "text-blue-600",
              },
              {
                label: "Net cash flow",
                value: fmt(financeSnapshot.netCashFlow),
                color:
                  financeSnapshot.netCashFlow >= 0 ? "text-emerald-600" : "text-red-600",
              },
            ].map(({ color, label, value }) => (
              <div key={label} className="px-4 text-center first:pl-0 last:pr-0">
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            {cashTrend}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({
  color,
  icon,
  sub,
  title,
  value,
}: {
  color: "amber" | "blue" | "green" | "red"
  icon: ReactNode
  sub: string
  title: string
  value: string
}) {
  const accentClass = {
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
  }[color]

  return (
    <Card>
      <CardContent className="p-4">
        <div className={`mb-3 inline-flex rounded-lg p-2.5 ${accentClass}`}>{icon}</div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{title}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}
