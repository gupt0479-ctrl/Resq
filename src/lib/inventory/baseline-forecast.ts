import type { DemandFeatures } from "./feature-engineering"

export type ForecastResult = {
  predictedUsage7d: number
  predictedUsage14d: number
  predictedDailyUsage: number
  modelName: string
  modelVersion: string
}

/**
 * Weighted baseline forecast.
 *
 * Base usage is a weighted blend of rolling averages and lag values.
 * A booking-delta multiplier adjusts for above/below-average upcoming demand.
 *
 * Weights are intentionally conservative — this is a V1 heuristic, not a
 * trained model. The AI explanation layer communicates uncertainty.
 */
export function baselineForecast(features: DemandFeatures): ForecastResult {
  const { rollingAvg7, rollingAvg14, rollingAvg30, usageLag7, upcomingOrders7d } = features

  // Blend historical signal — heavier weight on shorter-term
  const baseDaily =
    0.45 * rollingAvg7 +
    0.30 * rollingAvg14 +
    0.15 * rollingAvg30 +
    0.10 * (usageLag7 / 7)

  // Booking uplift: if upcoming orders are above the 7-day rolling average of
  // orders, scale usage up proportionally (capped at ±40 %).
  const avgDailyOrders = Math.max(features.upcomingOrders7d / 7, 0.1)
  const historicalAvgDailyOrders = Math.max(rollingAvg7, 0.1)
  const bookingDelta = (avgDailyOrders - historicalAvgDailyOrders) / historicalAvgDailyOrders
  const bookingMultiplier = Math.min(Math.max(1 + bookingDelta * 0.35, 0.6), 1.4)

  const predictedDailyUsage = Math.max(baseDaily * bookingMultiplier, 0)
  const predictedUsage7d = predictedDailyUsage * 7
  const predictedUsage14d = predictedDailyUsage * 14

  return {
    predictedUsage7d,
    predictedUsage14d,
    predictedDailyUsage,
    modelName: "weighted-baseline",
    modelVersion: "v1",
  }
}
