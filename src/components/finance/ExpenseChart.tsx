"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"

export type ExpenseSlice = {
  name: string
  value: number
  color: string
}

function ExpenseTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean
  payload?: { name: string; value: number }[]
  total: number
}) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0"
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-foreground capitalize">{name}</p>
      <p className="text-muted-foreground">
        {value.toLocaleString("en-US", { style: "currency", currency: "USD" })} · {pct}%
      </p>
    </div>
  )
}

export function ExpenseChart({ data }: { data: ExpenseSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="flex flex-col">
      <div className="relative h-[200px] w-full min-w-0">
        {/* Decorative pulse ring behind the donut */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[148px] w-[148px] rounded-full border-2 border-blue-500/20 animate-pulse" />
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="72%"
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ExpenseTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="truncate text-[11px] text-muted-foreground capitalize">
              {d.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
