"use client"

import { useState } from "react"
import { ExternalLink, ChevronDown, ChevronUp, CheckCircle2, Pencil, XCircle, MoreHorizontal } from "lucide-react"
import { ShipmentStatusBadge } from "./shipment-status-badge"
import { ModifySheet } from "./modify-sheet"
import { CancelDialog } from "./cancel-dialog"
import type { Shipment } from "@/lib/types"

const TODAY = "2026-04-11"

function dateLabel(isoDate: string): string {
  if (isoDate === TODAY) return "Today"
  const tomorrow = new Date(TODAY)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (isoDate === tomorrow.toISOString().slice(0, 10)) return "Tomorrow"
  return new Date(isoDate).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(n)
}

function ShipmentRow({
  shipment: initial,
  onUpdate,
}: {
  shipment: Shipment
  onUpdate: (s: Shipment) => void
}) {
  const [shipment, setShipment] = useState(initial)
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [modifyOpen, setModifyOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const isMutable =
    shipment.status !== "delivered" && shipment.status !== "cancelled"

  async function patchStatus(status: Shipment["status"]) {
    setSaving(true)
    try {
      const res = await fetch(`/api/shipments/${shipment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        const updated: Shipment = await res.json()
        setShipment(updated)
        onUpdate(updated)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel(reason: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/shipments/${shipment.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      if (res.ok) {
        const updated: Shipment = await res.json()
        setShipment(updated)
        onUpdate(updated)
      }
    } finally {
      setSaving(false)
      setCancelOpen(false)
    }
  }

  async function handleSaveModify(
    lineItems: { id: string; quantityOrdered: number }[],
    notes: string
  ) {
    setSaving(true)
    try {
      const res = await fetch(`/api/shipments/${shipment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItems, notes }),
      })
      if (res.ok) {
        const updated: Shipment = await res.json()
        setShipment(updated)
        onUpdate(updated)
      }
    } finally {
      setSaving(false)
      setModifyOpen(false)
    }
  }

  const isCanc = shipment.status === "cancelled"

  return (
    <>
      {/* Main row */}
      <tr
        className={`border-b border-border transition-colors hover:bg-muted/40 ${isCanc ? "opacity-50" : ""}`}
      >
        {/* Tracking ID */}
        <td className="px-4 py-3">
          <div className="space-y-0.5">
            <p className="font-mono text-xs font-medium text-foreground uppercase">
              {shipment.id}
            </p>
            {shipment.trackingNumber && shipment.trackingUrl ? (
              <a
                href={shipment.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
              >
                {shipment.trackingNumber}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            ) : (
              <span className="text-[10px] text-muted-foreground">No tracking</span>
            )}
          </div>
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          <ShipmentStatusBadge status={shipment.status} />
        </td>

        {/* Vendor */}
        <td className="px-4 py-3">
          <span className="text-sm font-medium text-foreground">{shipment.vendorName}</span>
        </td>

        {/* Expected */}
        <td className="px-4 py-3">
          <span className="text-xs text-muted-foreground">{dateLabel(shipment.expectedDeliveryDate)}</span>
        </td>

        {/* Items */}
        <td className="px-4 py-3 text-center">
          <span className="text-xs text-muted-foreground">{shipment.lineItems.length}</span>
        </td>

        {/* Value */}
        <td className="px-4 py-3 text-right">
          <span className="font-mono text-xs font-medium text-foreground">{fmt(shipment.totalCost)}</span>
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            {(shipment.status === "in_transit" || shipment.status === "confirmed") && (
              <button
                disabled={saving}
                onClick={() => patchStatus("delivered")}
                className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="h-3 w-3" />
                Received
              </button>
            )}
            {shipment.status === "pending" && (
              <button
                disabled={saving}
                onClick={() => patchStatus("confirmed")}
                className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                Confirm
              </button>
            )}
            {isMutable && (
              <div className="relative">
                <button
                  className="flex h-6 w-6 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-7 z-20 min-w-[130px] rounded-lg border border-border bg-card py-1 shadow-lg">
                      <button
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted"
                        onClick={() => { setMenuOpen(false); setModifyOpen(true) }}
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                        Edit order
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                        onClick={() => { setMenuOpen(false); setCancelOpen(true) }}
                      >
                        <XCircle className="h-3 w-3" />
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            <button
              className="flex h-6 w-6 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded
                ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded line items */}
      {expanded && (
        <tr className="border-b border-border bg-muted/20">
          <td colSpan={7} className="px-4 py-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="pb-1.5 text-left font-medium">Product</th>
                  <th className="pb-1.5 text-right font-medium pr-3">Qty</th>
                  <th className="pb-1.5 text-right font-medium pr-3">Unit</th>
                  <th className="pb-1.5 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shipment.lineItems.map((li) => (
                  <tr key={li.id}>
                    <td className="py-1 font-medium text-foreground">{li.itemName}</td>
                    <td className="py-1 text-right pr-3 font-mono text-muted-foreground">{li.quantityOrdered}</td>
                    <td className="py-1 text-right pr-3 font-mono text-muted-foreground">{fmt(li.unitCost)}</td>
                    <td className="py-1 text-right font-mono font-medium text-foreground">{fmt(li.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td colSpan={3} className="pt-1.5 text-muted-foreground">Total</td>
                  <td className="pt-1.5 text-right font-semibold font-mono text-foreground">{fmt(shipment.totalCost)}</td>
                </tr>
              </tfoot>
            </table>
            {shipment.notes && (
              <p className="mt-2 border-l-2 border-muted pl-2 text-[10px] italic text-muted-foreground">
                {shipment.notes}
              </p>
            )}
          </td>
        </tr>
      )}

      <ModifySheet
        open={modifyOpen}
        shipment={shipment}
        onClose={() => setModifyOpen(false)}
        onSave={handleSaveModify}
        saving={saving}
      />
      <CancelDialog
        open={cancelOpen}
        vendorName={shipment.vendorName}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
        saving={saving}
      />
    </>
  )
}

export function ShipmentTable({ initialShipments }: { initialShipments: Shipment[] }) {
  const [shipments, setShipments] = useState(initialShipments)
  const [showCancelled, setShowCancelled] = useState(false)

  function handleUpdate(updated: Shipment) {
    setShipments((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }

  const active    = shipments.filter((s) => s.status !== "cancelled")
  const cancelled = shipments.filter((s) => s.status === "cancelled")

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Tracking ID
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Vendor
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Expected
              </th>
              <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Items
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Value
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {active.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No incoming shipments this week.
                </td>
              </tr>
            ) : (
              active.map((s) => (
                <ShipmentRow key={s.id} shipment={s} onUpdate={handleUpdate} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cancelled toggle */}
      {cancelled.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <button
            onClick={() => setShowCancelled((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            {showCancelled ? "Hide" : "Show"} {cancelled.length} cancelled order{cancelled.length !== 1 ? "s" : ""}
          </button>
          {showCancelled && (
            <table className="mt-3 w-full">
              <tbody>
                {cancelled.map((s) => (
                  <ShipmentRow key={s.id} shipment={s} onUpdate={handleUpdate} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="border-t border-border px-4 py-2">
        <p className="text-[10px] text-muted-foreground">
          {active.length} active shipment{active.length !== 1 ? "s" : ""} this week
        </p>
      </div>
    </div>
  )
}
