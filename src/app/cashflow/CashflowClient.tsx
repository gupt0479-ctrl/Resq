"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { WaterfallChart } from "@/components/cashflow/WaterfallChart"
import { IncomeGauge } from "@/components/cashflow/IncomeGauge"
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface CashflowData {
  currentCash:      number
  breakpointWeek:   number | null
  projectedEndCash: number
  topDriver:        { label: string; amount: number; direction: "in" | "out" }
  last90:           { totalIn: number; totalOut: number }
  next90:           { totalIn: number; totalOut: number }
  waterfall: Array<{ week: string; cashIn: number; cashOut: number; balance: number; isForecast: boolean }>
  topDrivers:  Array<{ category: string; amount: number; direction: "in" | "out"; pct: number }>
  actionQueue: Array<{ label: string; amount: number; urgency: "high" | "medium" | "low" }>
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK: CashflowData = {
  currentCash:      47_320,
  breakpointWeek:   9,
  projectedEndCash: 12_800,
  topDriver:        { label: "Labor", amount: 14_200, direction: "out" },
  last90: { totalIn: 98_400, totalOut: 74_100 },
  next90: { totalIn: 61_000, totalOut: 65_200 },
  waterfall: [
    { week: "W-12", cashIn: 7200, cashOut: 5400, balance: 32000, isForecast: false },
    { week: "W-11", cashIn: 8100, cashOut: 6200, balance: 33900, isForecast: false },
    { week: "W-10", cashIn: 7600, cashOut: 5900, balance: 35600, isForecast: false },
    { week: "W-9",  cashIn: 8300, cashOut: 6100, balance: 37800, isForecast: false },
    { week: "W-8",  cashIn: 7900, cashOut: 5700, balance: 40000, isForecast: false },
    { week: "W-7",  cashIn: 7100, cashOut: 6300, balance: 40800, isForecast: false },
    { week: "W-6",  cashIn: 8400, cashOut: 7200, balance: 42000, isForecast: false },
    { week: "W-5",  cashIn: 7800, cashOut: 5800, balance: 44000, isForecast: false },
    { week: "W-4",  cashIn: 8200, cashOut: 6900, balance: 45300, isForecast: false },
    { week: "W-3",  cashIn: 7500, cashOut: 6100, balance: 46700, isForecast: false },
    { week: "W-2",  cashIn: 8100, cashOut: 7200, balance: 47600, isForecast: false },
    { week: "W-1",  cashIn: 7300, cashOut: 7100, balance: 47800, isForecast: false },
    { week: "Now",  cashIn: 6800, cashOut: 7280, balance: 47320, isForecast: false },
    { week: "W+1",  cashIn: 6200, cashOut: 6800, balance: 46720, isForecast: true  },
    { week: "W+2",  cashIn: 5800, cashOut: 6400, balance: 46120, isForecast: true  },
    { week: "W+3",  cashIn: 6000, cashOut: 6900, balance: 45220, isForecast: true  },
    { week: "W+4",  cashIn: 5500, cashOut: 7100, balance: 43620, isForecast: true  },
    { week: "W+5",  cashIn: 5200, cashOut: 7000, balance: 41820, isForecast: true  },
    { week: "W+6",  cashIn: 4800, cashOut: 6800, balance: 39820, isForecast: true  },
    { week: "W+7",  cashIn: 4600, cashOut: 7200, balance: 37220, isForecast: true  },
    { week: "W+8",  cashIn: 4200, cashOut: 6600, balance: 34820, isForecast: true  },
    { week: "W+9",  cashIn: 3900, cashOut: 6500, balance: 32220, isForecast: true  },
    { week: "W+10", cashIn: 3600, cashOut: 7200, balance: 28620, isForecast: true  },
    { week: "W+11", cashIn: 3400, cashOut: 7100, balance: 24920, isForecast: true  },
    { week: "W+12", cashIn: 3100, cashOut: 7200, balance: 20820, isForecast: true  },
    { week: "W+13", cashIn: 2800, cashOut: 7100, balance: 16520, isForecast: true  },
  ],
  topDrivers: [
    { category: "Labor",     amount: 14200, direction: "out", pct: 76 },
    { category: "Revenue",   amount: 13100, direction: "in",  pct: 70 },
    { category: "Utilities", amount:  8400, direction: "out", pct: 45 },
    { category: "Inventory", amount:  7200, direction: "out", pct: 38 },
    { category: "Platform",  amount:  6800, direction: "in",  pct: 36 },
  ],
  actionQueue: [
    { label: "Collect from Riverfront Bistro", amount: 8400, urgency: "high"   },
    { label: "Collect from Harbor Grill",       amount: 5200, urgency: "high"   },
    { label: "Invoice due: Summit Catering",    amount: 3100, urgency: "medium" },
    { label: "Cash crunch projected at W+9",    amount: 0,    urgency: "high"   },
    { label: "Review labor costs (+18% MoM)",   amount: 2100, urgency: "medium" },
  ],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, full = false) {
  if (full) return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}k`
  return `$${n}`
}

// ── KPI strip ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 py-5 px-6 border-r border-stone-100 last:border-r-0">
      <p className="text-[10.5px] font-semibold uppercase tracking-widest text-stone-400">{label}</p>
      <div className="text-[24px] font-bold leading-tight text-stone-800">{value}</div>
      {sub && <div className="text-[11px] text-stone-400 mt-0.5">{sub}</div>}
    </div>
  )
}

// ── 90-day area mini chart ────────────────────────────────────────────────────

function MiniAreaChart({
  data,
  id,
}: {
  data: { week: string; cashIn: number; cashOut: number }[]
  id: string
}) {
  return (
    <div className="h-[110px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`miniIn-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#2d9b8a" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#2d9b8a" stopOpacity={0.03} />
            </linearGradient>
            <linearGradient id={`miniOut-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#c0522a" stopOpacity={0.14} />
              <stop offset="100%" stopColor="#c0522a" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0]?.payload as { cashIn: number; cashOut: number }
              return (
                <div className="rounded-lg border border-stone-100 bg-white px-2 py-1 text-[10px] shadow-sm">
                  <span style={{ color: "#2d9b8a" }}>{fmt(d.cashIn)}</span>
                  <span className="mx-1 text-stone-300">/</span>
                  <span style={{ color: "#c0522a" }}>{fmt(d.cashOut)}</span>
                </div>
              )
            }}
            cursor={{ stroke: "#e7e5e4", strokeWidth: 1 }}
          />
          <Area type="monotone" dataKey="cashIn"  stroke="#2d9b8a" strokeWidth={2} fill={`url(#miniIn-${id})`}  dot={false} />
          <Area type="monotone" dataKey="cashOut" stroke="#c0522a" strokeWidth={2} fill={`url(#miniOut-${id})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function FlowCard({
  title,
  badge,
  totalIn,
  totalOut,
  chartData,
}: {
  title:     string
  badge:     string
  totalIn:   number
  totalOut:  number
  chartData: { week: string; cashIn: number; cashOut: number }[]
}) {
  const net = totalIn - totalOut
  const isNeg = net < 0
  return (
    <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm flex flex-col">
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 whitespace-nowrap">{title}</p>
          <p className="text-[12px] text-stone-400 mt-0.5">Net</p>
          <p className={cn("text-[28px] font-bold leading-tight", isNeg ? "text-[#c0522a]" : "text-[#2d9b8a]")}>
            {isNeg ? "-" : "+"}{fmt(Math.abs(net), true)}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10.5px] text-stone-400 mt-0.5 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: "#2d9b8a" }} />
            Inflow
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: "#c0522a" }} />
            Outflow
          </span>
        </div>
      </div>

      {/* In / Out row */}
      <div className="flex items-center gap-5 mb-4">
        <div>
          <span className="text-[10.5px] text-stone-400">In </span>
          <span className="text-[13px] font-semibold" style={{ color: "#2d9b8a" }}>{fmt(totalIn, true)}</span>
        </div>
        <div>
          <span className="text-[10.5px] text-stone-400">Out </span>
          <span className="text-[13px] font-semibold" style={{ color: "#c0522a" }}>{fmt(totalOut, true)}</span>
        </div>
      </div>

      {/* Chart fills remaining space */}
      <div className="flex-1 min-h-0">
        <MiniAreaChart data={chartData} id={badge} />
      </div>
    </div>
  )
}

// ── Top Drivers ───────────────────────────────────────────────────────────────

function TopDriversList({ drivers }: { drivers: CashflowData["topDrivers"] }) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-stone-500 mb-4">Top Drivers</p>
      <div className="space-y-4">
        {drivers.map((d) => (
          <div key={d.category} className="flex items-center gap-3">
            <span
              className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 w-6 text-center"
              style={
                d.direction === "in"
                  ? { background: "#edf7f5", color: "#2d9b8a" }
                  : { background: "#fdf2ee", color: "#c0522a" }
              }
            >
              {d.direction === "in" ? "▲" : "▼"}
            </span>
            <span className="text-[12.5px] text-stone-700 flex-1">{d.category}</span>
            <div className="flex items-center gap-2.5">
              <div className="w-24 h-1 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${d.pct}%`,
                    background: d.direction === "in" ? "#2d9b8a" : "#c0522a",
                    opacity: 0.6,
                  }}
                />
              </div>
              <span className="text-[12px] font-semibold text-stone-500 w-12 text-right tabular-nums">
                {fmt(d.amount)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Action Queue ──────────────────────────────────────────────────────────────

const URGENCY: Record<string, { dot: string; row: string }> = {
  high:   { dot: "#ef4444", row: "bg-red-50/50"   },
  medium: { dot: "#f59e0b", row: "bg-amber-50/40" },
  low:    { dot: "#d1d5db", row: ""               },
}

function ActionQueue({ items }: { items: CashflowData["actionQueue"] }) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-stone-500 mb-4">Action Queue</p>
      <div className="space-y-1">
        {items.map((item, i) => {
          const s = URGENCY[item.urgency]
          return (
            <div key={i} className={cn("flex items-center gap-3 rounded-lg px-2 py-2.5", s.row)}>
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: s.dot }}
              />
              <span className="text-[12.5px] text-stone-700 flex-1 leading-snug">{item.label}</span>
              {item.amount > 0 && (
                <span className="text-[12px] font-semibold text-stone-400 tabular-nums shrink-0">
                  {fmt(item.amount)}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function CashflowClient() {
  const d = MOCK
  const delta = d.projectedEndCash - d.currentCash
  const historicalWeeks = d.waterfall.filter((w) => !w.isForecast)
  const forecastWeeks   = d.waterfall.filter((w) =>  w.isForecast)

  const cashColor =
    d.currentCash > 20_000 ? "#2d9b8a" :
    d.currentCash > 5_000  ? "#f59e0b" : "#c0522a"

  return (
    <div className="min-h-screen p-6" style={{ background: "#faf9f7" }}>
      <div className="max-w-[1320px] mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-stone-800 tracking-tight">Cash Flow</h1>
            <p className="text-[12px] text-stone-400 mt-0.5">90-day survivability view</p>
          </div>
          {d.breakpointWeek && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-2 text-[12px] font-medium text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Cash crunch projected at Week {d.breakpointWeek}
            </div>
          )}
        </div>

        {/* Row 1 — KPI strip */}
        <div className="rounded-2xl border border-stone-100 bg-white shadow-sm grid grid-cols-4 divide-x divide-stone-100">
          <KpiCard
            label="Current Cash"
            value={<span style={{ color: cashColor }}>{fmt(d.currentCash, true)}</span>}
            sub="Available balance today"
          />
          <KpiCard
            label="Breakpoint Week"
            value={
              d.breakpointWeek
                ? <span style={{ color: "#f59e0b" }}>Week {d.breakpointWeek}</span>
                : <span style={{ color: "#2d9b8a" }}>Safe · 90d</span>
            }
            sub={d.breakpointWeek ? "Projected cash zero" : "No crunch in sight"}
          />
          <KpiCard
            label="Projected · 90 Days"
            value={<span style={{ color: delta >= 0 ? "#2d9b8a" : "#c0522a" }}>{fmt(d.projectedEndCash, true)}</span>}
            sub={
              <span
                className="flex items-center gap-1"
                style={{ color: delta >= 0 ? "#2d9b8a" : "#c0522a" }}
              >
                {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {delta >= 0 ? "+" : ""}{fmt(delta)} vs today
              </span>
            }
          />
          <KpiCard
            label="Largest Driver"
            value={<span className="text-stone-800">{d.topDriver.label}</span>}
            sub={
              <span style={{ color: d.topDriver.direction === "out" ? "#c0522a" : "#2d9b8a" }}>
                {fmt(d.topDriver.amount, true)} {d.topDriver.direction === "out" ? "outflow" : "inflow"}
              </span>
            }
          />
        </div>

        {/* Row 2 — 90-day cards + income gauge */}
        <div className="grid grid-cols-3 gap-4">
          <FlowCard
            title="Last 90 Days"
            badge="Actual"
            totalIn={d.last90.totalIn}
            totalOut={d.last90.totalOut}
            chartData={historicalWeeks}
          />
          <FlowCard
            title="Next 90 Days"
            badge="Forecast"
            totalIn={d.next90.totalIn}
            totalOut={d.next90.totalOut}
            chartData={forecastWeeks}
          />
          <IncomeGauge />
        </div>

        {/* Row 3 — Main chart */}
        <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-[14px] font-semibold text-stone-800">Cash Flow Insights</p>
            <p className="text-[11.5px] text-stone-400 mt-0.5">
              Solid = actual &nbsp;·&nbsp; faded = forecast &nbsp;·&nbsp; dashed line = running balance
            </p>
          </div>
          <WaterfallChart data={d.waterfall} />
        </div>

        {/* Row 4 — Drivers + Queue */}
        <div className="grid grid-cols-2 gap-4">
          <TopDriversList drivers={d.topDrivers} />
          <ActionQueue     items={d.actionQueue} />
        </div>

      </div>
    </div>
  )
}
