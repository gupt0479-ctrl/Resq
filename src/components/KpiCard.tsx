import { cn } from "@/lib/utils"

interface KpiCardProps {
  label:    string
  value:    string
  delta?:   string
  tone?:    "neutral" | "amber" | "teal" | "crimson"
  context?: string
}

export function KpiCard({ label, value, delta, tone = "neutral", context }: KpiCardProps) {
  const valueColor = {
    neutral: "",
    amber:   "text-amber",
    teal:    "text-teal",
    crimson: "text-crimson",
  }[tone]

  return (
    <div className="card-elevated p-5 flex flex-col gap-3 stagger-in">
      <div className="text-[10px] uppercase tracking-[0.18em] text-steel">{label}</div>
      <div className={cn("kpi-value", valueColor)}>{value}</div>
      {delta && (
        <div className="text-[11.5px] text-muted-foreground">{delta}</div>
      )}
      {context && (
        <div className="text-[11px] text-steel">{context}</div>
      )}
    </div>
  )
}
