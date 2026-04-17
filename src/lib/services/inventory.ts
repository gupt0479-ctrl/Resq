import type { InventoryItem, InventoryAlert } from "@/lib/types"

const EXPIRY_WARNING_DAYS = 30

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export function getLowStockItems(items: InventoryItem[]): InventoryItem[] {
  return items.filter((item) => item.quantityOnHand <= item.reorderLevel)
}

export function getExpiringItems(
  items: InventoryItem[],
  withinDays: number = EXPIRY_WARNING_DAYS,
  now: Date = new Date()
): InventoryItem[] {
  return items.filter((item) => {
    if (!item.expiresAt) return false
    const daysUntilExpiry = daysBetween(now, new Date(item.expiresAt))
    return daysUntilExpiry > 0 && daysUntilExpiry <= withinDays
  })
}

export function getExpiredItems(
  items: InventoryItem[],
  now: Date = new Date()
): InventoryItem[] {
  return items.filter((item) => {
    if (!item.expiresAt) return false
    const daysUntilExpiry = daysBetween(now, new Date(item.expiresAt))
    return daysUntilExpiry <= 0
  })
}

export function getIssueItems(items: InventoryItem[]): InventoryItem[] {
  return items.filter((item) => item.issueStatus !== "none")
}

export function getPriceSpikeItems(items: InventoryItem[]): InventoryItem[] {
  return items.filter((item) => item.priceTrendStatus === "spike")
}

export function getAlerts(
  items: InventoryItem[],
  now: Date = new Date()
): InventoryAlert[] {
  const alerts: InventoryAlert[] = []

  for (const item of items) {
    // Low stock / out of stock
    if (item.quantityOnHand === 0) {
      alerts.push({
        id: `alert-oos-${item.id}`,
        itemId: item.id,
        itemName: item.itemName,
        alertType: "low_stock",
        message: `Out of stock — reorder from ${item.vendorName} (reorder level: ${item.reorderLevel})`,
        severity: "critical",
      })
    } else if (item.quantityOnHand <= item.reorderLevel) {
      alerts.push({
        id: `alert-low-${item.id}`,
        itemId: item.id,
        itemName: item.itemName,
        alertType: "low_stock",
        message: `Only ${item.quantityOnHand} left — reorder level is ${item.reorderLevel}`,
        severity: "warning",
      })
    }

    // Expiry
    if (item.expiresAt) {
      const daysUntil = daysBetween(now, new Date(item.expiresAt))
      if (daysUntil <= 0) {
        alerts.push({
          id: `alert-exp-${item.id}`,
          itemId: item.id,
          itemName: item.itemName,
          alertType: "expiry_soon",
          message: "Expired",
          severity: "critical",
        })
      } else if (daysUntil <= EXPIRY_WARNING_DAYS) {
        alerts.push({
          id: `alert-exp-${item.id}`,
          itemId: item.id,
          itemName: item.itemName,
          alertType: "expiry_soon",
          message:
            daysUntil === 0
              ? "Expires today"
              : `Expires in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
          severity: daysUntil <= 7 ? "critical" : "warning",
        })
      }
    }

    // Equipment / quality issues
    if (item.issueStatus !== "none") {
      const label: Record<Exclude<typeof item.issueStatus, "none">, string> = {
        equipment_issue: "Equipment issue reported",
        quality_concern: "Quality concern flagged",
        discontinued: "Item discontinued by vendor",
      }
      alerts.push({
        id: `alert-issue-${item.id}`,
        itemId: item.id,
        itemName: item.itemName,
        alertType: "equipment_issue",
        message: label[item.issueStatus as Exclude<typeof item.issueStatus, "none">],
        severity: item.issueStatus === "discontinued" ? "warning" : "critical",
      })
    }

    // Price spike
    if (item.priceTrendStatus === "spike") {
      alerts.push({
        id: `alert-price-${item.id}`,
        itemId: item.id,
        itemName: item.itemName,
        alertType: "price_increase",
        message: `Significant price increase detected from ${item.vendorName}`,
        severity: "warning",
      })
    }
  }

  return alerts
}

export function getAlertSummary(items: InventoryItem[], now: Date = new Date()) {
  return {
    totalItems: items.length,
    lowStockCount: getLowStockItems(items).length,
    expiringCount: getExpiringItems(items, EXPIRY_WARNING_DAYS, now).length,
    expiredCount: getExpiredItems(items, now).length,
    issueCount: getIssueItems(items).length,
    priceSpikeCount: getPriceSpikeItems(items).length,
    totalAlerts: getAlerts(items, now).length,
  }
}
