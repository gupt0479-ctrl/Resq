import type { InventoryItem, MenuItemInventoryUsage, Reservation } from "@/lib/types"

export type DailyUsageRow = {
  date: string        // YYYY-MM-DD
  unitsUsed: number
  ordersCount: number // number of times this item appeared in dishes that day
}

export type DemandFeatures = {
  itemId: string
  // rolling averages of daily usage
  rollingAvg7: number
  rollingAvg14: number
  rollingAvg30: number
  // lag values
  usageLag7: number
  usageLag14: number
  // upcoming bookings (next 7 days)
  upcomingReservations7d: number
  upcomingOrders7d: number    // how many dish orders will consume this item
}

/**
 * Compute daily usage for one item over a date range using past reservations.
 */
export function computeDailyUsage(
  itemId: string,
  reservations: Reservation[],
  usages: MenuItemInventoryUsage[]
): DailyUsageRow[] {
  // Build a map: menuItemId → unitsUsedPerOrder for this item
  const usageMap = new Map<string, number>()
  for (const u of usages) {
    if (u.itemId === itemId) {
      usageMap.set(u.menuItemId, u.unitsUsedPerOrder)
    }
  }

  // Accumulate usage per date
  const byDate = new Map<string, { units: number; orders: number }>()

  for (const res of reservations) {
    let unitsForReservation = 0
    let ordersForReservation = 0

    for (const menuItemId of res.menuItemIds) {
      const units = usageMap.get(menuItemId)
      if (units !== undefined) {
        unitsForReservation += units
        ordersForReservation += 1
      }
    }

    if (unitsForReservation > 0) {
      const existing = byDate.get(res.date) ?? { units: 0, orders: 0 }
      byDate.set(res.date, {
        units: existing.units + unitsForReservation,
        orders: existing.orders + ordersForReservation,
      })
    }
  }

  return Array.from(byDate.entries())
    .map(([date, { units, orders }]) => ({ date, unitsUsed: units, ordersCount: orders }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Rolling average of `unitsUsed` over the last N days before `beforeDate`.
 */
function rollingAvg(rows: DailyUsageRow[], beforeDate: string, days: number): number {
  const cutoff = new Date(beforeDate)
  const start = new Date(cutoff)
  start.setDate(start.getDate() - days)

  const window = rows.filter((r) => {
    const d = new Date(r.date)
    return d >= start && d < cutoff
  })

  if (window.length === 0) return 0
  return window.reduce((sum, r) => sum + r.unitsUsed, 0) / days
}

/**
 * Lag value: total usage in the 7-day window starting lagDays ago.
 */
function lagValue(rows: DailyUsageRow[], beforeDate: string, lagDays: number): number {
  const cutoff = new Date(beforeDate)
  const end = new Date(cutoff)
  end.setDate(end.getDate() - lagDays + 7)
  const start = new Date(cutoff)
  start.setDate(start.getDate() - lagDays)

  return rows
    .filter((r) => {
      const d = new Date(r.date)
      return d >= start && d < end
    })
    .reduce((sum, r) => sum + r.unitsUsed, 0)
}

/**
 * Count upcoming reservations and item-touching orders in the next `days` days from `fromDate`.
 */
function upcomingDemand(
  itemId: string,
  reservations: Reservation[],
  usages: MenuItemInventoryUsage[],
  fromDate: string,
  days: number
): { reservations7d: number; orders7d: number } {
  const usageMap = new Map<string, number>()
  for (const u of usages) {
    if (u.itemId === itemId) usageMap.set(u.menuItemId, u.unitsUsedPerOrder)
  }

  const from = new Date(fromDate)
  const to = new Date(fromDate)
  to.setDate(to.getDate() + days)

  let reservationCount = 0
  let orderCount = 0

  for (const res of reservations) {
    const d = new Date(res.date)
    if (d >= from && d < to) {
      const touches = res.menuItemIds.some((id) => usageMap.has(id))
      if (touches) {
        reservationCount += 1
        orderCount += res.menuItemIds.filter((id) => usageMap.has(id)).length
      }
    }
  }

  return { reservations7d: reservationCount, orders7d: orderCount }
}

/**
 * Build all demand features for one item as of `asOfDate`.
 */
export function buildDemandFeatures(
  item: InventoryItem,
  reservations: Reservation[],
  usages: MenuItemInventoryUsage[],
  asOfDate: string
): DemandFeatures {
  const dailyUsage = computeDailyUsage(item.id, reservations, usages)

  const upcoming = upcomingDemand(item.id, reservations, usages, asOfDate, 7)

  return {
    itemId: item.id,
    rollingAvg7: rollingAvg(dailyUsage, asOfDate, 7),
    rollingAvg14: rollingAvg(dailyUsage, asOfDate, 14),
    rollingAvg30: rollingAvg(dailyUsage, asOfDate, 30),
    usageLag7: lagValue(dailyUsage, asOfDate, 7),
    usageLag14: lagValue(dailyUsage, asOfDate, 14),
    upcomingReservations7d: upcoming.reservations7d,
    upcomingOrders7d: upcoming.orders7d,
  }
}
