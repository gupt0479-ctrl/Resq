import { cacheLife } from "next/cache"
import { supabase } from "./client"
import type {
  InventoryItem,
  MenuItem,
  MenuItemInventoryUsage,
  Reservation,
  Shipment,
  ShipmentLineItem,
} from "@/lib/types"

// ── helpers: map snake_case rows → camelCase types ───────────

function mapInventoryItem(row: Record<string, unknown>): InventoryItem {
  return {
    id: row.id as string,
    itemName: row.item_name as string,
    category: row.category as string,
    quantityOnHand: Number(row.quantity_on_hand),
    reorderLevel: Number(row.reorder_level),
    unitCost: Number(row.unit_cost),
    previousUnitCost: row.previous_unit_cost != null ? Number(row.previous_unit_cost) : undefined,
    expiresAt: row.expires_at as string | null,
    vendorName: row.vendor_name as string,
    issueStatus: row.issue_status as InventoryItem["issueStatus"],
    priceTrendStatus: row.price_trend_status as InventoryItem["priceTrendStatus"],
  }
}

function mapLineItem(row: Record<string, unknown>): ShipmentLineItem {
  return {
    id: row.id as string,
    itemId: row.item_id as string,
    itemName: row.item_name as string,
    quantityOrdered: Number(row.quantity_ordered),
    unitCost: Number(row.unit_cost),
    totalCost: Number(row.total_cost),
  }
}

function mapShipment(row: Record<string, unknown>, lineItems: ShipmentLineItem[]): Shipment {
  return {
    id: row.id as string,
    vendorName: row.vendor_name as string,
    status: row.status as Shipment["status"],
    expectedDeliveryDate: row.expected_delivery_date as string,
    actualDeliveryDate: row.actual_delivery_date as string | null,
    orderedAt: row.ordered_at as string,
    trackingNumber: row.tracking_number as string | null,
    trackingUrl: row.tracking_url as string | null,
    notes: row.notes as string | null,
    totalCost: Number(row.total_cost),
    lineItems,
  }
}

// ── public query functions ────────────────────────────────────

export async function getInventoryItems(): Promise<InventoryItem[]> {
  "use cache"
  cacheLife("seconds") // revalidate every 30 s
  const { data, error } = await supabase
    .from("inventory_items")
    .select(
      "id, item_name, category, quantity_on_hand, reorder_level, unit_cost, previous_unit_cost, expires_at, vendor_name, issue_status, price_trend_status"
    )
    .order("id")
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapInventoryItem(r as Record<string, unknown>))
}

export async function getInventoryItemById(id: string): Promise<InventoryItem | null> {
  const { data, error } = await supabase
    .from("inventory_items")
    .select(
      "id, item_name, category, quantity_on_hand, reorder_level, unit_cost, previous_unit_cost, expires_at, vendor_name, issue_status, price_trend_status"
    )
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return mapInventoryItem(data as Record<string, unknown>)
}

export async function getMenuItems(): Promise<MenuItem[]> {
  "use cache"
  cacheLife("hours")
  const { data, error } = await supabase
    .from("menu_items")
    .select("id, name, category, price")
    .order("id")
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    category: r.category as string,
    price: Number(r.price),
  }))
}

export async function getMenuInventoryUsage(): Promise<MenuItemInventoryUsage[]> {
  "use cache"
  cacheLife("hours")
  const { data, error } = await supabase
    .from("menu_item_inventory_usage")
    .select("menu_item_id, item_id, units_used_per_order")
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => ({
    menuItemId: r.menu_item_id as string,
    itemId: r.item_id as string,
    unitsUsedPerOrder: Number(r.units_used_per_order),
  }))
}

export async function getReservations(): Promise<Reservation[]> {
  "use cache"
  cacheLife("hours")
  const { data, error } = await supabase
    .from("reservations")
    .select("id, date, covers, menu_item_ids")
    .order("date")
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => ({
    id: r.id as string,
    date: r.date as string,
    covers: Number(r.covers),
    menuItemIds: r.menu_item_ids as string[],
  }))
}

/** Fetches all shipments with their line items in a single JOIN query */
export async function getShipments(): Promise<Shipment[]> {
  "use cache"
  cacheLife("seconds")
  const { data, error } = await supabase
    .from("shipments")
    .select(
      "id, vendor_name, status, expected_delivery_date, actual_delivery_date, ordered_at, tracking_number, tracking_url, notes, total_cost, shipment_line_items ( id, item_id, item_name, quantity_ordered, unit_cost, total_cost )"
    )
    .order("ordered_at", { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const lineItems = ((row.shipment_line_items as unknown[]) ?? []).map((li) =>
      mapLineItem(li as Record<string, unknown>)
    )
    return mapShipment(row as Record<string, unknown>, lineItems)
  })
}

export async function getShipmentById(id: string): Promise<Shipment | null> {
  const { data: row, error } = await supabase
    .from("shipments")
    .select(
      "id, vendor_name, status, expected_delivery_date, actual_delivery_date, ordered_at, tracking_number, tracking_url, notes, total_cost, shipment_line_items ( id, item_id, item_name, quantity_ordered, unit_cost, total_cost )"
    )
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!row) return null

  const lineItems = ((row.shipment_line_items as unknown[]) ?? []).map((li) =>
    mapLineItem(li as Record<string, unknown>)
  )
  return mapShipment(row as Record<string, unknown>, lineItems)
}

export async function cancelShipment(id: string): Promise<void> {
  const { error } = await supabase
    .from("shipments")
    .update({ status: "cancelled" })
    .eq("id", id)
  if (error) throw new Error(error.message)
}
