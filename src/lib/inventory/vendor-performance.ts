import type { Shipment, VendorPerformanceStat, InventoryItem } from "@/lib/types"

/**
 * Compute per-vendor delivery performance from historical shipment records.
 * Only delivered shipments with both expectedDeliveryDate and actualDeliveryDate
 * are included in the stats.
 */
export function computeVendorPerformance(
  shipments: Shipment[],
  inventoryItems: InventoryItem[]
): VendorPerformanceStat[] {
  // Build a set of vendors that have price increases
  const vendorsWithPriceIncrease = new Set(
    inventoryItems
      .filter((i) => i.priceTrendStatus === "rising" || i.priceTrendStatus === "spike")
      .map((i) => i.vendorName)
  )

  // Group completed deliveries by vendor
  const delivered = shipments.filter(
    (s) => s.status === "delivered" && s.actualDeliveryDate !== null
  )

  const byVendor = new Map<string, Shipment[]>()
  for (const s of delivered) {
    const list = byVendor.get(s.vendorName) ?? []
    byVendor.set(s.vendorName, [...list, s])
  }

  return Array.from(byVendor.entries()).map(([vendorName, orders]) => {
    let onTimeCount = 0
    let earlyCount  = 0
    let lateCount   = 0
    let totalLateDays = 0
    let maxDaysLate   = 0

    for (const s of orders) {
      const expected = new Date(s.expectedDeliveryDate).getTime()
      const actual   = new Date(s.actualDeliveryDate!).getTime()
      const diffDays = Math.round((actual - expected) / (1000 * 60 * 60 * 24))

      if (diffDays < 0)       earlyCount++
      else if (diffDays === 0) onTimeCount++
      else {
        lateCount++
        totalLateDays += diffDays
        if (diffDays > maxDaysLate) maxDaysLate = diffDays
      }
    }

    const totalDeliveries = orders.length
    const onTimePct = Math.round(((onTimeCount + earlyCount) / totalDeliveries) * 100)
    const avgDaysLate = lateCount > 0 ? Math.round((totalLateDays / lateCount) * 10) / 10 : 0
    const totalSpend30d = orders.reduce((sum, s) => sum + s.totalCost, 0)
    const hasPriceIncrease = vendorsWithPriceIncrease.has(vendorName)

    // Negotiation priority: high if late >30% or price spike; medium if late >10% or price rising
    const latePct = lateCount / totalDeliveries
    const negotiationPriority: VendorPerformanceStat["negotiationPriority"] =
      latePct > 0.3 || (hasPriceIncrease && lateCount > 0)
        ? "high"
        : latePct > 0.1 || hasPriceIncrease
          ? "medium"
          : "low"

    return {
      vendorName,
      totalDeliveries,
      onTimeCount,
      earlyCount,
      lateCount,
      onTimePct,
      avgDaysLate,
      maxDaysLate,
      totalSpend30d: Math.round(totalSpend30d * 100) / 100,
      hasPriceIncrease,
      negotiationPriority,
    }
  }).sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.negotiationPriority] - order[b.negotiationPriority]
  })
}
