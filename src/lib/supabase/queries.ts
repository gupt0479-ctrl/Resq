import "server-only"
import { db, DEMO_ORG_ID } from "@/lib/db"
import {
  inventoryItems,
  services,
  appointments,
  shipments,
  shipmentLineItems,
  financeTransactions,
  menuItemInventoryUsage,
} from "@/lib/db/schema"
import { eq, and, desc, asc, inArray } from "drizzle-orm"
import type {
  InventoryItem,
  MenuItem,
  MenuItemInventoryUsage,
  HistoricalReservation as Reservation,
  Shipment,
  ShipmentLineItem,
  ShipmentStatus,
  FinanceTransaction,
} from "@/lib/types"

// ── helpers: map snake_case rows → camelCase types ───────────────────────────

function mapInventoryItem(row: {
  id: string
  itemName: string
  category: string
  quantityOnHand: string | null
  reorderLevel: string | null
  unitCost: string | null
  previousUnitCost: string | null
  expiresAt: string | null
  vendorName: string
  issueStatus: string
  priceTrendStatus: string
}): InventoryItem {
  return {
    id: row.id,
    itemName: row.itemName,
    category: row.category,
    quantityOnHand: Number(row.quantityOnHand),
    reorderLevel: Number(row.reorderLevel),
    unitCost: Number(row.unitCost),
    previousUnitCost: row.previousUnitCost != null ? Number(row.previousUnitCost) : undefined,
    expiresAt: row.expiresAt,
    vendorName: row.vendorName,
    issueStatus: row.issueStatus as InventoryItem["issueStatus"],
    priceTrendStatus: row.priceTrendStatus as InventoryItem["priceTrendStatus"],
  }
}

function mapLineItemRow(row: {
  id: string
  itemId: string
  itemName: string
  quantityOrdered: string | null
  unitCost: string | null
  totalCost: string | null
}): ShipmentLineItem {
  return {
    id: row.id,
    itemId: row.itemId,
    itemName: row.itemName,
    quantityOrdered: Number(row.quantityOrdered),
    unitCost: Number(row.unitCost),
    totalCost: Number(row.totalCost),
  }
}

function mapShipmentRow(
  row: {
    id: string
    vendorName: string
    status: string
    expectedDeliveryDate: string
    actualDeliveryDate: string | null
    orderedAt: Date
    trackingNumber: string | null
    trackingUrl: string | null
    notes: string | null
    totalCost: string | null
  },
  lineItems: ShipmentLineItem[]
): Shipment {
  return {
    id: row.id,
    vendorName: row.vendorName,
    status: row.status as ShipmentStatus,
    expectedDeliveryDate: row.expectedDeliveryDate,
    actualDeliveryDate: row.actualDeliveryDate,
    orderedAt: row.orderedAt.toISOString(),
    trackingNumber: row.trackingNumber,
    trackingUrl: row.trackingUrl,
    notes: row.notes,
    totalCost: Number(row.totalCost),
    lineItems,
  }
}

function toISODateOnly(isoOrTimestamp: string | Date): string {
  if (isoOrTimestamp instanceof Date) return isoOrTimestamp.toISOString().slice(0, 10)
  return isoOrTimestamp.slice(0, 10)
}

// ── Inventory items ───────────────────────────────────────────────────────────

export async function getInventoryItems(): Promise<InventoryItem[]> {
  try {
    const rows = await db
      .select()
      .from(inventoryItems)
      .orderBy(asc(inventoryItems.id))
    return rows.map(mapInventoryItem)
  } catch {
    return []
  }
}

export async function getInventoryItemById(id: string): Promise<InventoryItem | null> {
  try {
    const rows = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.id, id))
      .limit(1)
    const row = rows[0] ?? null
    if (!row) return null
    return mapInventoryItem(row)
  } catch {
    return null
  }
}

// ── Menu catalog ──────────────────────────────────────────────────────────────

/** Menu catalog in ledger = `services`. */
export async function getMenuItems(): Promise<MenuItem[]> {
  const rows = await db
    .select({
      id: services.id,
      name: services.name,
      category: services.category,
      pricePerPerson: services.pricePerPerson,
    })
    .from(services)
    .where(
      and(
        eq(services.organizationId, DEMO_ORG_ID),
        eq(services.isActive, true)
      )
    )
    .orderBy(asc(services.name))

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    price: Number(r.pricePerPerson),
  }))
}

