"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Shipment } from "@/lib/types"

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2 }).format(n)
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
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle>Edit Order — {shipment.vendorName}</SheetTitle>
          <p className="text-xs text-muted-foreground">Adjust quantities and add notes before confirming.</p>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Line items */}
          <div className="space-y-2">
            {shipment.lineItems.map((li) => (
              <div key={li.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{li.itemName}</p>
                  <p className="text-xs text-muted-foreground">{fmt(li.unitCost)} / unit</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
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
                    className="w-20 text-right h-8 text-sm font-mono"
                  />
                  <span className="w-20 text-right text-sm font-mono text-muted-foreground">
                    {fmt(lineTotal(li.id, li.unitCost))}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* New total */}
          <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm font-semibold">
            <span>New Total</span>
            <span className="font-mono">{fmt(newTotal)}</span>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Notes for vendor
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Delivery instructions, substitution notes…"
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
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
