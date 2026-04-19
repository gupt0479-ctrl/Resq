import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { db, DEMO_ORG_ID } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"

export const dynamic = "force-dynamic"

type TimelineEvent = {
  id: string
  action_type: string
  input_summary: string | null
  status: string
  created_at: Date | string
  entity_type: string
  output_payload_json?: unknown
}

function formatActionLabel(actionType: string): string {
  const normalized = actionType
    .replace(/^receivable_/g, "collections_")
    .replace(/^survival_scan_completed$/g, "survival scan completed")
    .replace(/^financing_options_scouted$/g, "financing options scouted")
    .replace(/^vendor_costs_compared$/g, "vendor costs compared")
    .replace(/^insurance_renewal_checked$/g, "insurance renewal checked")
    .replace(/_/g, " ")

  return normalized
}

function getTrackStyle(event: TimelineEvent) {
  if (event.entity_type === "survival_agent") {
    return {
      border: "border-l-blue-500",
      badge: "bg-blue-100 text-blue-700",
      dot: "bg-blue-500",
      label: "Survival Scan",
    }
  }

  if (
    event.entity_type === "invoice" ||
    event.action_type.includes("invoice") ||
    event.action_type.includes("payment") ||
    event.action_type.includes("receivable") ||
    event.action_type.includes("followup")
  ) {
    return {
      border: "border-l-teal-500",
      badge: "bg-teal-100 text-teal-700",
      dot: "bg-teal-500",
      label: "Collections",
    }
  }

  return {
    border: "border-l-zinc-400",
    badge: "bg-zinc-100 text-zinc-700",
    dot: "bg-zinc-400",
    label: "Support",
  }
}

function statusStyle(status: string) {
  switch (status) {
    case "executed":
      return "bg-emerald-100 text-emerald-700"
    case "pending":
      return "bg-amber-100 text-amber-700"
    case "failed":
      return "bg-red-100 text-red-600"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function modeStyle(mode: string) {
  switch (mode) {
    case "live":
      return "bg-emerald-100 text-emerald-700"
    case "misconfigured":
      return "bg-amber-100 text-amber-700"
    default:
      return "bg-zinc-100 text-zinc-700"
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function getBoolean(value: unknown): boolean {
  return value === true
}

function getRunMeta(outputPayload: unknown) {
  const payload = asRecord(outputPayload)
  return {
    mode: getString(payload.mode),
    warning: getString(payload.warning),
    summary: getString(payload.summary),
    degradedFromLive: getBoolean(payload.degradedFromLive),
  }
}

export default async function WorkflowPage() {
  const timeline = await db
    .select({
      id:           schema.aiActions.id,
      action_type:  schema.aiActions.actionType,
      input_summary: schema.aiActions.inputSummary,
      status:       schema.aiActions.status,
      created_at:   schema.aiActions.createdAt,
      entity_type:  schema.aiActions.entityType,
      output_payload_json: schema.aiActions.outputPayloadJson,
    })
    .from(schema.aiActions)
    .where(eq(schema.aiActions.organizationId, DEMO_ORG_ID))
    .orderBy(desc(schema.aiActions.createdAt))
    .limit(20)

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Workflow Timeline</h1>
        <p className="text-xs text-muted-foreground">
          Auditable run history for rescue actions, financing scout output, and supporting automation.
        </p>
      </div>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="space-y-1 pt-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">What this page must prove</p>
          <p>
            Judges should be able to see that the survival scan ran, what branch it executed,
            whether TinyFish was mock/live/degraded, and what recommendation came back.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border pb-3 pt-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Activity Timeline - {timeline.length} actions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {timeline.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No survival-scan events yet. Run the rescue queue or call
              <code className="mx-1 rounded bg-muted px-1 py-0.5 text-[10px]">POST /api/tinyfish/demo-run</code>
              to generate the first audit trail entry.
            </div>
          ) : (
            <div className="relative">
              <div className="absolute bottom-0 left-[7px] top-2 w-px bg-border" />

              <ul className="space-y-0">
                {timeline.map((event, index) => {
                  const track = getTrackStyle(event)
                  const meta = getRunMeta(event.output_payload_json)
                  return (
                    <li
                      key={event.id}
                      className={`relative pl-7 ${index < timeline.length - 1 ? "pb-5" : ""}`}
                    >
                      <span
                        className={`absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background ${track.dot}`}
                      />

                      <div className={`rounded-lg border border-border border-l-4 bg-card px-4 py-3 ${track.border}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${track.badge}`}>
                              {track.label}
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              {formatActionLabel(event.action_type)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusStyle(event.status)}`}>
                              {event.status}
                            </span>
                            {meta.mode ? (
                              <Badge variant="outline" className={`text-[10px] ${modeStyle(meta.mode)}`}>
                                {meta.mode}
                              </Badge>
                            ) : null}
                            {meta.degradedFromLive ? (
                              <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700">
                                degraded
                              </Badge>
                            ) : null}
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(event.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {meta.summary ?? event.input_summary ?? "No summary captured."}
                        </p>

                        {meta.warning ? (
                          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                            {meta.warning}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        <code>ai_actions</code> is the audit proof surface. Survival-scan runs should stay legible even when live TinyFish degrades.
      </p>
    </div>
  )
}