/** No usage bridge table in core ledger — empty until modeled. */
export async function getMenuInventoryUsage(): Promise<MenuItemInventoryUsage[]> {
  const rows = await db
    .select()
    .from(menuItemInventoryUsage)
  return rows.map((r) => ({
    menuItemId: r.menuItemId as string,
    itemId: r.itemId as string,
    unitsUsedPerOrder: Number(r.unitsUsedPerOrder),
  }))
}

// ── Reservations ──────────────────────────────────────────────────────────────

/** Demand history from `appointments` (replaces legacy `reservations`). */
export async function getReservations(): Promise<Reservation[]> {
  const rows = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      covers: appointments.covers,
      serviceId: appointments.serviceId,
    })
    .from(appointments)
    .where(eq(appointments.organizationId, DEMO_ORG_ID))
    .orderBy(asc(appointments.startsAt))

  return rows.map((r) => ({
    id: r.id,
    date: toISODateOnly(r.startsAt),
    covers: r.covers,
    menuItemIds: [r.serviceId],
  }))
}

// ── Shipments ─────────────────────────────────────────────────────────────────

/** Fetches all shipments with their line items */
export async function getShipments(): Promise<Shipment[]> {
  try {
    const shipmentRows = await db
      .select()
      .from(shipments)
      .orderBy(desc(shipments.orderedAt))

    if (shipmentRows.length === 0) return []

    const shipmentIds = shipmentRows.map((row) => row.id)
    const lineItemRows = await db
      .select()
      .from(shipmentLineItems)
      .where(inArray(shipmentLineItems.shipmentId, shipmentIds))

    const lineItemsByShipment = new Map<string, ShipmentLineItem[]>()
    for (const lineItem of lineItemRows) {
      const existing = lineItemsByShipment.get(lineItem.shipmentId) ?? []
      existing.push(mapLineItemRow(lineItem))
      lineItemsByShipment.set(lineItem.shipmentId, existing)
    }

    return shipmentRows.map((row) => mapShipmentRow(row, lineItemsByShipment.get(row.id) ?? []))
  } catch {
    return []
  }
}

export async function getShipmentById(id: string): Promise<Shipment | null> {
  try {
    const rows = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, id))
      .limit(1)
    const row = rows[0] ?? null
    if (!row) return null

    const lineItemRows = await db
      .select()
      .from(shipmentLineItems)
      .where(eq(shipmentLineItems.shipmentId, id))
    const lis = lineItemRows.map(mapLineItemRow)
    return mapShipmentRow(row, lis)
  } catch {
    return null
  }
}

// ── Finance transactions ──────────────────────────────────────────────────────

export async function getFinanceTransactions(): Promise<FinanceTransaction[]> {
  try {
    const rows = await db
      .select()
      .from(financeTransactions)
      .orderBy(desc(financeTransactions.occurredAt))
    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      invoiceId: r.invoiceId,
      type: r.type as FinanceTransaction["type"],
      direction: r.direction as FinanceTransaction["direction"],
      category: r.category,
      amount: Number(r.amount),
      occurredAt: r.occurredAt.toISOString(),
      paymentMethod: r.paymentMethod,
      taxRelevant: r.taxRelevant,
      writeoffEligible: r.writeoffEligible,
      notes: r.notes,
    }))
  } catch {
    return []
  }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export type CreateShipmentPayload = {
  vendorName: string
  status: ShipmentStatus
  expectedDeliveryDate: string
  actualDeliveryDate?: string | null
  orderedAt?: string
  trackingNumber?: string | null
  trackingUrl?: string | null
  notes?: string | null
  lineItems: {
    itemName: string
    quantityOrdered: number
    unitCost: number
  }[]
}

