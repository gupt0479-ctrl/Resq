import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

function formatActionLabel(actionType: string): string {
  return actionType
    .replace(/\bguest_/g, "customer_")
    .replace(/\bunhappy_guest\b/g, "at_risk_customer")
    .replace(/\bdining_/g, "")
    .replace(/\breservation_/g, "booking_")
    .replace(/_/g, " ")
}

function statusStyle(status: string): string {
  switch (status) {
    case "executed": return "bg-teal/10 text-teal border-teal/20"
    case "pending":  return "bg-amber/10 text-amber border-amber/20"
    case "failed":   return "bg-crimson/10 text-crimson border-crimson/20"
    default:         return "bg-surface-muted text-steel border-border"
  }
}

function dotColor(status: string): string {
  switch (status) {
    case "executed": return "bg-teal"
    case "pending":  return "bg-amber"
    case "failed":   return "bg-crimson"
    default:         return "bg-steel"
  }
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 60) return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}

const ACTION_TYPE_LABEL: Record<string, string> = {
  receivable_risk_detected:  "Risk Detected",
  customer_followup_sent:    "Follow-up Sent",
  financing_options_scouted: "Financing Scouted",
  payment_plan_suggested:    "Payment Plan",
  rescue_case_resolved:      "Case Resolved",
}

export default async function WorkflowPage() {
  const client = createServerSupabaseClient()
  const { data } = await client
    .from("ai_actions")
    .select("id, action_type, input_summary, status, created_at, entity_type")
    .eq("organization_id", DEMO_ORG_ID)
    .order("created_at", { ascending: false })
    .limit(30)
  const timeline = data ?? []

  const executedCount = timeline.filter(e => e.status === "executed").length
  const pendingCount  = timeline.filter(e => e.status === "pending").length

  return (
    <div className="p-8 lg:p-10 max-w-[1280px] mx-auto">
      {/* Page header */}
      <div className="mb-10">
        <div className="text-[11px] uppercase tracking-[0.18em] text-steel">Automation · audit log</div>
        <h1 className="font-display text-2xl lg:text-3xl mt-1">Agent Run</h1>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card-elevated p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Total actions</div>
          <div className="font-display text-2xl mt-1">{timeline.length}</div>
          <div className="text-[11.5px] text-steel mt-1">All agent runs logged</div>
        </div>
        <div className="card-elevated p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Executed</div>
          <div className="font-display text-2xl mt-1 text-teal">{executedCount}</div>
          <div className="text-[11.5px] text-steel mt-1">Completed successfully</div>
        </div>
        <div className="card-elevated p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Pending</div>
          <div className="font-display text-2xl mt-1 text-amber">{pendingCount}</div>
          <div className="text-[11.5px] text-steel mt-1">Awaiting completion</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="card-elevated p-6">
        <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-6">
          Activity timeline — {timeline.length} action{timeline.length !== 1 ? "s" : ""}
        </div>

        {timeline.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[13px] font-medium">No agent runs yet</p>
            <p className="text-[12px] text-steel mt-1">Go to the Rescue Queue and run an agent to see activity here.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-3 top-3 bottom-3 w-px bg-border" />
            <ul className="space-y-3 pl-9">
              {timeline.map((event) => (
                <li key={event.id} className="relative">
                  <div className={cn(
                    "absolute -left-6 top-3 h-2 w-2 rounded-full border-2 border-background",
                    dotColor(event.status)
                  )} />
                  <div className="rounded-md border border-border bg-surface p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
                          statusStyle(event.status)
                        )}>
                          {event.status}
                        </span>
                        <span className="text-[13px] font-medium capitalize">
                          {ACTION_TYPE_LABEL[event.action_type] ?? formatActionLabel(event.action_type)}
                        </span>
                      </div>
                      <span className="text-[11px] text-steel">{timeAgo(event.created_at)}</span>
                    </div>
                    {event.input_summary && (
                      <p className="mt-1.5 text-[12px] text-steel leading-relaxed">{event.input_summary}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="text-[11px] text-steel mt-6 text-center">
        Every action above was taken automatically by OpsPilot — no manual input required.
      </p>
    </div>
  )
}
