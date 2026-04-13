import "server-only"

import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import type {
  InventoryItem,
  MenuItem,
  MenuItemInventoryUsage,
  HistoricalReservation as Reservation,
  Shipment,
  ShipmentLineItem,
  FinanceTransaction,
} from "@/lib/types"

// ── Ledger-aligned reads (0001_core_ledger.sql) ─────────────────────────────
// Legacy tables (`inventory_items`, `shipments`, `reservations`, …) are not in
// this schema. Procurement is represented by `finance_transactions` rows
// with type = inventory_purchase.

function toISODateOnly(isoOrTimestamp: string): string {
  return isoOrTimestamp.slice(0, 10)
}

function deriveVendorName(notes: string | null, category: string): string {
  if (notes) {
    const parts = notes.split(/[—–\-]/).map((s) => s.trim())
    if (parts.length >= 2 && parts[parts.length - 1]) return parts[parts.length - 1]!
    return notes.length > 48 ? `${notes.slice(0, 45)}…` : notes
  }
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function deriveLineLabel(notes: string | null, category: string): string {
  if (notes) {
    const first = notes.split(/[—–\-]/)[0]?.trim()
    if (first) return first
  }
  return deriveVendorName(notes, category)
}

type FinancePurchaseRow = {
  id: string
  category: string
  amount: string | number
  direction: string
  occurred_at: string
  notes: string | null
  external_ref: string | null
}

function mapFinanceRowToShipment(row: FinancePurchaseRow): Shipment {
  const amount = Math.abs(Number(row.amount))
  const occurredDate = toISODateOnly(row.occurred_at)
  const vendorName = deriveVendorName(row.notes, row.category)
  const lineLabel = deriveLineLabel(row.notes, row.category)
  const status: ShipmentStatus = "delivered"

  const lineItem: ShipmentLineItem = {
    id: `${row.id}-line`,
    itemId: row.category,
    itemName: lineLabel,
    quantityOrdered: 1,
    unitCost: amount,
    totalCost: amount,
  }

  return {
    id: row.id,
    vendorName,
    status,
    expectedDeliveryDate: occurredDate,
    actualDeliveryDate: occurredDate,
    orderedAt: row.occurred_at,
    trackingNumber: row.external_ref,
    trackingUrl: null,
    notes: row.notes,
    totalCost: amount,
    lineItems: [lineItem],
    ledgerBacked: true,
  }
}

/** No `inventory_items` table in core ledger — returns an empty list until a stock model exists. */
export async function getInventoryItems(): Promise<InventoryItem[]> {
  return []
}

export async function getInventoryItemById(id: string): Promise<InventoryItem | null> {
  void id
  return null
}

/** Menu catalog in ledger = `services`. */
export async function getMenuItems(): Promise<MenuItem[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("services")
    .select("id, name, category, price_per_person")
    .eq("organization_id", DEMO_ORG_ID)
    .eq("is_active", true)
    .order("name")
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    category: r.category as string,
    price: Number(r.price_per_person),
  }))
}

/** No usage bridge table in core ledger — empty until modeled. */
export async function getMenuInventoryUsage(): Promise<MenuItemInventoryUsage[]> {
  return []
}

/** Demand history from `appointments` (replaces legacy `reservations`). */
export async function getReservations(): Promise<Reservation[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("appointments")
    .select("id, starts_at, covers, service_id")
    .eq("organization_id", DEMO_ORG_ID)
    .order("starts_at")
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => ({
    id: r.id as string,
    date: toISODateOnly(r.starts_at as string),
    covers: Number(r.covers),
    menuItemIds: [r.service_id as string],
  }))
}

/** Procurement / vendor spend from ledger (`inventory_purchase` outflows). */
export async function getShipments(): Promise<Shipment[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("finance_transactions")
    .select("id, category, amount, direction, occurred_at, notes, external_ref")
    .eq("organization_id", DEMO_ORG_ID)
    .eq("type", "inventory_purchase")
    .order("occurred_at", { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapFinanceRowToShipment(r as FinancePurchaseRow))
}

export async function getShipmentById(id: string): Promise<Shipment | null> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("finance_transactions")
    .select("id, category, amount, direction, occurred_at, notes, external_ref")
    .eq("organization_id", DEMO_ORG_ID)
    .eq("type", "inventory_purchase")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!row) return null

  const lineItems = ((row.shipment_line_items as unknown[]) ?? []).map((li) =>
    mapLineItem(li as Record<string, unknown>)
  )
  return mapShipment(row as Record<string, unknown>, lineItems)
}

export async function getFinanceTransactions(): Promise<FinanceTransaction[]> {
  "use cache"
  cacheLife("seconds")
  const { data, error } = await supabase
    .from("finance_transactions")
    .select("id, type, direction, category, amount, occurred_at, tax_relevant")
    .order("occurred_at", { ascending: false })
  if (error) return []
  return (data ?? []).map((r) => ({
    id: r.id as string,
    type: r.type as FinanceTransaction["type"],
    direction: r.direction as FinanceTransaction["direction"],
    category: r.category as string,
    amount: Number(r.amount),
    occurredAt: r.occurred_at as string,
    taxRelevant: Boolean(r.tax_relevant),
  }))
}

export async function cancelShipment(id: string): Promise<void> {
  const { error } = await supabase
    .from("shipments")
    .update({ status: "cancelled" })
    .eq("id", id)
  if (error) throw new Error(error.message)
}
