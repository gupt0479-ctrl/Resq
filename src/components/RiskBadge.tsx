import { cn } from "@/lib/utils"

export type RiskLevel = "Critical" | "High" | "Moderate" | "Stable"

const styles: Record<RiskLevel, { pill: string; dot: string; pulse: boolean }> = {
  Critical: { pill: "bg-crimson/10 text-crimson border-crimson/20",   dot: "bg-crimson",                    pulse: true  },
  High:     { pill: "bg-amber/10 text-amber border-amber/20",         dot: "bg-amber",                      pulse: true  },
  Moderate: { pill: "bg-yellow-50 text-yellow-700 border-yellow-200", dot: "bg-yellow-500",                 pulse: false },
  Stable:   { pill: "bg-teal/10 text-teal border-teal/20",            dot: "bg-teal",                       pulse: false },
}

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const s = styles[level]
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
      s.pill,
      className,
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot, s.pulse && "animate-pulse")} />
      {level}
    </span>
  )
}
