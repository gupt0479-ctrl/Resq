"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Shipment } from "@/lib/types"

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n)
}

interface ModifySheetProps {
  open: boolean
  shipment: Shipment
  onClose: () => void
  onSave: (lineItems: { id: string; quantityOrdered: number }[], notes: string) => void
  saving: boolean
}

export function ModifySheet({ open, shipment, onClose, onSave, saving }: ModifySheetProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(shipment.lineItems.map((li) => [li.id, li.quantityOrdered]))
  )
  const [notes, setNotes] = useState(shipment.notes ?? "")

  function lineTotal(liId: string, unitCost: number) {
    return Math.round((quantities[liId] ?? 0) * unitCost * 100) / 100
  }

  const newTotal = shipment.lineItems.reduce(
    (sum, li) => sum + lineTotal(li.id, li.unitCost), 0
  )

  function handleSave() {
    const patches = shipment.lineItems.map((li) => ({
      id: li.id,
      quantityOrdered: quantities[li.id] ?? li.quantityOrdered,
    }))
    onSave(patches, notes)
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full p-0 sm:max-w-2xl">
        <div className="flex h-full min-h-0 flex-col">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle className="text-xl">Edit Order — {shipment.vendorName}</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Adjust quantities and add notes before confirming.
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              {/* Line items */}
              <div className="space-y-3">
                {shipment.lineItems.map((li) => (
                  <div
                    key={li.id}
                    className="grid grid-cols-[1fr_150px_140px] items-center gap-3 rounded-xl border border-border px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-lg font-medium">{li.itemName}</p>
                      <p className="text-sm text-muted-foreground">{fmt(li.unitCost)} / unit</p>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      value={quantities[li.id] ?? li.quantityOrdered}
                      onChange={(e) =>
                        setQuantities((q) => ({
                          ...q,
                          [li.id]: Math.max(0, Number(e.target.value)),
                        }))
                      }
                      className="h-12 text-center text-lg font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="text-right text-xl font-mono text-muted-foreground">
                      {fmt(lineTotal(li.id, li.unitCost))}
                    </span>
                  </div>
                ))}
              </div>

              {/* New total */}
              <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3 text-lg font-semibold">
                <span>New Total</span>
                <span className="font-mono">{fmt(newTotal)}</span>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Notes for vendor
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Delivery instructions, substitution notes…"
                  rows={4}
                  className="text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t px-6 py-4">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
