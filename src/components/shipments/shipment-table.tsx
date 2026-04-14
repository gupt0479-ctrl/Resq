"use client"

import { useState } from "react"
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Pencil,
  XCircle,
  MoreHorizontal,
  Plus,
} from "lucide-react"
import { ShipmentStatusBadge } from "./shipment-status-badge"
import { ModifySheet } from "./modify-sheet"
import { CancelDialog } from "./cancel-dialog"
import { AddShipmentSheet } from "./add-shipment-sheet"
import type { Shipment } from "@/lib/types"

const TODAY = "2026-04-11"

function dateLabel(isoDate: string): string {
  if (isoDate === TODAY) return "Today"
  const tomorrow = new Date(TODAY)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (isoDate === tomorrow.toISOString().slice(0, 10)) return "Tomorrow"
  return new Date(isoDate).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n)
}

// ── Row — only renders <tr> elements, no portals/dialogs ──────────────────────

type RowAction = "modify" | "cancel" | "confirm" | "receive"

interface ShipmentRowProps {
  shipment: Shipment
  saving: boolean
  onAction: (id: string, action: RowAction) => void
}

function ShipmentRow({ shipment, saving, onAction }: ShipmentRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const isMutable =
    shipment.status !== "delivered" && shipment.status !== "cancelled"
  const isCanc = shipment.status === "cancelled"

  return (
    <>
      <tr
        className={`border-b border-border transition-colors hover:bg-muted/40 ${isCanc ? "opacity-50" : ""}`}
      >
        {/* Tracking ID */}
        <td className="px-4 py-3">
          <div className="space-y-0.5">
            <p className="font-mono text-xs font-medium uppercase text-foreground">
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
          <span className="text-xs text-muted-foreground">
            {dateLabel(shipment.expectedDeliveryDate)}
          </span>
        </td>

        {/* Items */}
        <td className="px-4 py-3 text-center">
          <span className="text-xs text-muted-foreground">{shipment.lineItems.length}</span>
        </td>

        {/* Value */}
        <td className="px-4 py-3 text-right">
          <span className="font-mono text-xs font-medium text-foreground">
            {fmt(shipment.totalCost)}
          </span>
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            {(shipment.status === "in_transit" || shipment.status === "confirmed") && (
              <button
                disabled={saving}
                onClick={() => onAction(shipment.id, "receive")}
                className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
              >
                <CheckCircle2 className="h-3 w-3" />
                Received
              </button>
            )}
            {shipment.status === "pending" && (
              <button
                disabled={saving}
                onClick={() => onAction(shipment.id, "confirm")}
                className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
              >
                Confirm
              </button>
            )}
            {isMutable && (
              <div className="relative">
                <button
                  className="flex h-6 w-6 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted"
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-7 z-20 min-w-[130px] rounded-lg border border-border bg-card py-1 shadow-lg">
                      <button
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted"
                        onClick={() => {
                          setMenuOpen(false)
                          onAction(shipment.id, "modify")
                        }}
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                        Edit order
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setMenuOpen(false)
                          onAction(shipment.id, "cancel")
                        }}
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
              className="flex h-6 w-6 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded line items — still valid inside tbody */}
      {expanded && (
        <tr className="border-b border-border bg-muted/20">
          <td colSpan={7} className="px-4 py-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="pb-1.5 text-left font-medium">Product</th>
                  <th className="pb-1.5 pr-3 text-right font-medium">Qty</th>
                  <th className="pb-1.5 pr-3 text-right font-medium">Unit</th>
                  <th className="pb-1.5 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shipment.lineItems.map((li) => (
                  <tr key={li.id}>
                    <td className="py-1 font-medium text-foreground">{li.itemName}</td>
                    <td className="py-1 pr-3 text-right font-mono text-muted-foreground">
                      {li.quantityOrdered}
                    </td>
                    <td className="py-1 pr-3 text-right font-mono text-muted-foreground">
                      {fmt(li.unitCost)}
                    </td>
                    <td className="py-1 text-right font-mono font-medium text-foreground">
                      {fmt(li.totalCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td colSpan={3} className="pt-1.5 text-muted-foreground">
                    Total
                  </td>
                  <td className="pt-1.5 text-right font-mono font-semibold text-foreground">
                    {fmt(shipment.totalCost)}
                  </td>
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
    </>
  )
}

// ── Table — owns all modal state, renders dialogs outside <table> ─────────────

export function ShipmentTable({ initialShipments }: { initialShipments: Shipment[] }) {
  const [shipments, setShipments] = useState(initialShipments)
  const [showCancelled, setShowCancelled] = useState(false)

  // Modal state lifted here so dialogs render outside <table>/<tbody>
  const [modifyTarget, setModifyTarget] = useState<Shipment | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Shipment | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  function updateShipment(updated: Shipment) {
    setShipments((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }

  async function patchStatus(id: string, status: Shipment["status"]) {
    setSaving(true)
    try {
      const res = await fetch(`/api/shipments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) updateShipment(await res.json())
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel(reason: string) {
    if (!cancelTarget) return
    setSaving(true)
    try {
      const res = await fetch(`/api/shipments/${cancelTarget.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      if (res.ok) updateShipment(await res.json())
    } finally {
      setSaving(false)
      setCancelTarget(null)
    }
  }

  async function handleSaveModify(
    lineItems: { id: string; quantityOrdered: number }[],
    notes: string
  ) {
    if (!modifyTarget) return
    setSaving(true)
    try {
      const res = await fetch(`/api/shipments/${modifyTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItems, notes }),
      })
      if (res.ok) updateShipment(await res.json())
    } finally {
      setSaving(false)
      setModifyTarget(null)
    }
  }

  function handleAction(id: string, action: RowAction) {
    const shipment = shipments.find((s) => s.id === id)
    if (!shipment) return
    if (action === "modify") setModifyTarget(shipment)
    else if (action === "cancel") setCancelTarget(shipment)
    else if (action === "confirm") patchStatus(id, "confirmed")
    else if (action === "receive") patchStatus(id, "delivered")
  }

  function handleShipmentCreated(shipment: Shipment) {
    setShipments((prev) => [shipment, ...prev])
  }

  const active = shipments.filter((s) => s.status !== "cancelled")
  const cancelled = shipments.filter((s) => s.status === "cancelled")

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-end border-b border-border px-4 py-2">
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Plus className="h-3.5 w-3.5" />
          New Shipment
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Tracking ID", "Status", "Vendor", "Expected", "Items", "Value", "Actions"].map(
                (h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ${
                      i === 4 ? "text-center" : i >= 5 ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {active.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  No incoming shipments this week.
                </td>
              </tr>
            ) : (
              active.map((s) => (
                <ShipmentRow
                  key={s.id}
                  shipment={s}
                  saving={saving && (modifyTarget?.id === s.id || cancelTarget?.id === s.id)}
                  onAction={handleAction}
                />
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
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            {showCancelled ? "Hide" : "Show"} {cancelled.length} cancelled order
            {cancelled.length !== 1 ? "s" : ""}
          </button>
          {showCancelled && (
            <table className="mt-3 w-full">
              <tbody>
                {cancelled.map((s) => (
                  <ShipmentRow
                    key={s.id}
                    shipment={s}
                    saving={false}
                    onAction={handleAction}
                  />
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

      {/* Dialogs rendered outside table — no invalid nesting */}
      {modifyTarget && (
        <ModifySheet
          key={modifyTarget.id}
          open
          shipment={modifyTarget}
          onClose={() => setModifyTarget(null)}
          onSave={handleSaveModify}
          saving={saving}
        />
      )}
      {cancelTarget && (
        <CancelDialog
          open
          vendorName={cancelTarget.vendorName}
          onClose={() => setCancelTarget(null)}
          onConfirm={handleCancel}
          saving={saving}
        />
      )}
      <AddShipmentSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={handleShipmentCreated}
      />
    </>
  )
}
