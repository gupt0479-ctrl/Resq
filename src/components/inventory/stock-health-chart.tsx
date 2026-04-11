"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"

type Props = {
  totalItems: number
  healthyCount: number
  atRiskCount: number
  expiringCount: number
  issueCount: number
}

const COLORS = {
  healthy: "#10B981",
  atRisk:  "#F59E0B",
  expiring:"#F97316",
  issues:  "#EF4444",
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs">
        <p className="font-medium text-foreground">{payload[0].name}</p>
        <p className="text-muted-foreground">{payload[0].value} items</p>
      </div>
    )
  }
  return null
}

export function StockHealthChart({
  totalItems,
  healthyCount,
  atRiskCount,
  expiringCount,
  issueCount,
}: Props) {
  const data = [
    { name: "Healthy",       value: healthyCount,  color: COLORS.healthy },
    { name: "Low Stock",     value: atRiskCount,   color: COLORS.atRisk },
    { name: "Expiring Soon", value: expiringCount, color: COLORS.expiring },
    { name: "Issues",        value: issueCount,    color: COLORS.issues },
  ].filter((d) => d.value > 0)

  if (totalItems === 0) return null

  return (
    <div className="flex flex-col h-full">
      {/* Donut */}
      <div className="relative flex-1 min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="78%"
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{totalItems}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Items</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-xs text-muted-foreground truncate">{d.name}</span>
            <span className="ml-auto text-xs font-medium text-foreground tabular-nums">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
