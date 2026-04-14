"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Trash2, Package, ChevronDown, Check, Sparkles } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Shipment, ShipmentStatus, InventoryItem } from "@/lib/types"

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n)
}

// ── New inventory item dialog ─────────────────────────────────────────────────

const CATEGORIES = ["protein", "produce", "dairy", "bakery", "pantry", "other"] as const

interface NewItemDialogProps {
  open: boolean
  prefillName: string
  prefillVendor: string
  onClose: () => void
  onCreated: (item: InventoryItem) => void
}

function NewItemDialog({ open, prefillName, prefillVendor, onClose, onCreated }: NewItemDialogProps) {
  const [itemName, setItemName] = useState(prefillName)
  const [category, setCategory] = useState("other")
  const [unitCost, setUnitCost] = useState("")
  const [vendorName, setVendorName] = useState(prefillVendor)
  const [quantityOnHand, setQuantityOnHand] = useState("")
  const [reorderLevel, setReorderLevel] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync prefill when dialog opens
  useEffect(() => {
    if (open) {
      setItemName(prefillName)
      setVendorName(prefillVendor)
      setError(null)
    }
  }, [open, prefillName, prefillVendor])

  function handleClose() {
    setItemName("")
    setCategory("other")
    setUnitCost("")
    setVendorName("")
    setQuantityOnHand("")
    setReorderLevel("")
    setExpiresAt("")
    setError(null)
    onClose()
  }

  async function handleCreate() {
    setError(null)
    if (!itemName.trim()) { setError("Item name is required."); return }
    if (!unitCost || isNaN(Number(unitCost)) || Number(unitCost) < 0) {
      setError("Unit cost must be a valid number.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: itemName.trim(),
          category,
          unitCost: Number(unitCost),
          vendorName: vendorName.trim() || undefined,
          quantityOnHand: quantityOnHand ? Number(quantityOnHand) : 0,
          reorderLevel: reorderLevel ? Number(reorderLevel) : 0,
          expiresAt: expiresAt || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`)
      onCreated(data.data as InventoryItem)
      handleClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create item.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <DialogTitle>Add new inventory item</DialogTitle>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          This will create a new item in your inventory.
        </p>
      </DialogHeader>

      <DialogBody>
        <div className="space-y-3">
        {/* Name + Category */}
        <div className="grid grid-cols-[1fr_130px] gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/70">
              Item name <span className="text-red-500">*</span>
            </label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Wagyu Ribeye"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/70">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Unit cost + Vendor */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/70">
              Unit cost <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="0.00"
              className="h-9 text-sm font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/70">Vendor</label>
            <Input
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="Prime Provisions"
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* Qty + Reorder level */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/70">
              Qty on hand
              <span className="ml-1 text-[10px] text-muted-foreground font-normal">optional</span>
            </label>
            <Input
              type="number"
              min={0}
              step="0.001"
              value={quantityOnHand}
              onChange={(e) => setQuantityOnHand(e.target.value)}
              placeholder="0"
              className="h-9 text-sm font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/70">
              Reorder level
              <span className="ml-1 text-[10px] text-muted-foreground font-normal">optional</span>
            </label>
            <Input
              type="number"
              min={0}
              step="0.001"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              placeholder="0"
              className="h-9 text-sm font-mono"
            />
          </div>
        </div>

        {/* Expiry */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground/70">
            Expiry date
            <span className="ml-1 text-[10px] text-muted-foreground font-normal">optional</span>
          </label>
          <Input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="h-9 text-sm"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}
        </div>
      </DialogBody>

      <DialogFooter>
        <Button variant="ghost" onClick={handleClose} disabled={saving}>Cancel</Button>
        <Button
          onClick={handleCreate}
          disabled={saving}
          className="bg-violet-600 hover:bg-violet-700 text-white"
        >
          {saving ? "Creating…" : "Create Item"}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// ── Item combobox ─────────────────────────────────────────────────────────────

interface ItemComboboxProps {
  value: string
  onChange: (name: string) => void
  onSelect: (item: InventoryItem) => void
  onAddNew: (name: string) => void
  items: InventoryItem[]
  placeholder: string
}

function ItemCombobox({ value, onChange, onSelect, onAddNew, items, placeholder }: ItemComboboxProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = value.trim()
    ? items.filter((i) => i.itemName.toLowerCase().includes(value.toLowerCase()))
    : items

  const exactMatch = items.some(
    (i) => i.itemName.toLowerCase() === value.trim().toLowerCase()
  )

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-1 pl-1 pr-6"
        />
        <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-white shadow-lg overflow-hidden">
          {filtered.length > 0 && (
            <ul className="max-h-44 overflow-y-auto py-1">
              {filtered.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      onChange(item.itemName)
                      onSelect(item)
                      setOpen(false)
                    }}
                  >
                    {value.toLowerCase() === item.itemName.toLowerCase()
                      ? <Check className="h-3 w-3 text-violet-600 shrink-0" />
                      : <span className="h-3 w-3 shrink-0" />
                    }
                    <span className="flex-1 min-w-0 truncate text-sm">{item.itemName}</span>
                    <span className="text-xs text-muted-foreground font-mono shrink-0">
                      {fmt(item.unitCost)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {filtered.length === 0 && !value.trim() && (
            <p className="px-3 py-3 text-xs text-muted-foreground text-center">No items found</p>
          )}

          {/* Add new item */}
          {value.trim() && !exactMatch && (
            <div className={filtered.length > 0 ? "border-t border-border" : ""}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left bg-violet-50 hover:bg-violet-100 transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault()
                  setOpen(false)
                  onAddNew(value.trim())
                }}
              >
                <Plus className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                <span className="text-sm text-violet-700">
                  Create <span className="font-semibold">"{value.trim()}"</span> in inventory
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type LineItemDraft = {
  key: number
  itemName: string
  quantityOrdered: string
  unitCost: string
}

interface AddShipmentSheetProps {
  open: boolean
  onClose: () => void
  onCreated: (shipment: Shipment) => void
}

export function AddShipmentSheet({ open, onClose, onCreated }: AddShipmentSheetProps) {
  const [vendorName, setVendorName] = useState("")
  const [status, setStatus] = useState<ShipmentStatus>("pending")
  const [expectedDate, setExpectedDate] = useState("")
  const [actualDate, setActualDate] = useState("")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [trackingUrl, setTrackingUrl] = useState("")
  const [notes, setNotes] = useState("")
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([
    { key: 0, itemName: "", quantityOrdered: "", unitCost: "" },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextKey, setNextKey] = useState(1)

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [newItemDialog, setNewItemDialog] = useState<{ open: boolean; prefillName: string }>({
    open: false,
    prefillName: "",
  })
  // Key of the line item row that triggered "add new" — so we can auto-select after creation
  const [pendingLineItemKey, setPendingLineItemKey] = useState<number | null>(null)

  // Fetch inventory items when sheet opens
  useEffect(() => {
    if (!open) return
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((d) => setInventoryItems(d.data ?? []))
      .catch(() => {})
  }, [open])

  function handleAddNewItem(name: string, lineItemKey: number) {
    setPendingLineItemKey(lineItemKey)
    setNewItemDialog({ open: true, prefillName: name })
  }

  function handleNewItemCreated(item: InventoryItem) {
    // Add to local list
    setInventoryItems((prev) => [...prev, item])
    // Auto-select in the row that triggered the dialog
    if (pendingLineItemKey !== null) {
      setLineItems((prev) =>
        prev.map((li) =>
          li.key === pendingLineItemKey
            ? { ...li, itemName: item.itemName, unitCost: String(item.unitCost) }
            : li
        )
      )
      setPendingLineItemKey(null)
    }
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      { key: nextKey, itemName: "", quantityOrdered: "", unitCost: "" },
    ])
    setNextKey((k) => k + 1)
  }

  function removeLineItem(key: number) {
    setLineItems((prev) => prev.filter((li) => li.key !== key))
  }

  function updateLineItem(key: number, field: keyof Omit<LineItemDraft, "key">, value: string) {
    setLineItems((prev) =>
      prev.map((li) => (li.key === key ? { ...li, [field]: value } : li))
    )
  }

  function handleItemSelect(key: number, item: InventoryItem) {
    setLineItems((prev) =>
      prev.map((li) =>
        li.key === key
          ? { ...li, itemName: item.itemName, unitCost: String(item.unitCost) }
          : li
      )
    )
  }

  const total = lineItems.reduce((sum, li) => {
    const qty = parseFloat(li.quantityOrdered) || 0
    const cost = parseFloat(li.unitCost) || 0
    return sum + qty * cost
  }, 0)

  function reset() {
    setVendorName("")
    setStatus("pending")
    setExpectedDate("")
    setActualDate("")
    setTrackingNumber("")
    setTrackingUrl("")
    setNotes("")
    setLineItems([{ key: 0, itemName: "", quantityOrdered: "", unitCost: "" }])
    setNextKey(1)
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit() {
    setError(null)

    if (!vendorName.trim()) { setError("Vendor name is required."); return }
    if (!expectedDate) { setError("Expected delivery date is required."); return }

    const validItems = lineItems.filter((li) => li.itemName.trim())
    if (validItems.length === 0) { setError("At least one line item with a name is required."); return }

    for (const li of validItems) {
      if (!li.quantityOrdered || parseFloat(li.quantityOrdered) <= 0) {
        setError(`Quantity for "${li.itemName}" must be greater than 0.`)
        return
      }
      if (!li.unitCost || parseFloat(li.unitCost) < 0) {
        setError(`Unit cost for "${li.itemName}" must be 0 or more.`)
        return
      }
    }

    setSaving(true)
    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorName: vendorName.trim(),
          status,
          expectedDeliveryDate: expectedDate,
          actualDeliveryDate: actualDate || null,
          trackingNumber: trackingNumber.trim() || null,
          trackingUrl: trackingUrl.trim() || null,
          notes: notes.trim() || null,
          lineItems: validItems.map((li) => ({
            itemName: li.itemName.trim(),
            quantityOrdered: parseFloat(li.quantityOrdered),
            unitCost: parseFloat(li.unitCost),
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`)
      onCreated(data as Shipment)
      reset()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create shipment.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
              <Package className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <SheetTitle className="text-base">New Shipment</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Log an incoming order and its line items
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

          {/* ── Order details ─────────────────────────────────────── */}
          <fieldset className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <legend className="px-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Order Details
            </legend>

            <div className="grid grid-cols-[1fr_140px] gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground/70">
                  Vendor name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="Prime Provisions"
                  className="text-sm h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground/70">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ShipmentStatus)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground/70">
                  Expected delivery <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="text-sm h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground/70">
                  Actual delivery
                  <span className="ml-1 text-[10px] text-muted-foreground font-normal">optional</span>
                </label>
                <Input
                  type="date"
                  value={actualDate}
                  onChange={(e) => setActualDate(e.target.value)}
                  className="text-sm h-9"
                />
              </div>
            </div>
          </fieldset>

          {/* ── Tracking ──────────────────────────────────────────── */}
          <fieldset className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <legend className="px-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Tracking
              <span className="ml-1.5 normal-case font-normal text-muted-foreground/60">optional</span>
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground/70">Tracking number</label>
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="PP-20260415-001"
                  className="text-sm h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground/70">Tracking URL</label>
                <Input
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://…"
                  className="text-sm h-9"
                />
              </div>
            </div>
          </fieldset>

          {/* ── Line items ────────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Line items <span className="text-red-500">*</span>
              </span>
              <button
                type="button"
                onClick={addLineItem}
                className="flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add row
              </button>
            </div>

            {/* Table — no overflow-hidden so combobox dropdown isn't clipped */}
            <div className="rounded-xl border border-border">
              {/* Header */}
              <div className="grid grid-cols-[1fr_72px_88px_32px] rounded-t-xl bg-muted/60 border-b border-border px-3 py-2 gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Item name</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Qty</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Unit cost</span>
                <span />
              </div>

              {/* Rows */}
              <div className="divide-y divide-border">
                {lineItems.map((li, idx) => (
                  <div
                    key={li.key}
                    className="grid grid-cols-[1fr_72px_88px_32px] gap-2 px-3 py-2 items-center"
                  >
                    <ItemCombobox
                      value={li.itemName}
                      onChange={(name) => updateLineItem(li.key, "itemName", name)}
                      onSelect={(item) => handleItemSelect(li.key, item)}
                      onAddNew={(name) => handleAddNewItem(name, li.key)}
                      items={inventoryItems}
                      placeholder={`Item ${idx + 1}`}
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.001"
                      value={li.quantityOrdered}
                      onChange={(e) => updateLineItem(li.key, "quantityOrdered", e.target.value)}
                      placeholder="—"
                      className="h-8 text-sm text-right font-mono border-0 bg-transparent shadow-none focus-visible:ring-1 px-1"
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={li.unitCost}
                      onChange={(e) => updateLineItem(li.key, "unitCost", e.target.value)}
                      placeholder="$0.00"
                      className="h-8 text-sm text-right font-mono border-0 bg-transparent shadow-none focus-visible:ring-1 px-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeLineItem(li.key)}
                      disabled={lineItems.length === 1}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-25 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between rounded-b-xl border-t border-border bg-muted/40 px-3 py-2.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</span>
                <span className="font-mono text-sm font-bold text-foreground">{fmt(total)}</span>
              </div>
            </div>
          </div>

          {/* ── Notes ─────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Notes
              <span className="ml-1.5 normal-case font-normal text-muted-foreground/60">optional</span>
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Delivery instructions, substitution notes…"
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
              <span className="mt-px h-2 w-2 shrink-0 rounded-full bg-red-500" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 flex items-center justify-end gap-2 border-t border-border bg-background px-5 py-4">
          <Button variant="ghost" onClick={handleClose} disabled={saving} className="h-9">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="h-9 bg-violet-600 hover:bg-violet-700 text-white"
          >
            {saving ? "Creating…" : "Create Shipment"}
          </Button>
        </div>
      </SheetContent>

      {/* New inventory item dialog — rendered inside Sheet so it stacks correctly */}
      <NewItemDialog
        open={newItemDialog.open}
        prefillName={newItemDialog.prefillName}
        prefillVendor={vendorName}
        onClose={() => setNewItemDialog({ open: false, prefillName: "" })}
        onCreated={handleNewItemCreated}
      />
    </Sheet>
  )
}
