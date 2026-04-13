import { connection } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { listInvoicesQuery } from "@/lib/queries/invoices"
import { isSupabaseConfigured } from "@/lib/env"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { INVOICE_STATUS_LABEL } from "@/lib/constants/enums"
import type { InvoiceStatus } from "@/lib/constants/enums"
import type { InvoiceResponse } from "@/lib/schemas/invoice"

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" })
}

function statusColor(status: InvoiceStatus) {
  const map: Record<InvoiceStatus, string> = {
    draft:   "bg-zinc-100 text-zinc-600",
    sent:    "bg-blue-100 text-blue-700",
    pending: "bg-amber-100 text-amber-800",
    paid:    "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
    void:    "bg-zinc-100 text-zinc-400",
  }
  return map[status] ?? "bg-zinc-100 text-zinc-600"
}

function daysOverdue(dueAt: string): number {
  return Math.floor((Date.now() - new Date(dueAt).getTime()) / 86400000)
}

export default async function InvoicesPage() {
  await connection()

  if (!isSupabaseConfigured()) {
    return (
      <div className="m-8 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm">
        <p className="font-semibold text-amber-800">Supabase not configured — connect a project to see invoices.</p>
      </div>
    )
  }

  const client = createServerSupabaseClient()
  const rows = await listInvoicesQuery(client, DEMO_ORG_ID, { limit: 50 }).catch(() => [])

  const counts: Partial<Record<InvoiceStatus, number>> = {}
  let totalPending = 0
  let totalOverdue = 0

  for (const r of rows) {
    const s = r.status
    counts[s] = (counts[s] ?? 0) + 1
    if (s === "sent" || s === "pending") totalPending += r.totalAmount - r.amountPaid
    if (s === "overdue") totalOverdue += r.totalAmount - r.amountPaid
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Invoices</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All guest invoices and payment status</p>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(counts) as [InvoiceStatus, number][]).map(([status, count]) => (
          <span key={status} className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor(status)}`}>
            {INVOICE_STATUS_LABEL[status]} · {count}
          </span>
        ))}
      </div>

      {/* Totals banner */}
      {(totalPending > 0 || totalOverdue > 0) && (
        <div className="flex gap-3">
          {totalPending > 0 && (
            <div className="flex-1 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
              <p className="text-xs text-blue-600 font-medium">Pending receivables</p>
              <p className="text-lg font-bold text-blue-700 mt-0.5">{fmt(totalPending)}</p>
            </div>
          )}
          {totalOverdue > 0 && (
            <div className="flex-1 rounded-lg bg-red-50 border border-red-100 px-4 py-3">
              <p className="text-xs text-red-600 font-medium">Overdue</p>
              <p className="text-lg font-bold text-red-700 mt-0.5">{fmt(totalOverdue)}</p>
            </div>
          )}
        </div>
      )}

      {/* Invoice table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">All Invoices ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet. Complete a reservation to generate one.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground text-left">
                    <th className="pb-2 pr-4 font-medium">Invoice #</th>
                    <th className="pb-2 pr-4 font-medium">Guest</th>
                    <th className="pb-2 pr-4 font-medium">Total</th>
                    <th className="pb-2 pr-4 font-medium">Due</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((inv: InvoiceResponse) => {
                    const status = inv.status
                    const isOverdue = status === "overdue"
                    const days = isOverdue ? daysOverdue(inv.dueAt) : 0
                    return (
                      <tr key={inv.id}>
                        <td className="py-2.5 pr-4 font-mono text-xs text-foreground">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-2.5 pr-4 font-medium text-foreground">
                          {inv.customerName}
                        </td>
                        <td className="py-2.5 pr-4 text-foreground font-medium">
                          {fmt(inv.totalAmount)}
                        </td>
                        <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">
                          {new Date(inv.dueAt).toLocaleDateString("en-US", {
                            month: "short", day: "numeric",
                          })}
                          {isOverdue && (
                            <span className="ml-1 text-red-500 text-[10px]">({days}d late)</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor(status)}`}>
                            {INVOICE_STATUS_LABEL[status]}
                          </span>
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
