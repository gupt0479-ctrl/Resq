"use client"

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts"
import { SafeResponsiveContainer as ResponsiveContainer } from "@/components/cashflow/SafeResponsiveContainer"

export interface WaterfallPoint {
  week: string
  cashIn: number
  cashOut: number
  balance: number
  isForecast: boolean
}

function fmt(n: number) {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}k`
  return `$${n}`
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: WaterfallPoint }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const net = d.cashIn - d.cashOut
  return (
    <div className="rounded-xl border border-stone-100 bg-white/98 px-4 py-3 shadow-lg text-[11.5px] min-w-[170px]">
      <p className="font-semibold text-stone-700 mb-2 flex items-center gap-2">
        {label}
        {d.isForecast && (
          <span className="text-[9px] font-semibold uppercase tracking-wide bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">
            forecast
          </span>
        )}
      </p>
      <div className="space-y-1">
        <div className="flex justify-between gap-8">
          <span style={{ color: "#2d9b8a" }}>Inflow</span>
          <span className="font-semibold" style={{ color: "#2d9b8a" }}>{fmt(d.cashIn)}</span>
        </div>
        <div className="flex justify-between gap-8">
          <span style={{ color: "#c0522a" }}>Outflow</span>
          <span className="font-semibold" style={{ color: "#c0522a" }}>{fmt(d.cashOut)}</span>
        </div>
        <div className="flex justify-between gap-8 pt-1.5 mt-1 border-t border-stone-100">
          <span className="text-stone-400">Net</span>
          <span
            className="font-bold"
            style={{ color: net >= 0 ? "#2d9b8a" : "#c0522a" }}
          >
            {net >= 0 ? "+" : ""}{fmt(net)}
          </span>
        </div>
        <div className="flex justify-between gap-8">
          <span className="text-stone-400">Balance</span>
          <span className="font-semibold text-stone-700">{fmt(d.balance)}</span>
        </div>
      </div>
    </div>
  )
}

function CustomLegend() {
  return (
    <div className="flex items-center justify-center gap-8 mt-3 text-[11px] text-stone-400">
      <span className="flex items-center gap-2">
        <svg width="18" height="10" viewBox="0 0 18 10">
          <rect x="0" y="3" width="18" height="4" rx="2" fill="#2d9b8a" fillOpacity={0.3} />
          <line x1="0" y1="5" x2="18" y2="5" stroke="#2d9b8a" strokeWidth="2" />
        </svg>
        Inflow
      </span>
      <span className="flex items-center gap-2">
        <svg width="18" height="10" viewBox="0 0 18 10">
          <line x1="0" y1="5" x2="18" y2="5" stroke="#c0522a" strokeWidth="2" />
        </svg>
        Outflow
      </span>
      <span className="flex items-center gap-2">
        <svg width="18" height="10" viewBox="0 0 18 10">
          <line x1="0" y1="5" x2="18" y2="5" stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="4 3" />
        </svg>
        Running Balance
      </span>
    </div>
  )
}

export function WaterfallChart({ data }: { data: WaterfallPoint[] }) {
  return (
    <div className="w-full min-w-0">
      <div className="h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 16, right: 24, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#2d9b8a" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#2d9b8a" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#c0522a" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#c0522a" stopOpacity={0.03} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} stroke="#f1ede8" strokeWidth={1} />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 12, fill: "#a8a29e" }}
              axisLine={false}
              tickLine={false}
              interval={1}
              height={32}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#a8a29e" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={fmt}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e7e5e4", strokeWidth: 1.5 }} />

            <ReferenceLine
              x="Now"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 3"
              label={{
                value: "TODAY",
                position: "insideTopRight",
                fontSize: 11,
                fontWeight: 700,
                fill: "#f59e0b",
                dy: -12,
              }}
            />

            {/* Inflow — teal area */}
            <Area
              type="monotone"
              dataKey="cashIn"
              stroke="#2d9b8a"
              strokeWidth={3}
              fill="url(#inflowGrad)"
              dot={false}
              activeDot={{ r: 6, fill: "#2d9b8a", strokeWidth: 0 }}
              name="Inflow"
            />

            {/* Outflow — rust line, light fill */}
            <Area
              type="monotone"
              dataKey="cashOut"
              stroke="#c0522a"
              strokeWidth={3}
              fill="url(#outflowGrad)"
              dot={false}
              activeDot={{ r: 6, fill: "#c0522a", strokeWidth: 0 }}
              name="Outflow"
            />

            {/* Running balance — dashed gray */}
            <Line
              type="monotone"
              dataKey="balance"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              name="Running Balance"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <CustomLegend />
    </div>
  )
}
