import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"

export const dynamic = "force-dynamic"

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalise DB action_type strings for display: replace restaurant-specific
 *  terminology with business-neutral equivalents, then humanise underscores. */
function formatActionLabel(actionType: string): string {
  return actionType
    .replace(/\bguest_/g, "customer_")
    .replace(/\bunhappy_guest\b/g, "at_risk_customer")
    .replace(/\bdining_/g, "")
    .replace(/\breservation_/g, "booking_")
    .replace(/_/g, " ")
}

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

export default async function WorkflowPage() {
  const client = createServerSupabaseClient()
  const { data } = await client
    .from("ai_actions")
    .select("id, action_type, input_summary, status, created_at, entity_type")
    .eq("organization_id", DEMO_ORG_ID)
    .order("created_at", { ascending: false })
    .limit(20)
  const timeline = data ?? []
  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Agent Runs</h1>
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
            Activity Timeline — {timeline.length} actions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {timeline.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No agent runs yet — complete a booking to generate the first event.
            </div>
          ) : (
            <div className="relative">
              {/* Vertical track */}
              <div className="absolute bottom-0 left-[7px] top-2 w-px bg-border" />

              <ul className="space-y-0">
                {timeline.map((event, i) => {
                  const style = AGENT_STYLES[event.entity_type] ?? AGENT_STYLES.performance
                  return (
                    <li key={event.id} className={`relative pl-7 ${i < timeline.length - 1 ? "pb-5" : ""}`}>
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
                              {formatActionLabel(event.action_type)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusStyle(event.status)}`}>
                              {event.status}
                            </span>
                            <span className="text-[11px] text-muted-foreground">{new Date(event.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{event.input_summary}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground">
        Every action above was taken automatically by OpsPilot — no manual input required.
      </p>
    </div>
  )
}
