import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// TODO: replace with Supabase query
const MOCK_TIMELINE = [
  {
    id: "t1",
    agent: "customer_service",
    action_type: "send_reminder",
    input_summary: "INV-2025-002 overdue — Priya Nair $94.95",
    status: "executed",
    timestamp: "1 hour ago",
  },
  {
    id: "t2",
    agent: "performance",
    action_type: "daily_summary_generated",
    input_summary: "End of day performance summary",
    status: "executed",
    timestamp: "2 hours ago",
  },
  {
    id: "t3",
    agent: "marketing",
    action_type: "draft_return_nudge",
    input_summary: "Sofia Morales has not returned in 45 days",
    status: "executed",
    timestamp: "4 hours ago",
  },
  {
    id: "t4",
    agent: "inventory",
    action_type: "reorder_alert",
    input_summary: "Wagyu Ribeye at 4 portions, below reorder level",
    status: "executed",
    timestamp: "6 hours ago",
  },
  {
    id: "t5",
    agent: "customer_service",
    action_type: "flag_and_draft_recovery",
    input_summary: "Priya Nair left score 2, allergy incident",
    status: "executed",
    timestamp: "23 hours ago",
  },
  {
    id: "t6",
    agent: "customer_service",
    action_type: "invoice_generated",
    input_summary: "Reservation completed for Marcus Webb, party of 2",
    status: "executed",
    timestamp: "3 days ago",
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const AGENT_STYLES: Record<string, { border: string; badge: string; dot: string; label: string }> = {
  customer_service: {
    border: "border-l-teal-500",
    badge: "bg-teal-100 text-teal-700",
    dot: "bg-teal-500",
    label: "Customer Service",
  },
  inventory: {
    border: "border-l-amber-400",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-400",
    label: "Inventory",
  },
  marketing: {
    border: "border-l-purple-500",
    badge: "bg-purple-100 text-purple-700",
    dot: "bg-purple-500",
    label: "Marketing",
  },
  performance: {
    border: "border-l-blue-500",
    badge: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
    label: "Performance",
  },
}

function statusStyle(status: string) {
  switch (status) {
    case "executed": return "bg-emerald-100 text-emerald-700"
    case "pending":  return "bg-amber-100 text-amber-700"
    case "failed":   return "bg-red-100 text-red-600"
    default:         return "bg-muted text-muted-foreground"
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function WorkflowPage() {
  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Workflow</h1>
        <p className="text-xs text-muted-foreground">
          Every action taken automatically by OpsPilot agents
        </p>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          {Object.entries(AGENT_STYLES).map(([, s]) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader className="border-b border-border pb-3 pt-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Activity Timeline — {MOCK_TIMELINE.length} actions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="relative">
            {/* Vertical track */}
            <div className="absolute bottom-0 left-[7px] top-2 w-px bg-border" />

            <ul className="space-y-0">
              {MOCK_TIMELINE.map((event, i) => {
                const style = AGENT_STYLES[event.agent] ?? AGENT_STYLES.performance
                return (
                  <li key={event.id} className={`relative pl-7 ${i < MOCK_TIMELINE.length - 1 ? "pb-5" : ""}`}>
                    {/* Dot */}
                    <span
                      className={`absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background ${style.dot}`}
                    />

                    {/* Event card */}
                    <div
                      className={`rounded-lg border border-border border-l-4 bg-card px-4 py-3 ${style.border}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${style.badge}`}>
                            {style.label}
                          </span>
                          <span className="text-sm font-medium text-foreground">
                            {event.action_type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusStyle(event.status)}`}>
                            {event.status}
                          </span>
                          <span className="text-[11px] text-muted-foreground">{event.timestamp}</span>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{event.input_summary}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground">
        Every action above was taken automatically by OpsPilot — no manual input required.
      </p>
    </div>
  )
}
