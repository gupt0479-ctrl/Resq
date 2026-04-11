import type { RiskLevel } from "@/lib/types"

/**
 * Days until stock runs out at the predicted daily burn rate.
 * Uses a floor of 0.01 to avoid division by zero on items with no predicted usage.
 */
export function computeDaysToStockout(
  quantityOnHand: number,
  predictedDailyUsage: number
): number {
  if (predictedDailyUsage <= 0) return 999
  return quantityOnHand / Math.max(predictedDailyUsage, 0.01)
}

/**
 * Safety stock = 1.5× the 7-day rolling average daily usage.
 * Represents a rough buffer to absorb demand variance.
 */
export function computeSafetyStock(rollingAvg7: number): number {
  return Math.ceil(rollingAvg7 * 7 * 1.5)
}

/**
 * Recommended reorder quantity to cover 14 days of predicted usage
 * plus safety stock, minus current stock on hand.
 * Returns 0 if no reorder is needed.
 */
export function computeReorderQty(
  predictedUsage14d: number,
  safetyStock: number,
  quantityOnHand: number
): number {
  const target = predictedUsage14d + safetyStock
  return Math.max(Math.ceil(target - quantityOnHand), 0)
}

/**
 * Risk levels:
 *   high   — stockout within 5 days
 *   medium — stockout within 10 days
 *   low    — more than 10 days of stock
 */
export function assignRiskLevel(daysToStockout: number): RiskLevel {
  if (daysToStockout < 5) return "high"
  if (daysToStockout < 10) return "medium"
  return "low"
}

/**
 * Determine the top demand drivers for this item based on features.
 * Returns up to 3 drivers in descending impact order.
 */
export function computeTopDrivers(features: {
  rollingAvg7: number
  rollingAvg14: number
  upcomingReservations7d: number
  upcomingOrders7d: number
}): { driver: string; impact: "low" | "medium" | "high" }[] {
  const drivers: { driver: string; score: number }[] = []

  // Upcoming bookings signal
  if (features.upcomingReservations7d > 0) {
    const bookingScore = Math.min(features.upcomingReservations7d / 10, 1)
    drivers.push({ driver: "upcoming_reservations", score: bookingScore })
  }

  // Recent usage trend (rolling avg vs 14-day)
  if (features.rollingAvg7 > 0 && features.rollingAvg14 > 0) {
    const trendScore = Math.abs(features.rollingAvg7 - features.rollingAvg14) / Math.max(features.rollingAvg14, 0.01)
    drivers.push({ driver: "recent_usage_trend", score: Math.min(trendScore, 1) })
  }

  // Raw usage level
  if (features.rollingAvg7 > 0) {
    drivers.push({ driver: "baseline_usage_rate", score: Math.min(features.rollingAvg7, 1) })
  }

  drivers.sort((a, b) => b.score - a.score)

  return drivers.slice(0, 3).map((d) => ({
    driver: d.driver,
    impact: d.score > 0.6 ? "high" : d.score > 0.3 ? "medium" : "low",
  }))
}
