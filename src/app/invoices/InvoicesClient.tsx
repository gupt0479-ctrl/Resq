"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { RiskBadge, type RiskLevel } from "@/components/RiskBadge"
import { InvestigationPanel } from "@/components/receivables/investigation-panel"
import type { InvoiceRow } from "./page"

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function statusToRisk(inv: InvoiceRow): RiskLevel {
  if (inv.status === "overdue" && inv.daysOverdue > 60) return "Critical"
  if (inv.status === "overdue" && inv.daysOverdue > 30) return "High"
  if (inv.status === "overdue") return "Moderate"
  return "Stable"
}

function StatusPill({ status }: { status: InvoiceRow["status"] }) {
  const map = {
    overdue: "bg-amber/10 text-amber border-amber/20",
    pending: "bg-surface-muted text-steel border-border",
    sent:    "bg-surface-muted text-steel border-border",
    paid:    "bg-teal/10 text-teal border-teal/20",
    draft:   "bg-surface-muted text-steel border-border",
  } as const
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize", map[status])}>
      {status}
    </span>
  )
}

export function InvoicesClient({ invoices }: { invoices: InvoiceRow[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(invoices[0]?.id ?? null)
  const selected = invoices.find(i => i.id === selectedId) ?? invoices[0] ?? null

  const overdue    = invoices.filter(i => i.status === "overdue")
  const pending    = invoices.filter(i => i.status === "pending" || i.status === "sent")
  const collected  = invoices.filter(i => i.status === "paid")
  const overdueAmt = overdue.reduce((s, i) => s + i.balance, 0)
  const pendingAmt = pending.reduce((s, i) => s + i.balance, 0)
  const collectedAmt = collected.reduce((s, i) => s + i.amount, 0)

  return (
    <div className="p-8 lg:p-10 max-w-[1280px] mx-auto">
      {/* Page header */}
      <div className="mb-10">
        <div className="text-[11px] uppercase tracking-[0.18em] text-steel">Accounts receivable</div>
        <h1 className="font-display text-2xl lg:text-3xl mt-1">Invoices</h1>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card-elevated p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Overdue</div>
          <div className="font-display text-2xl mt-1 text-amber">{fmt(overdueAmt)}</div>
          <div className="text-[11.5px] text-steel mt-1">{overdue.length} invoice{overdue.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="card-elevated p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Pending</div>
          <div className="font-display text-2xl mt-1">{fmt(pendingAmt)}</div>
          <div className="text-[11.5px] text-steel mt-1">{pending.length} invoice{pending.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="card-elevated p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-steel">30-day collected</div>
          <div className="font-display text-2xl mt-1 text-teal">{fmt(collectedAmt)}</div>
          <div className="text-[11.5px] text-steel mt-1">{collected.length} paid</div>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: invoice list */}
        <div className="lg:col-span-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-3 px-1">All invoices</div>
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-steel bg-surface-muted">
                  <th className="text-left font-medium px-4 py-2.5">Customer</th>
                  <th className="text-right font-medium px-3 py-2.5">Amount</th>
                  <th className="text-left font-medium px-3 py-2.5 hidden sm:table-cell">Due</th>
                  <th className="text-left font-medium px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedId(inv.id)}
                    className={cn(
                      "border-t border-border cursor-pointer transition-colors",
                      inv.id === selectedId
                        ? "bg-foreground text-background"
                        : "hover:bg-surface-muted",
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <div className={cn("text-[13px] font-medium truncate max-w-[120px]", inv.id === selectedId ? "text-background" : "")}>
                        {inv.customerName}
                      </div>
                      <div className={cn("text-[11px] font-mono", inv.id === selectedId ? "text-background/60" : "text-steel")}>
                        {inv.number}
                      </div>
                    </td>
                    <td className={cn("px-3 py-2.5 text-right tabular-nums text-[13px]", inv.id === selectedId ? "text-background" : "")}>
                      {fmt(inv.balance || inv.amount)}
                    </td>
                    <td className={cn("px-3 py-2.5 hidden sm:table-cell text-[12px]", inv.id === selectedId ? "text-background/70" : "text-steel")}>
                      {inv.dueAt ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusPill status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: detail panel */}
        {selected && (
          <div className="lg:col-span-7">
            <div className="card-elevated p-6 lg:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Invoice</div>
                  <h2 className="font-display text-2xl mt-1">{selected.customerName}</h2>
                  <div className="font-mono text-[12px] text-steel mt-1">{selected.number}</div>
                </div>
                <RiskBadge level={statusToRisk(selected)} />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="rounded-md border border-border bg-surface p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Balance due</div>
                  <div className={cn("font-display text-xl mt-1", selected.status === "overdue" ? "text-amber" : "")}>
                    {fmt(selected.balance)}
                  </div>
                </div>
                <div className="rounded-md border border-border bg-surface p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Due date</div>
                  <div className={cn("font-display text-xl mt-1", selected.daysOverdue > 0 ? "text-crimson" : "")}>
                    {selected.dueAt ?? "—"}
                  </div>
                  {selected.daysOverdue > 0 && (
                    <div className="text-[11px] text-crimson mt-0.5">{selected.daysOverdue}d overdue</div>
                  )}
                </div>
              </div>

              {/* Line items */}
              {selected.lineItems.length > 0 && (
                <div className="mt-6">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-3">Line items</div>
                  <div className="rounded-md border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-steel bg-surface-muted">
                          <th className="text-left font-medium px-3 py-2">Description</th>
                          <th className="text-right font-medium px-3 py-2">Qty</th>
                          <th className="text-right font-medium px-3 py-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.lineItems.map((li, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-2 text-[12.5px]">{li.description}</td>
                            <td className="px-3 py-2 text-right text-[12.5px] text-steel">{li.quantity}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-[12.5px]">{fmt(li.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              {(selected.status === "overdue" || selected.status === "sent" || selected.status === "pending") && (
                <div className="mt-6 flex items-center gap-3">
                  <InvestigationPanel
                    invoiceId={selected.id}
                    invoiceNumber={selected.number}
                    customerName={selected.customerName}
                    balance={selected.balance}
                    daysOverdue={selected.daysOverdue}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
