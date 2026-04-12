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

// ── public query functions ────────────────────────────────────

export async function getInventoryItems(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .order("id")
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapInventoryItem(r as Record<string, unknown>))
}

export async function getInventoryItemById(id: string): Promise<InventoryItem | null> {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return mapInventoryItem(data as Record<string, unknown>)
}

export async function getMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
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
  const { data, error } = await supabase
    .from("menu_item_inventory_usage")
    .select("*")
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => ({
    menuItemId: r.menu_item_id as string,
    itemId: r.item_id as string,
    unitsUsedPerOrder: Number(r.units_used_per_order),
  }))
}

export async function getReservations(): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .order("date")
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => ({
    id: r.id as string,
    date: r.date as string,
    covers: Number(r.covers),
    menuItemIds: r.menu_item_ids as string[],
  }))
}

export async function getShipments(): Promise<Shipment[]> {
  const { data: shipmentRows, error: shipErr } = await supabase
    .from("shipments")
    .select("*")
    .order("ordered_at", { ascending: false })
  if (shipErr) throw new Error(shipErr.message)

  const { data: lineRows, error: lineErr } = await supabase
    .from("shipment_line_items")
    .select("*")
  if (lineErr) throw new Error(lineErr.message)

  const linesByShipment = new Map<string, ShipmentLineItem[]>()
  for (const row of lineRows ?? []) {
    const sid = row.shipment_id as string
    if (!linesByShipment.has(sid)) linesByShipment.set(sid, [])
    linesByShipment.get(sid)!.push(mapLineItem(row as Record<string, unknown>))
  }

  return (shipmentRows ?? []).map((row) =>
    mapShipment(row as Record<string, unknown>, linesByShipment.get(row.id as string) ?? [])
  )
}

export async function getShipmentById(id: string): Promise<Shipment | null> {
  const { data: row, error: shipErr } = await supabase
    .from("shipments")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (shipErr) throw new Error(shipErr.message)
  if (!row) return null

  const { data: lineRows, error: lineErr } = await supabase
    .from("shipment_line_items")
    .select("*")
    .eq("shipment_id", id)
  if (lineErr) throw new Error(lineErr.message)

  return mapShipment(
    row as Record<string, unknown>,
    (lineRows ?? []).map((r) => mapLineItem(r as Record<string, unknown>))
  )
}

export async function cancelShipment(id: string): Promise<void> {
  const { error } = await supabase
    .from("shipments")
    .update({ status: "cancelled" })
    .eq("id", id)
  if (error) throw new Error(error.message)
}
