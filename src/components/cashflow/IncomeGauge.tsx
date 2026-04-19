"use client"

import { PieChart, Pie, Cell } from "recharts"

const SOURCES = [
  { name: "Receivables",  value: 55, amount: 54_120, color: "#E8956D" },
  { name: "Retainers",    value: 20, amount: 19_680, color: "#C4B5D9" },
  { name: "Platform",     value: 15, amount: 14_760, color: "#A5B8E0" },
  { name: "Other Income", value: 10, amount:  9_840, color: "#B5D9A5" },
]
const TOTAL = 98_400

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

export function IncomeGauge() {
  return (
    <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm flex flex-col">
      {/* Header */}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-3">
        Income Sources
      </p>

      {/* Gauge + center label */}
      <div className="relative flex justify-center">
        <PieChart width={240} height={132}>
          <Pie
            data={SOURCES}
            cx={120}
            cy={128}
            startAngle={180}
            endAngle={0}
            innerRadius={70}
            outerRadius={108}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {SOURCES.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>

        {/* Center label — sits inside the arc opening */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center pb-2 pointer-events-none w-full">
          <p className="text-[11px] text-stone-400">Total Income</p>
          <p className="text-[20px] font-bold text-stone-800 leading-tight">{fmt(TOTAL)}</p>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-5 space-y-3">
        {SOURCES.map((s) => (
          <div key={s.name} className="flex items-center gap-2.5">
            <span
              className="w-[3px] h-[18px] rounded-full shrink-0"
              style={{ background: s.color }}
            />
            <span className="text-[12.5px] text-stone-600 flex-1">{s.name}</span>
            <span className="text-[12px] text-stone-400 tabular-nums mr-3">{fmt(s.amount)}</span>
            <span className="text-[12px] font-bold text-stone-700 w-8 text-right tabular-nums">
              {s.value}%
            </span>
          </div>
        ))}
      </div>

      {/* View details */}
      <button className="mt-5 w-full rounded-xl border border-stone-100 bg-stone-50 py-2.5 text-[12.5px] font-medium text-stone-500 hover:bg-stone-100 transition-colors">
        View details
      </button>
    </div>
  )
}
