"use client"

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { SpendTrendsData } from "@/lib/inventory/spend-trends"

type Props = {
  data: SpendTrendsData
}

const VENDOR_COLORS = ["#7c3aed", "#2563eb", "#0891b2", "#059669", "#94a3b8"]

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
  }).format(n)
}

function CustomTooltip({
  active,
  payload,
  label,
  vendors,
}: {
  active?: boolean
  payload?: { name: string; value: number; fill: string }[]
  label?: string
  vendors: string[]
}) {
  if (!active || !payload || payload.length === 0) return null
  const revenueEntry = payload.find((p) => p.name === "revenue")
  const spendEntries = payload.filter((p) => p.name !== "revenue")
  const totalSpend   = spendEntries.reduce((s, p) => s + (p.value ?? 0), 0)

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-md text-xs space-y-1 min-w-[160px]">
      <p className="font-semibold text-foreground mb-1">{label}</p>

      {revenueEntry && revenueEntry.value > 0 && (
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <span className="h-0.5 w-3 rounded bg-emerald-500 shrink-0" />
            Revenue
          </span>
          <span className="font-medium text-emerald-700 tabular-nums">{fmtCurrency(revenueEntry.value)}</span>
        </div>
      )}

      {vendors.map((v, i) => {
        const entry = spendEntries.find((p) => p.name === v)
        if (!entry || entry.value === 0) return null
        return (
          <div key={v} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: VENDOR_COLORS[i] }} />
              {v}
            </span>
            <span className="font-medium text-foreground tabular-nums">{fmtCurrency(entry.value)}</span>
          </div>
        )
      })}

      {vendors.length > 1 && (
        <div className="flex items-center justify-between gap-4 border-t border-border pt-1 mt-1">
          <span className="text-muted-foreground">Total spend</span>
          <span className="font-semibold text-foreground tabular-nums">{fmtCurrency(totalSpend)}</span>
        </div>
      )}
    </div>
  )
}

export function SpendTrendsCard({ data }: Props) {
  const { weeks, vendors, totalSpend30d, totalRevenue30d, weekOverWeekPct } = data

  const wowPositive = weekOverWeekPct !== null && weekOverWeekPct > 0
  const wowNeutral  = weekOverWeekPct === null || weekOverWeekPct === 0

  return (
    <div className="space-y-3">
      {/* Summary row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-6">
          <div>
            <p className="text-xl font-bold text-foreground tabular-nums">{fmtCurrency(totalSpend30d)}</p>
            <p className="text-[10px] text-muted-foreground">spend · 30 days</p>
          </div>
          {totalRevenue30d > 0 && (
            <div>
              <p className="text-xl font-bold text-emerald-600 tabular-nums">{fmtCurrency(totalRevenue30d)}</p>
              <p className="text-[10px] text-muted-foreground">revenue · 30 days</p>
            </div>
          )}
        </div>
        {weekOverWeekPct !== null && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold border shrink-0 ${
              wowNeutral
                ? "bg-muted text-muted-foreground border-border"
                : wowPositive
                  ? "bg-red-50 text-red-600 border-red-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {wowPositive ? "+" : ""}{weekOverWeekPct}% vs last week
          </span>
        )}
      </div>

      {/* Composed chart: stacked bars (spend) + line (revenue) */}
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={weeks} barCategoryGap="28%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="week"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            content={<CustomTooltip vendors={vendors} />}
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          />
          {vendors.map((vendor, i) => (
            <Bar
              key={vendor}
              dataKey={vendor}
              stackId="spend"
              fill={VENDOR_COLORS[i]}
              radius={i === vendors.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {vendors.map((v, i) => (
          <div key={v} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: VENDOR_COLORS[i] }} />
            <span className="text-[11px] text-muted-foreground">{v}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded bg-emerald-500 shrink-0" />
          <span className="text-[11px] text-muted-foreground">Revenue</span>
        </div>
      </div>
    </div>
  )
}