export async function createShipment(input: CreateShipmentPayload): Promise<Shipment> {
  const totalCost = Math.round(
    input.lineItems.reduce((sum, li) => sum + li.quantityOrdered * li.unitCost, 0) * 100
  ) / 100

  const shipmentId = crypto.randomUUID()

  await db.insert(shipments).values({
    id: shipmentId,
    vendorName: input.vendorName,
    status: input.status,
    expectedDeliveryDate: input.expectedDeliveryDate,
    actualDeliveryDate: input.actualDeliveryDate ?? null,
    orderedAt: new Date(input.orderedAt ?? new Date().toISOString()),
    trackingNumber: input.trackingNumber ?? null,
    trackingUrl: input.trackingUrl ?? null,
    notes: input.notes ?? null,
    totalCost: String(totalCost),
  })

  if (input.lineItems.length > 0) {
    await db.insert(shipmentLineItems).values(
      input.lineItems.map((li) => ({
        id: crypto.randomUUID(),
        shipmentId,
        itemId: crypto.randomUUID(),
        itemName: li.itemName,
        quantityOrdered: String(li.quantityOrdered),
        unitCost: String(li.unitCost),
        totalCost: String(Math.round(li.quantityOrdered * li.unitCost * 100) / 100),
      }))
    )
  }

  const created = await getShipmentById(shipmentId)
  if (!created) throw new Error("Failed to fetch created shipment")
  return created
}

export type CreateInventoryItemPayload = {
  itemName: string
  category: string
  unitCost: number
  vendorName?: string
  quantityOnHand?: number
  reorderLevel?: number
  previousUnitCost?: number
  expiresAt?: string | null
  issueStatus?: InventoryItem["issueStatus"]
  priceTrendStatus?: InventoryItem["priceTrendStatus"]
}

export type UpdateInventoryItemPayload = {
  itemName: string
  category: string
  unitCost: number
  vendorName?: string
  quantityOnHand?: number
  reorderLevel?: number
  previousUnitCost?: number | null
  expiresAt?: string | null
  issueStatus?: InventoryItem["issueStatus"]
  priceTrendStatus?: InventoryItem["priceTrendStatus"]
}

export async function createInventoryItem(input: CreateInventoryItemPayload): Promise<InventoryItem> {
  const itemId = crypto.randomUUID()

  const [data] = await db
    .insert(inventoryItems)
    .values({
      id: itemId,
      itemName: input.itemName,
      category: input.category,
      unitCost: String(input.unitCost),
      previousUnitCost: input.previousUnitCost != null ? String(input.previousUnitCost) : null,
      vendorName: input.vendorName ?? "Unknown Vendor",
      quantityOnHand: String(input.quantityOnHand ?? 0),
      reorderLevel: String(input.reorderLevel ?? 0),
      expiresAt: input.expiresAt ?? null,
      issueStatus: input.issueStatus ?? "none",
      priceTrendStatus: input.priceTrendStatus ?? "stable",
    })
    .returning()

  return mapInventoryItem(data)
}

export async function updateInventoryItem(
  id: string,
  input: UpdateInventoryItemPayload
): Promise<InventoryItem | null> {
  const rows = await db
    .update(inventoryItems)
    .set({
      itemName: input.itemName,
      category: input.category,
      unitCost: String(input.unitCost),
      vendorName: input.vendorName ?? "Unknown Vendor",
      quantityOnHand: String(input.quantityOnHand ?? 0),
      reorderLevel: String(input.reorderLevel ?? 0),
      previousUnitCost: input.previousUnitCost != null ? String(input.previousUnitCost) : null,
      expiresAt: input.expiresAt ?? null,
      issueStatus: input.issueStatus ?? "none",
      priceTrendStatus: input.priceTrendStatus ?? "stable",
    })
    .where(eq(inventoryItems.id, id))
    .returning()

  const row = rows[0] ?? null
  if (!row) return null
  return mapInventoryItem(row)
}

export async function deleteInventoryItem(id: string): Promise<boolean> {
  const rows = await db
    .delete(inventoryItems)
    .where(eq(inventoryItems.id, id))
    .returning({ id: inventoryItems.id })

  return rows.length > 0
}

export async function cancelShipment(id: string): Promise<void> {
  await db
    .update(shipments)
    .set({ status: "cancelled" })
    .where(eq(shipments.id, id))
}

export async function updateAppointmentStatus(id: string, status: string): Promise<void> {
  await db
    .update(appointments)
    .set({ status })
    .where(eq(appointments.id, id))
}

export async function updateFollowUpStatus(id: string, followUpSent: boolean): Promise<void> {
  await db
    .update(appointments)
    .set({ followUpSent })
    .where(eq(appointments.id, id))
}
