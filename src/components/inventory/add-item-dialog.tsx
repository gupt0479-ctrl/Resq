"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type AddItemDialogProps = {
  itemOptions: string[]
  itemDefaults: Array<{ itemName: string; category: string; unitCost: number }>
  vendorOptions: string[]
  categoryOptions: string[]
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
      {children}
    </label>
  )
}

export function AddItemDialog({
  itemOptions,
  itemDefaults,
  vendorOptions,
  categoryOptions,
}: AddItemDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    itemName: "",
    category: "",
    quantityOnHand: "0",
    reorderLevel: "0",
    unitCost: "",
    vendorName: "",
    expiresAt: "",
  })

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleItemNameChange(value: string) {
    const normalized = value.trim().toLowerCase()
    const matched = itemDefaults.find(
      (entry) => entry.itemName.trim().toLowerCase() === normalized
    )

    setForm((f) => ({
      ...f,
      itemName: value,
      category: matched ? matched.category : f.category,
      unitCost: matched ? String(matched.unitCost) : f.unitCost,
    }))
  }

  function resetAndClose() {
    setOpen(false)
    setError(null)
    setForm({
      itemName: "",
      category: "",
      quantityOnHand: "0",
      reorderLevel: "0",
      unitCost: "",
      vendorName: "",
      expiresAt: "",
    })
  }

  async function handleCreate() {
    const itemName = form.itemName.trim()
    const category = form.category.trim()
    const vendorName = form.vendorName.trim()
    const unitCost = Number(form.unitCost)
    const quantityOnHand = Number(form.quantityOnHand)
    const reorderLevel = Number(form.reorderLevel)

    if (!itemName) {
      setError("Item name is required.")
      return
    }
    if (!category) {
      setError("Category is required.")
      return
    }
    if (Number.isNaN(unitCost) || unitCost < 0) {
      setError("Unit cost must be a non-negative number.")
      return
    }
    if (Number.isNaN(quantityOnHand) || quantityOnHand < 0) {
      setError("In stock must be a non-negative number.")
      return
    }
    if (Number.isNaN(reorderLevel) || reorderLevel < 0) {
      setError("Reorder level must be a non-negative number.")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_name: itemName,
          category,
          unit_cost: unitCost,
          quantity_on_hand: quantityOnHand,
          reorder_level: reorderLevel,
          previous_unit_cost: null,
          vendor_name: vendorName || undefined,
          expires_at: form.expiresAt || null,
          issue_status: "none",
          price_trend_status: "stable",
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`)
      }

      resetAndClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create inventory item.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="sm" className="h-8 gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Add items
      </Button>

      <Dialog open={open} onClose={resetAndClose}>
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="new-item-name">Item Name</Label>
              <Input
                id="new-item-name"
                list="inventory-item-options"
                placeholder="Select existing or type a new item"
                value={form.itemName}
                onChange={(e) => handleItemNameChange(e.target.value)}
              />
              <datalist id="inventory-item-options">
                {itemOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-item-category">Category</Label>
              <Input
                id="new-item-category"
                list="inventory-category-options"
                placeholder="e.g. Produce"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              />
              <datalist id="inventory-category-options">
                {categoryOptions.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-item-vendor">Vendor Name</Label>
              <Input
                id="new-item-vendor"
                list="inventory-vendor-options"
                placeholder="Select existing or type a new vendor"
                value={form.vendorName}
                onChange={(e) => set("vendorName", e.target.value)}
              />
              <datalist id="inventory-vendor-options">
                {vendorOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-item-stock">In Stock</Label>
              <Input
                id="new-item-stock"
                type="number"
                min={0}
                step={1}
                value={form.quantityOnHand}
                onChange={(e) => set("quantityOnHand", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-item-reorder">Reorder At</Label>
              <Input
                id="new-item-reorder"
                type="number"
                min={0}
                step={1}
                value={form.reorderLevel}
                onChange={(e) => set("reorderLevel", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-item-unit-cost">Unit Cost ($)</Label>
              <Input
                id="new-item-unit-cost"
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={form.unitCost}
                onChange={(e) => set("unitCost", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-item-expires-at">Expiry Date</Label>
              <Input
                id="new-item-expires-at"
                type="date"
                value={form.expiresAt}
                onChange={(e) => set("expiresAt", e.target.value)}
              />
            </div>

            {error ? <p className="col-span-2 text-sm text-red-600">{error}</p> : null}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "Adding…" : "Add Item"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
