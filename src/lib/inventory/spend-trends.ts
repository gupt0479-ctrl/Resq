import type { Shipment, FinanceTransaction } from "@/lib/types"

export type WeeklySpend = {
  week: string      // display label e.g. "Apr 7"
  weekStart: string // ISO date "YYYY-MM-DD" for sorting
  [vendor: string]: number | string
}

export type SpendTrendsData = {
  weeks: WeeklySpend[]
  vendors: string[]         // top 4 by total spend + "Others" if needed
  totalSpend30d: number
  totalRevenue30d: number
  weekOverWeekPct: number | null
}

/** Monday of the ISO week that contains the given date */
function weekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getUTCDay() // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

function shortLabel(isoDate: string): string {
  const [, m, dd] = isoDate.split("-")
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  return `${months[parseInt(m, 10) - 1]} ${parseInt(dd, 10)}`
}

export function computeSpendTrends(
  shipments: Shipment[],
  transactions: FinanceTransaction[],
  asOfDate: string,
  weeksBack = 8
): SpendTrendsData {
  const active = shipments.filter((s) => s.status !== "cancelled")

  // ── Build the ordered list of week-start dates ──────────────────────────────
  const todayMonday = weekStart(asOfDate)
  const bucketStarts: string[] = []
  for (let i = weeksBack - 1; i >= 0; i--) {
    const d = new Date(todayMonday + "T00:00:00Z")
    d.setUTCDate(d.getUTCDate() - i * 7)
    bucketStarts.push(d.toISOString().slice(0, 10))
  }
  const bucketSet = new Set(bucketStarts)

  // ── Accumulate spend per (weekStart, vendor) ────────────────────────────────
  const spendMap = new Map<string, Map<string, number>>()
  const vendorTotals = new Map<string, number>()

  for (const s of active) {
    const ws = weekStart(s.orderedAt.slice(0, 10))
    if (!bucketSet.has(ws)) continue
    const byVendor = spendMap.get(ws) ?? new Map<string, number>()
    byVendor.set(s.vendorName, (byVendor.get(s.vendorName) ?? 0) + s.totalCost)
    spendMap.set(ws, byVendor)
    vendorTotals.set(s.vendorName, (vendorTotals.get(s.vendorName) ?? 0) + s.totalCost)
  }

  // ── Top 4 vendors; rest → "Others" ─────────────────────────────────────────
  const sorted = [...vendorTotals.entries()].sort((a, b) => b[1] - a[1])
  const topVendors = sorted.slice(0, 4).map(([v]) => v)
  const hasOthers  = sorted.length > 4
  const vendors    = hasOthers ? [...topVendors, "Others"] : topVendors

  // ── Weekly revenue from transactions ───────────────────────────────────────
  const revenueMap = new Map<string, number>()
  for (const t of transactions) {
    if (t.direction !== "in") continue
    const ws = weekStart(t.occurredAt.slice(0, 10))
    if (!bucketSet.has(ws)) continue
    revenueMap.set(ws, (revenueMap.get(ws) ?? 0) + t.amount)
  }

  // ── Build week rows ─────────────────────────────────────────────────────────
  const weeks: WeeklySpend[] = bucketStarts.map((ws) => {
    const byVendor = spendMap.get(ws) ?? new Map<string, number>()
    const row: WeeklySpend = { week: shortLabel(ws), weekStart: ws }
    let othersTotal = 0
    for (const [vendor, amount] of byVendor.entries()) {
      if (topVendors.includes(vendor)) {
        row[vendor] = Math.round(amount * 100) / 100
      } else {
        othersTotal += amount
      }
    }
    for (const v of topVendors) {
      if (!(v in row)) row[v] = 0
    }
    if (hasOthers) row["Others"] = Math.round(othersTotal * 100) / 100
    row.revenue = Math.round((revenueMap.get(ws) ?? 0) * 100) / 100
    return row
  })

  // ── 30-day totals ───────────────────────────────────────────────────────────
  const cutoff30 = new Date(asOfDate + "T00:00:00Z")
  cutoff30.setUTCDate(cutoff30.getUTCDate() - 30)
  const cutoff30Str = cutoff30.toISOString().slice(0, 10)

  const totalSpend30d = active
    .filter((s) => s.orderedAt.slice(0, 10) >= cutoff30Str)
    .reduce((sum, s) => sum + s.totalCost, 0)

  const totalRevenue30d = transactions
    .filter((t) => t.direction === "in" && t.occurredAt.slice(0, 10) >= cutoff30Str)
    .reduce((sum, t) => sum + t.amount, 0)

  // ── Week-over-week % change (spend) ────────────────────────────────────────
  let weekOverWeekPct: number | null = null
  if (weeks.length >= 2) {
    const prev = weeks[weeks.length - 2]
    const last = weeks[weeks.length - 1]
    const prevTotal = vendors.reduce((s, v) => s + ((prev[v] as number) ?? 0), 0)
    const lastTotal = vendors.reduce((s, v) => s + ((last[v] as number) ?? 0), 0)
    if (prevTotal > 0) {
      weekOverWeekPct = Math.round(((lastTotal - prevTotal) / prevTotal) * 1000) / 10
    }
  }

  return {
    weeks,
    vendors,
    totalSpend30d: Math.round(totalSpend30d * 100) / 100,
    totalRevenue30d: Math.round(totalRevenue30d * 100) / 100,
    weekOverWeekPct,
  }
}
