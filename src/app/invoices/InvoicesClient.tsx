"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { RiskBadge, type RiskLevel } from "@/components/RiskBadge"

export interface InvoiceRow {
  id: string
  number: string
  customerName: string
  amount: number
  balance: number
  status: "paid" | "overdue" | "pending" | "sent" | "draft"
  dueAt: string | null
  daysOverdue: number
  lineItems: { description: string; amount: number }[]
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function statusToRisk(inv: InvoiceRow): RiskLevel {
  if (inv.status === "overdue" && inv.daysOverdue > 60) return "Critical"
  if (inv.status === "overdue" && inv.daysOverdue > 30) return "High"
  if (inv.status === "overdue") return "Critical"
  return "Stable"
}

function statusLabel(status: InvoiceRow["status"]) {
  if (status === "paid")    return { label: "Collected", color: "text-teal" }
  if (status === "overdue") return { label: "Overdue",   color: "text-crimson" }
  return                           { label: "Pending",   color: "text-steel" }
}

function recommendedAction(inv: InvoiceRow): string {
  if (inv.status === "overdue" && inv.daysOverdue > 14) return "Send escalation + offer payment plan"
  if (inv.status === "overdue") return "Send a polite payment reminder"
  if (inv.status === "pending" || inv.status === "sent") return "Schedule a soft auto-confirm 72h before due date."
  return "Account in good standing — no action required."
}

export function InvoicesClient({ invoices }: { invoices: InvoiceRow[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(invoices[0]?.id ?? null)
  const selected = invoices.find(i => i.id === selectedId) ?? invoices[0] ?? null

  const overdue      = invoices.filter(i => i.status === "overdue")
  const pending      = invoices.filter(i => i.status === "pending" || i.status === "sent" || i.status === "draft")
  const collected    = invoices.filter(i => i.status === "paid")
  const overdueAmt   = overdue.reduce((s, i) => s + i.balance, 0)
  const pendingAmt   = pending.reduce((s, i) => s + i.balance, 0)
  const collectedAmt = collected.reduce((s, i) => s + i.amount, 0)

  return (
    <div className="p-8 lg:p-10 max-w-[1280px] mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl lg:text-3xl">Invoices</h1>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card-elevated p-6">
          <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-3">Overdue</div>
          <div className="font-display text-3xl text-crimson">{fmt(overdueAmt)}</div>
          <div className="text-[12px] text-steel mt-2">{overdue.length} invoice{overdue.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="card-elevated p-6">
          <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-3">Pending</div>
          <div className="font-display text-3xl">{fmt(pendingAmt)}</div>
          <div className="text-[12px] text-steel mt-2">{pending.length} invoice{pending.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="card-elevated p-6">
          <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-3">Collected (30D)</div>
          <div className="font-display text-3xl text-teal">{fmt(collectedAmt)}</div>
          <div className="text-[12px] text-steel mt-2">{collected.length} paid in full</div>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: invoice table */}
        <div className="lg:col-span-7">
          <div className="card-elevated overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[10px] uppercase tracking-[0.18em] text-steel font-medium px-6 py-3.5">Customer</th>
                  <th className="text-right text-[10px] uppercase tracking-[0.18em] text-steel font-medium px-4 py-3.5">Amount</th>
                  <th className="text-left text-[10px] uppercase tracking-[0.18em] text-steel font-medium px-4 py-3.5 hidden sm:table-cell">Due</th>
                  <th className="text-left text-[10px] uppercase tracking-[0.18em] text-steel font-medium px-4 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const active = inv.id === selectedId
                  const { label, color } = statusLabel(inv.status)
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedId(inv.id)}
                      className={cn(
                        "border-b border-border cursor-pointer transition-colors last:border-0",
                        active ? "bg-surface-muted" : "hover:bg-surface-muted/60"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className={cn("text-[13.5px] font-medium", active ? "text-foreground" : "")}>
                          {inv.customerName}
                        </div>
                        <div className="text-[11px] font-mono text-steel mt-0.5">{inv.number}</div>
                      </td>
                      <td className="px-4 py-4 text-right tabular-nums text-[13.5px] font-medium">
                        {fmt(inv.balance || inv.amount)}
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <div className="text-[12.5px] text-foreground">{inv.dueAt ?? "—"}</div>
                        {inv.daysOverdue > 0 && (
                          <div className="text-[11px] text-crimson mt-0.5">{inv.daysOverdue}d overdue</div>
                        )}
                      </td>
                      <td className={cn("px-4 py-4 text-[13px] font-medium", color)}>
                        {label}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: detail panel */}
        {selected && (
          <div className="lg:col-span-5">
            <div className="card-elevated p-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="text-[11px] font-mono text-steel uppercase tracking-wider">{selected.number}</div>
                <RiskBadge level={statusToRisk(selected)} />
              </div>

              <h2 className="font-display text-2xl leading-tight">{selected.customerName}</h2>
              <div className="text-[14px] text-steel mt-1">
                <span className="font-display text-2xl text-foreground mr-2">{fmt(selected.balance)}</span>
                {selected.dueAt && <span>due {selected.dueAt}</span>}
              </div>

              {/* Invoice composition */}
              {selected.lineItems.length > 0 && (
                <div className="mt-6">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-3">Invoice Composition</div>
                  <div className="space-y-2">
                    {selected.lineItems.map((li, i) => (
                      <div key={i} className="flex items-center justify-between text-[13px]">
                        <span className="text-foreground">{li.description}</span>
                        <span className="tabular-nums text-foreground">{fmt(li.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Aging */}
              {selected.daysOverdue > 0 && (
                <div className="mt-6">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-2">Aging</div>
                  <div className="text-[13px] text-crimson">
                    {selected.daysOverdue} days overdue · follow-up pending.
                  </div>
                </div>
              )}

              {/* Recommended action */}
              {(selected.status === "overdue" || selected.status === "pending" || selected.status === "sent") && (
                <div className="mt-6">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-2">Recommended Action</div>
                  <div className="rounded-md border border-border px-4 py-3 text-[13px] text-foreground">
                    {recommendedAction(selected)}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  )
}
