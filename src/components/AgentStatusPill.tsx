import { cn } from "@/lib/utils"

export type AgentStatus = "ready" | "running" | "degraded" | "mock" | "completed"

const styles: Record<AgentStatus, { dot: string; pulse: boolean; label: string }> = {
  ready:     { dot: "bg-teal",   pulse: false, label: "Ready"     },
  completed: { dot: "bg-teal",   pulse: false, label: "Completed" },
  running:   { dot: "bg-amber",  pulse: true,  label: "Running"   },
  degraded:  { dot: "bg-crimson",pulse: true,  label: "Degraded"  },
  mock:      { dot: "bg-steel",  pulse: false, label: "Mock"      },
}

export function AgentStatusPill({ status, className }: { status: AgentStatus; className?: string }) {
  const s = styles[status]
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] text-steel", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot, s.pulse && "animate-pulse")} />
      {s.label}
    </span>
  )
}
