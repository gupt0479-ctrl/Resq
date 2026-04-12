"use client"

import { useState } from "react"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { InventoryItem } from "@/lib/types"

interface EditItemDialogProps {
  item: InventoryItem
  open: boolean
  onClose: () => void
  onSaved: (updated: InventoryItem) => void
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
      {children}
    </label>
  )
}

function SelectField({
  id,
  value,
  onChange,
  options,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

export function EditItemDialog({ item, open, onClose, onSaved }: EditItemDialogProps) {
  const [form, setForm] = useState({
    itemName: item.itemName,
    category: item.category,
    quantityOnHand: item.quantityOnHand,
    reorderLevel: item.reorderLevel,
    unitCost: item.unitCost,
    vendorName: item.vendorName,
    expiresAt: item.expiresAt ? item.expiresAt.slice(0, 10) : "",
    issueStatus: item.issueStatus,
    priceTrendStatus: item.priceTrendStatus,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/inventory/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: form.itemName,
          category: form.category,
          quantityOnHand: Number(form.quantityOnHand),
          reorderLevel: Number(form.reorderLevel),
          unitCost: Number(form.unitCost),
          previousUnitCost: Number(form.unitCost) !== item.unitCost ? item.unitCost : item.previousUnitCost,
          vendorName: form.vendorName,
          expiresAt: form.expiresAt || null,
          issueStatus: form.issueStatus,
          priceTrendStatus: form.priceTrendStatus,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`)
      }
      const { data } = await res.json() as { data: InventoryItem }
      onSaved(data)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Edit Item</DialogTitle>
      </DialogHeader>

      <DialogBody>
        <div className="grid grid-cols-2 gap-4">
          {/* Item Name — full width */}
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="itemName">Item Name</Label>
            <Input
              id="itemName"
              value={form.itemName}
              onChange={(e) => set("itemName", e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            />
          </div>

          {/* Vendor */}
          <div className="space-y-1.5">
            <Label htmlFor="vendorName">Vendor</Label>
            <Input
              id="vendorName"
              value={form.vendorName}
              onChange={(e) => set("vendorName", e.target.value)}
            />
          </div>

          {/* In Stock */}
          <div className="space-y-1.5">
            <Label htmlFor="quantityOnHand">In Stock</Label>
            <Input
              id="quantityOnHand"
              type="number"
              min={0}
              step={1}
              value={form.quantityOnHand}
              onChange={(e) => set("quantityOnHand", Number(e.target.value))}
            />
          </div>

          {/* Reorder Level */}
          <div className="space-y-1.5">
            <Label htmlFor="reorderLevel">Reorder At</Label>
            <Input
              id="reorderLevel"
              type="number"
              min={0}
              step={1}
              value={form.reorderLevel}
              onChange={(e) => set("reorderLevel", Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="unitCost">Unit Cost ($)</Label>
            <Input
              id="unitCost"
              type="number"
              min={0}
              step={0.01}
              value={form.unitCost}
              onChange={(e) => set("unitCost", Number(e.target.value))}
            />
            {Number(form.unitCost) !== item.unitCost && item.unitCost > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">
                  Prev: ${item.unitCost.toFixed(2)}
                </span>
                <span
                  className={`font-semibold ${
                    Number(form.unitCost) > item.unitCost
                      ? "text-red-600"
                      : "text-emerald-600"
                  }`}
                >
                  {Number(form.unitCost) > item.unitCost ? "+" : ""}
                  {(((Number(form.unitCost) - item.unitCost) / item.unitCost) * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          {/* Expires At */}
          <div className="space-y-1.5">
            <Label htmlFor="expiresAt">Expiry Date</Label>
            <Input
              id="expiresAt"
              type="date"
              value={form.expiresAt}
              onChange={(e) => set("expiresAt", e.target.value)}
            />
          </div>

          {/* Price Trend */}
          <div className="space-y-1.5">
            <Label htmlFor="priceTrendStatus">Price Trend</Label>
            <SelectField
              id="priceTrendStatus"
              value={form.priceTrendStatus}
              onChange={(v) => set("priceTrendStatus", v as typeof form.priceTrendStatus)}
              options={[
                { value: "stable", label: "Stable" },
                { value: "rising", label: "Rising" },
                { value: "spike", label: "Spike" },
              ]}
            />
          </div>

          {/* Issue Status */}
          <div className="space-y-1.5">
            <Label htmlFor="issueStatus">Issue Status</Label>
            <SelectField
              id="issueStatus"
              value={form.issueStatus}
              onChange={(v) => set("issueStatus", v as typeof form.issueStatus)}
              options={[
                { value: "none", label: "None" },
                { value: "equipment_issue", label: "Equipment Issue" },
                { value: "quality_concern", label: "Quality Concern" },
                { value: "discontinued", label: "Discontinued" },
              ]}
            />
          </div>

          {error && (
            <p className="col-span-2 text-sm text-red-600">{error}</p>
          )}
        </div>
      </DialogBody>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving…" : "Save Changes"}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
