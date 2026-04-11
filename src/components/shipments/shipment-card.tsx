"use client"

import { useState } from "react"
import { ExternalLink, ChevronDown, ChevronUp, MoreHorizontal, CheckCircle2, Pencil, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShipmentStatusBadge } from "./shipment-status-badge"
import { ModifySheet } from "./modify-sheet"
import { CancelDialog } from "./cancel-dialog"
import type { Shipment } from "@/lib/types"

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2 }).format(n)
}

interface ShipmentCardProps {
  shipment: Shipment
  onUpdate: (updated: Shipment) => void
}

export function ShipmentCard({ shipment: initial, onUpdate }: ShipmentCardProps) {
  const [shipment, setShipment] = useState<Shipment>(initial)
  const [expanded, setExpanded]       = useState(false)
  const [menuOpen, setMenuOpen]       = useState(false)
  const [modifyOpen, setModifyOpen]   = useState(false)
  const [cancelOpen, setCancelOpen]   = useState(false)
  const [saving, setSaving]           = useState(false)

  const isMutable = shipment.status !== "delivered" && shipment.status !== "cancelled"

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

  async function handleSaveModify(lineItems: { id: string; quantityOrdered: number }[], notes: string) {
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

  const borderAccent =
    shipment.status === "in_transit" ? "border-l-amber-400" :
    shipment.status === "delivered"  ? "border-l-green-400" :
    shipment.status === "cancelled"  ? "border-l-red-300"   :
    shipment.status === "confirmed"  ? "border-l-blue-400"  :
    "border-l-zinc-300"

  return (
    <>
      <Card className={`border-l-4 ${borderAccent} ${shipment.status === "cancelled" ? "opacity-60" : ""}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            {/* Left: vendor + badge */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm">{shipment.vendorName}</span>
                <ShipmentStatusBadge status={shipment.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {shipment.lineItems.length} item{shipment.lineItems.length !== 1 ? "s" : ""}
                &nbsp;·&nbsp;
                <span className="font-medium text-foreground">{fmt(shipment.totalCost)}</span>
                &nbsp;·&nbsp;Ordered {new Date(shipment.orderedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
              </p>
              {/* Tracking link */}
              {shipment.trackingNumber && shipment.trackingUrl && (
                <a
                  href={shipment.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  Track: {shipment.trackingNumber}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Mark received */}
              {(shipment.status === "in_transit" || shipment.status === "confirmed") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-green-700 hover:bg-green-50"
                  disabled={saving}
                  onClick={() => patchStatus("delivered")}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Mark Received
                </Button>
              )}

              {/* Confirm pending */}
              {shipment.status === "pending" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-blue-700 hover:bg-blue-50"
                  disabled={saving}
                  onClick={() => patchStatus("confirmed")}
                >
                  Confirm Order
                </Button>
              )}

              {/* More menu */}
              {isMutable && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setMenuOpen((v) => !v)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 top-8 z-20 min-w-[140px] rounded-lg border bg-white py-1 shadow-lg">
                        <button
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted"
                          onClick={() => { setMenuOpen(false); setModifyOpen(true) }}
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          Edit order
                        </button>
                        <button
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                          onClick={() => { setMenuOpen(false); setCancelOpen(true) }}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Expand toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded
                  ? <ChevronUp className="h-4 w-4" />
                  : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="pt-0 space-y-3">
            {/* Line items table */}
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <th className="py-2 pl-3 text-left font-medium">Product</th>
                    <th className="py-2 text-right font-medium pr-3">Qty</th>
                    <th className="py-2 text-right font-medium pr-3">Unit Price</th>
                    <th className="py-2 text-right font-medium pr-3">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {shipment.lineItems.map((li, i) => (
                    <tr key={li.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                      <td className="py-2 pl-3 font-medium">{li.itemName}</td>
                      <td className="py-2 text-right pr-3 font-mono text-muted-foreground">{li.quantityOrdered}</td>
                      <td className="py-2 text-right pr-3 font-mono text-muted-foreground">{fmt(li.unitCost)}</td>
                      <td className="py-2 text-right pr-3 font-mono font-medium">{fmt(li.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30">
                    <td colSpan={3} className="py-2 pl-3 text-xs text-muted-foreground font-medium">Total</td>
                    <td className="py-2 pr-3 text-right font-semibold font-mono">{fmt(shipment.totalCost)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Notes */}
            {shipment.notes && (
              <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
                {shipment.notes}
              </p>
            )}
          </CardContent>
        )}
      </Card>

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
