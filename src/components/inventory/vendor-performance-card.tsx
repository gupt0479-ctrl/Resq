import type { VendorPerformanceStat } from "@/lib/types"

type Props = {
  vendorStats: VendorPerformanceStat[]
}

const priorityColor = {
  high:   { bar: "bg-red-500",   label: "bg-red-50 text-red-600 border-red-200" },
  medium: { bar: "bg-amber-400", label: "bg-amber-50 text-amber-700 border-amber-200" },
  low:    { bar: "bg-emerald-400",label: "bg-emerald-50 text-emerald-700 border-emerald-200" },
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
  }).format(n)
}

export function VendorPerformanceCard({ vendorStats }: Props) {
  if (vendorStats.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No delivery data available.</p>
    )
  }

  return (
    <div className="space-y-3">
      {vendorStats.map((v) => {
        const colors = priorityColor[v.negotiationPriority]
        return (
          <div key={v.vendorName} className="space-y-1.5">
            {/* Vendor name + badge */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground truncate">{v.vendorName}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {fmtCurrency(v.totalSpend30d)}
                </span>
                {v.negotiationPriority !== "low" && (
                  <span
                    className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${colors.label}`}
                  >
                    {v.negotiationPriority === "high" ? "Negotiate" : "Review"}
                  </span>
                )}
              </div>
            </div>

            {/* On-time progress bar */}
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${colors.bar}`}
                  style={{ width: `${v.onTimePct}%` }}
                />
              </div>
              <span className="w-10 text-right text-[10px] font-medium tabular-nums text-muted-foreground">
                {v.onTimePct}%
              </span>
            </div>

            {/* Stats */}
            <p className="text-[10px] text-muted-foreground">
              {v.totalDeliveries} deliveries
              {v.lateCount > 0
                ? ` · ${v.lateCount} late (avg ${v.avgDaysLate}d)`
                : " · all on time"}
              {v.hasPriceIncrease ? " · price increases" : ""}
            </p>
          </div>
        )
      })}
    </div>
  )
}
