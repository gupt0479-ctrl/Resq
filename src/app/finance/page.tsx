import type { ReactNode } from "react"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { getFinanceSummaryQuery, listTransactionsQuery } from "@/lib/queries/finance"
import { isSupabaseConfigured } from "@/lib/env"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FINANCE_TRANSACTION_TYPE_LABEL } from "@/lib/constants/enums"
import type { FinanceTransactionType } from "@/lib/constants/enums"
import type { FinanceTransactionResponse } from "@/lib/schemas/finance"
import { TrendingUp, TrendingDown, AlertCircle, Clock } from "lucide-react"

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" })
}

export default async function FinancePage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="m-8 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm">
        <p className="font-semibold text-amber-800">Supabase not configured — connect a project to see finance data.</p>
      </div>
    )
  }

  const client = createServerSupabaseClient()
  const [summary, transactions] = await Promise.all([
    getFinanceSummaryQuery(client, DEMO_ORG_ID).catch(() => null),
    listTransactionsQuery(client, DEMO_ORG_ID, { limit: 20 }).catch(() => []),
  ])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Finance</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Revenue, expenses, and receivables for Ember Table
        </p>
      </div>

      {summary ? (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard
              label="Revenue this week"
              value={fmt(summary.revenueThisWeek)}
              icon={<TrendingUp className="h-4 w-4 text-green-500" />}
            />
            <MetricCard
              label="Expenses this week"
              value={fmt(summary.expensesThisWeek)}
              icon={<TrendingDown className="h-4 w-4 text-red-500" />}
            />
            <MetricCard
              label="Pending receivables"
              value={fmt(summary.pendingReceivables)}
              sub={`${summary.pendingInvoiceCount} invoice${summary.pendingInvoiceCount !== 1 ? "s" : ""}`}
              icon={<Clock className="h-4 w-4 text-blue-500" />}
            />
            <MetricCard
              label="Overdue receivables"
              value={fmt(summary.overdueReceivables)}
              sub={`${summary.overdueInvoiceCount} invoice${summary.overdueInvoiceCount !== 1 ? "s" : ""}`}
              icon={<AlertCircle className="h-4 w-4 text-red-500" />}
              highlight={summary.overdueInvoiceCount > 0}
            />
          </div>

          {/* Net cash flow + aging */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Net Cash Flow (this week)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${summary.netCashFlowEstimate >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {fmt(Math.abs(summary.netCashFlowEstimate))}
                  {summary.netCashFlowEstimate < 0 && " deficit"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Revenue ({fmt(summary.revenueThisWeek)}) minus expenses ({fmt(summary.expensesThisWeek)})
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Invoice Aging</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <AgingRow label="Current (not yet due)"   bucket={summary.aging.current}   color="text-green-600" />
                <AgingRow label="1–30 days overdue"       bucket={summary.aging.due1to30}  color="text-amber-600" />
                <AgingRow label="31–60 days overdue"      bucket={summary.aging.due31to60} color="text-orange-600" />
                <AgingRow label="60+ days overdue"        bucket={summary.aging.over60}    color="text-red-600" />
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Failed to load finance summary.</p>
      )}

      {/* Transaction table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground text-left">
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 pr-4 font-medium">Category</th>
                    <th className="pb-2 pr-4 font-medium">Notes</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((t: FinanceTransactionResponse) => {
                    const isIn = t.direction === "in"
                    const type = t.type as FinanceTransactionType
                    return (
                      <tr key={t.id}>
                        <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">
                          {new Date(t.occurredAt).toLocaleDateString("en-US", {
                            month: "short", day: "numeric",
                          })}
                        </td>
                        <td className="py-2.5 pr-4 text-muted-foreground">
                          {FINANCE_TRANSACTION_TYPE_LABEL[type] ?? type}
                        </td>
                        <td className="py-2.5 pr-4 text-muted-foreground capitalize">
                          {t.category.replace(/_/g, " ")}
                        </td>
                        <td className="py-2.5 pr-4 text-muted-foreground text-xs max-w-xs truncate">
                          {t.notes ?? "—"}
                        </td>
                        <td className={`py-2.5 text-right font-medium ${isIn ? "text-green-600" : "text-red-500"}`}>
                          {isIn ? "+" : "−"}{fmt(t.amount)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  label,
  value,
  sub,
  icon,
  highlight = false,
}: {
  label: string
  value: string
  sub?: string
  icon: ReactNode
  highlight?: boolean
}) {
  return (
    <Card className={highlight ? "border-red-200 bg-red-50/30" : undefined}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className="mt-1">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function AgingRow({
  label,
  bucket,
  color,
}: {
  label: string
  bucket: { count: number; amount: number }
  color: string
}) {
  if (bucket.count === 0) return null
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${color}`}>
        {fmt(bucket.amount)}{" "}
        <span className="text-xs text-muted-foreground">({bucket.count})</span>
      </span>
    </div>
  )
}
