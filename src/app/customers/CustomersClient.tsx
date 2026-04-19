"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { RiskBadge, type RiskLevel } from "@/components/RiskBadge"
import { Building2, Mail } from "lucide-react"
import { InvestigationPanel } from "@/components/receivables/investigation-panel"
import type { CustomerRow } from "./page"

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function riskStatusToLevel(status: string | null, overdue: number): RiskLevel {
  if (status === "churned" || overdue > 5000) return "Critical"
  if (overdue > 1000) return "High"
  if (overdue > 0) return "Moderate"
  return "Stable"
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    overdue: "bg-amber/10 text-amber",
    pending: "bg-surface-muted text-steel",
    sent:    "bg-surface-muted text-steel",
    paid:    "bg-teal/10 text-teal",
    draft:   "bg-surface-muted text-steel",
  }
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", map[status] ?? "bg-surface-muted text-steel")}>
      {status}
    </span>
  )
}

export function CustomersClient({ customers }: { customers: CustomerRow[] }) {
  const [selectedId, setSelectedId] = useState<string>(customers[0]?.id ?? "")
  const selected = customers.find(c => c.id === selectedId) ?? customers[0]

  const totalOutstanding = customers.reduce((s, c) => s + c.outstanding, 0)
  const totalOverdue     = customers.reduce((s, c) => s + c.overdue, 0)

  return (
    <div className="p-8 lg:p-10 max-w-[1280px] mx-auto">
      <div className="mb-10">
        <div className="text-[11px] uppercase tracking-[0.18em] text-steel">Receivables · counterparties</div>
        <h1 className="font-display text-2xl lg:text-3xl mt-1">Customers</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card-elevated p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Active customers</div>
          <div className="font-display text-2xl mt-1">{customers.length}</div>
          <div className="text-[11.5px] text-steel mt-1">With recent activity</div>
        </div>
        <div className="card-elevated p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Outstanding</div>
          <div className="font-display text-2xl mt-1">{fmt(totalOutstanding)}</div>
          <div className="text-[11.5px] text-steel mt-1">Across all customers</div>
        </div>
        <div className="card-elevated p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Overdue</div>
          <div className="font-display text-2xl mt-1 text-amber">{fmt(totalOverdue)}</div>
          <div className="text-[11.5px] text-steel mt-1">Needs collections</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: customer list */}
        <div className="lg:col-span-5 space-y-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-3 px-1">All customers</div>
          {customers.map(c => {
            const active = c.id === selectedId
            const level  = riskStatusToLevel(c.riskStatus, c.overdue)
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "w-full text-left rounded-md border bg-card transition-all px-4 py-3.5",
                  active
                    ? "border-l-4 border-l-foreground border-y-border border-r-border shadow-sm"
                    : "border-border hover:bg-surface-muted",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-steel shrink-0" />
                      <div className="font-medium text-[13.5px] truncate">{c.name}</div>
                    </div>
                    {c.email && (
                      <div className="text-[11.5px] text-steel mt-1 truncate">{c.email}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display text-base leading-none">{fmt(c.outstanding)}</div>
                    <div className="text-[10px] uppercase tracking-wider text-steel mt-1">Outstanding</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <RiskBadge level={level} />
                  <span className="text-[11px] text-steel">
                    {c.invoiceCount} invoice{c.invoiceCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Right: detail */}
        {selected && (
          <div className="lg:col-span-7">
            <div className="card-elevated p-6 lg:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Customer</div>
                  <h2 className="font-display text-2xl mt-1">{selected.name}</h2>
                  {selected.email && (
                    <a href={`mailto:${selected.email}`} className="inline-flex items-center gap-1.5 text-[12.5px] text-steel hover:text-foreground mt-2">
                      <Mail className="h-3.5 w-3.5" />
                      {selected.email}
                    </a>
                  )}
                </div>
                <RiskBadge level={riskStatusToLevel(selected.riskStatus, selected.overdue)} />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-7">
                <div className="rounded-md border border-border bg-surface p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Outstanding</div>
                  <div className="font-display text-xl mt-1">{fmt(selected.outstanding)}</div>
                </div>
                <div className="rounded-md border border-border bg-surface p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Overdue</div>
                  <div className={cn("font-display text-xl mt-1", selected.overdue > 0 ? "text-amber" : "")}>
                    {fmt(selected.overdue)}
                  </div>
                </div>
              </div>

              {/* Invoices table */}
              {selected.invoices.length > 0 && (
                <div className="mt-8">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-3">Invoices</div>
                  <div className="rounded-md border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-steel bg-surface-muted">
                          <th className="text-left font-medium px-4 py-2.5">Invoice</th>
                          <th className="text-right font-medium px-3 py-2.5">Amount</th>
                          <th className="text-left font-medium px-3 py-2.5 hidden sm:table-cell">Due</th>
                          <th className="text-left font-medium px-3 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.invoices.map(inv => (
                          <tr key={inv.id} className="border-t border-border">
                            <td className="px-4 py-2.5 font-mono text-[12px]">{inv.number}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{fmt(inv.amount)}</td>
                            <td className="px-3 py-2.5 text-steel hidden sm:table-cell">{inv.dueAt ?? "—"}</td>
                            <td className="px-3 py-2.5"><StatusPill status={inv.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recommended action */}
              <div className="mt-8 rounded-md border border-border bg-surface p-5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Recommended action</div>
                <div className="mt-1.5 text-[14px]">
                  {selected.overdue > 0
                    ? "Send escalation with structured payment plan offer."
                    : selected.outstanding > 0
                      ? "Schedule a soft auto-confirm 72h before due date."
                      : "Account in good standing — no action required."}
                </div>
              </div>

              {/* Risk investigation */}
              {selected.overdue > 0 && (() => {
                const overdueInv = selected.invoices.find(i => i.status === "overdue") ?? selected.invoices[0]
                if (!overdueInv) return null
                return (
                  <div className="mt-3">
                    <InvestigationPanel
                      invoiceId={overdueInv.id}
                      invoiceNumber={overdueInv.number}
                      customerName={selected.name}
                      balance={overdueInv.amount}
                      daysOverdue={selected.overdue > 0 ? 1 : 0}
                      fullWidth
                    />
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
