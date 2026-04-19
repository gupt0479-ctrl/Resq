"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Zap,
  Mail,
  Globe,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { RiskBadge, type RiskLevel } from "@/components/RiskBadge"
import { InvestigationPanel } from "@/components/receivables/investigation-panel"
import type { RescueInvoice } from "@/lib/queries/rescue"

import type { CollectionsDecision, CustomerClassification } from "@/lib/schemas/collections-decision"

interface RunResult {
  actionType: string
  summary: string
  detail: string | null
  nextRecommendedStep?: string
  decision?: CollectionsDecision
}

const CLASSIFICATION_LABELS: Record<CustomerClassification, string> = {
  forgot:     "Forgot to pay",
  cash_flow:  "Cash flow issue",
  disputing:  "Disputing quality",
  bad_actor:  "Bad actor",
}

const CLASSIFICATION_STYLES: Record<CustomerClassification, string> = {
  forgot:    "bg-teal/10 text-teal border-teal/20",
  cash_flow: "bg-amber/10 text-amber border-amber/20",
  disputing: "bg-steel/10 text-steel border-steel/20",
  bad_actor: "bg-crimson/10 text-crimson border-crimson/20",
}

const STATE_LABELS: Record<RescueInvoice["rescueState"], string> = {
  detected:      "Risk Detected",
  investigating: "Investigating",
  action_taken:  "Action Taken",
  resolved:      "Resolved",
  escalated:     "Escalated",
}

const ACTION_LABELS: Record<string, string> = {
  receivable_risk_detected:  "Risk Flagged",
  customer_followup_sent:    "Follow-up Drafted",
  financing_options_scouted: "Financing Scouted",
  payment_plan_suggested:    "Plan Proposed",
  rescue_case_resolved:      "Case Escalated",
  dispute_clarification_sent: "Clarification Sent",
}

const ACTION_ICONS: Record<string, string> = {
  receivable_risk_detected:   "🔍",
  customer_followup_sent:     "✉️",
  financing_options_scouted:  "💰",
  payment_plan_suggested:     "📋",
  rescue_case_resolved:       "⚡",
  dispute_clarification_sent: "💬",
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 60) return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}

function stateFromActionType(
  actionType: string,
  current: RescueInvoice["rescueState"]
): RescueInvoice["rescueState"] {
  switch (actionType) {
    case "receivable_risk_detected":      return "investigating"
    case "customer_followup_sent":        return "action_taken"
    case "financing_options_scouted":     return "action_taken"
    case "payment_plan_suggested":        return "resolved"
    case "rescue_case_resolved":          return "resolved"
    default:                              return current
  }
}

function riskLevelFromCase(item: RescueInvoice): RiskLevel {
  if (item.daysOverdue > 60 || item.rescueState === "escalated") return "Critical"
  if (item.daysOverdue > 30) return "High"
  if (item.daysOverdue > 0)  return "Moderate"
  return "Stable"
}

function AgentTimeline({ trail, latestResult }: {
  trail: RescueInvoice["auditTrail"]
  latestResult?: RunResult
}) {
  type Entry = {
    actionType: string
    summary: string
    detail: string | null
    nextStep: string | null
    decision?: CollectionsDecision
    createdAt: string
    isNew: boolean
  }
  const steps: Entry[] = trail.map((s) => ({
    actionType: s.actionType,
    summary: s.inputSummary,
    detail: (s.outputPayload?.detail as string | null) ?? null,
    nextStep: (s.outputPayload?.nextRecommendedStep as string | null) ?? null,
    decision: (s.outputPayload?.decision as CollectionsDecision | undefined),
    createdAt: s.createdAt,
    isNew: false,
  }))
  if (latestResult && latestResult.actionType !== "already_resolved") {
    steps.push({
      actionType: latestResult.actionType,
      summary: latestResult.summary,
      detail: latestResult.detail,
      nextStep: latestResult.nextRecommendedStep ?? null,
      decision: latestResult.decision,
      createdAt: new Date().toISOString(),
      isNew: true,
    })
  }
  if (steps.length === 0) return null
  return (
    <div className="mt-6">
      <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-3">Agent Timeline</div>
      <div className="relative">
        <div className="absolute left-3 top-3 bottom-3 w-px bg-border" />
        <div className="space-y-2.5 pl-8">
          {steps.map((step, i) => (
            <TimelineStep key={i} step={step} isLast={i === steps.length - 1} isNew={step.isNew} />
          ))}
        </div>
      </div>
    </div>
  )
}

function TimelineStep({ step, isLast, isNew }: {
  step: {
    actionType: string
    summary: string
    detail: string | null
    nextStep: string | null
    decision?: CollectionsDecision
    createdAt: string
  }
  isLast: boolean
  isNew: boolean
}) {
  const [open, setOpen] = useState(isNew && isLast)
  const d = step.decision

  return (
    <div className={cn(
      "relative rounded-md border p-3 text-xs transition-all",
      isNew ? "border-foreground/20 bg-foreground/5 animate-in slide-in-from-bottom-2 duration-300" : "border-border bg-surface"
    )}>
      <div className={cn(
        "absolute -left-5 top-3.5 h-2 w-2 rounded-full border-2 border-background",
        isNew ? "bg-foreground" : "bg-steel/40"
      )} />
      <button className="w-full text-left" onClick={() => setOpen(v => !v)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span>{ACTION_ICONS[step.actionType] ?? "⚙️"}</span>
            <span className={cn("font-semibold", isNew ? "text-foreground" : "")}>
              {ACTION_LABELS[step.actionType] ?? step.actionType.replace(/_/g, " ")}
            </span>
            {d && (
              <span className={cn(
                "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                CLASSIFICATION_STYLES[d.classification]
              )}>
                {CLASSIFICATION_LABELS[d.classification]}
              </span>
            )}
            {d && (
              <span className="text-[10px] text-steel font-mono">
                {d.confidence}% confidence
              </span>
            )}
            {isNew && (
              <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-background">new</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-steel shrink-0">
            <span>{timeAgo(step.createdAt)}</span>
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </div>
        </div>
        <p className="mt-1 text-steel leading-relaxed">{step.summary}</p>
      </button>

      {open && (
        <div className="mt-2 border-t border-border pt-2 space-y-3">
          {/* Human review banner */}
          {d?.humanReviewFlag && (
            <div className="flex items-start gap-2 rounded-md border border-amber/30 bg-amber/10 px-3 py-2 text-[11.5px] text-amber">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Flagged for human review</span>
                {d.humanReviewReason && <span className="ml-1 text-amber/80">— {d.humanReviewReason}</span>}
              </div>
            </div>
          )}

          {/* Structured agent reasoning - "agent working" format */}
          {d && (
            <div className="space-y-3">
              {/* Assessment block */}
              <div>
                <div className="text-[9px] uppercase tracking-[0.18em] text-steel mb-1.5">Assessment</div>
                <div className="rounded-md bg-surface-muted px-3 py-2.5 space-y-1.5 text-[12px]">
                  {d.chainOfThought && (
                    <p className="leading-relaxed text-foreground/90">{d.chainOfThought}</p>
                  )}
                  {d.confidence && (
                    <p className="text-steel">
                      <span className="font-medium text-foreground/70">Confidence:</span> {d.confidence}%
                    </p>
                  )}
                </div>
              </div>

              {/* Portal Reconnaissance */}
              {d.portalReconnaissance && (
                <PortalReconSection recon={d.portalReconnaissance} dataSource={d.externalSignals?.dataSource} />
              )}

              {/* Action block */}
              <div>
                <div className="text-[9px] uppercase tracking-[0.18em] text-steel mb-1.5">Action</div>
                <div className="rounded-md bg-surface-muted px-3 py-2.5 space-y-1.5 text-[12px]">
                  <p className="text-foreground/90">
                    <span className="font-medium">Selected action:</span> {d.selectedAction.replace(/_/g, " ")}
                  </p>
                  <p className="text-foreground/90">
                    <span className="font-medium">Channel:</span> {d.channel}
                  </p>
                  <p className="text-foreground/90">
                    <span className="font-medium">Tone:</span> {d.tone}
                  </p>
                </div>
              </div>

              {/* Contingency block */}
              {d.responsePlan && (
                <div>
                  <div className="text-[9px] uppercase tracking-[0.18em] text-steel mb-1.5">Contingency</div>
                  <div className="rounded-md bg-surface-muted px-3 py-2.5 space-y-1.5 text-[12px]">
                    <p className="text-foreground/90">
                      <span className="font-medium">If no reply:</span> {d.responsePlan.noReply}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Outreach draft */}
          {(step.detail || d?.outreachDraft) && (
            <div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-steel mb-1.5">Message drafted</div>
              <pre className="whitespace-pre-wrap font-sans leading-relaxed text-[12px] rounded-md bg-surface-muted px-3 py-2.5">
                {d?.outreachDraft ?? step.detail}
              </pre>
            </div>
          )}

          {/* External signals */}
          {d?.externalSignals && (
            <div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-steel mb-1.5 flex items-center gap-1.5">
                📡 External signals
                <span className="font-mono text-[8px] bg-surface-muted px-1 py-0.5 rounded">{d.externalSignals.dataSource}</span>
                {d.externalSignals.distressFlag && (
                  <span className="text-crimson font-semibold text-[9px]">⚠ distress detected</span>
                )}
              </div>
              {/* AI news summary */}
              <p className={`text-[12px] leading-relaxed mb-2 ${d.externalSignals.distressFlag ? "text-crimson font-medium" : "text-foreground"}`}>
                {d.externalSignals.newsSummary ?? (d.externalSignals as unknown as { summary?: string }).summary ?? "—"}
              </p>
              {/* Raw snippets */}
              {(d.externalSignals.rawSnippets ?? []).length > 0 && (
                <div className="space-y-1.5">
                  {(d.externalSignals.rawSnippets ?? []).map((s, i) => (
                    <div key={i} className="rounded bg-surface-muted px-3 py-2 text-[11px] text-steel leading-relaxed">
                      <span className="font-mono text-[9px] text-steel/50 mr-1.5">[{i + 1}]</span>{s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Full response plan (collapsed by default, shown on expand) */}
          {d?.responsePlan && (
            <div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-steel mb-1.5">Full response plan</div>
              <div className="space-y-1">
                {([
                  ["No reply", d.responsePlan.noReply],
                  ["Customer disputes", d.responsePlan.dispute],
                  ["Partial payment", d.responsePlan.partialPayment],
                ] as [string, string][]).map(([label, text]) => (
                  <div key={label} className="flex items-start gap-2 text-[12px]">
                    <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-steel" />
                    <span><span className="font-medium text-foreground/70">{label}:</span> <span className="text-foreground/80">{text}</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Portal Reconnaissance Card (inline, always visible after agent run) ───

function PortalReconCard({ recon }: {
  recon: NonNullable<CollectionsDecision["portalReconnaissance"]>
}) {
  return (
    <div className="mt-6 rounded-lg border border-foreground/10 bg-surface overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface-muted">
        <Globe className="h-3.5 w-3.5 text-steel" />
        <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-steel">Portal Reconnaissance</span>
        <span className="ml-auto font-mono text-[9px] text-steel/60">mock</span>
      </div>
      <div className="px-4 py-4 space-y-4">
        {/* Status pills row */}
        <div className="flex flex-wrap gap-2">
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
            recon.visibility ? "bg-teal/10 text-teal border-teal/20" : "bg-crimson/10 text-crimson border-crimson/20"
          )}>
            {recon.visibility ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            Invoice {recon.visibility ? "visible in portal" : "NOT visible in portal"}
          </span>

          <span className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize",
            recon.paymentStatus === "paid" || recon.paymentStatus === "processing"
              ? "bg-teal/10 text-teal border-teal/20"
              : recon.paymentStatus === "unpaid" || recon.paymentStatus === "failed"
              ? "bg-crimson/10 text-crimson border-crimson/20"
              : "bg-steel/10 text-steel border-steel/20"
          )}>
            {recon.paymentStatus === "processing" ? "⏳ " : recon.paymentStatus === "paid" ? "✓ " : ""}
            {recon.paymentStatus}
          </span>

          <span className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize",
            recon.engagementLevel === "high" ? "bg-teal/10 text-teal border-teal/20"
            : recon.engagementLevel === "medium" ? "bg-amber/10 text-amber border-amber/20"
            : "bg-steel/10 text-steel border-steel/20"
          )}>
            {recon.engagementLevel} engagement
          </span>

          {recon.hasRecentActivity && (
            <span className="inline-flex items-center rounded-full border border-teal/20 bg-teal/10 px-2.5 py-1 text-[11px] font-semibold text-teal">
              Active recently
            </span>
          )}
        </div>

        {/* Key signals */}
        <div className="grid grid-cols-2 gap-3 text-[12px]">
          {recon.shouldSkipCollection && (
            <div className="col-span-2 rounded-md bg-teal/10 border border-teal/20 px-3 py-2.5 text-teal font-medium">
              Payment already processing — collection skipped automatically
            </div>
          )}
          {recon.messageSent && (
            <div className="col-span-2 rounded-md bg-teal/10 border border-teal/20 px-3 py-2.5 text-teal font-medium">
              ✉ Message sent via customer portal
            </div>
          )}
          <div className="rounded-md bg-surface-muted px-3 py-2">
            <div className="text-[10px] text-steel mb-0.5">Confidence</div>
            <div className="font-semibold">{recon.confidence}%</div>
          </div>
          <div className="rounded-md bg-surface-muted px-3 py-2">
            <div className="text-[10px] text-steel mb-0.5">Portal activity</div>
            <div className="font-semibold">{recon.hasRecentActivity ? "Within 7 days" : "None recent"}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Portal Reconnaissance Section ─────────────────────────────────────────

const VISIBILITY_STYLES: Record<string, string> = {
  true:  "bg-teal/10 text-teal border-teal/20",
  false: "bg-crimson/10 text-crimson border-crimson/20",
}

const PAYMENT_STYLES: Record<string, string> = {
  paid:       "bg-teal/10 text-teal border-teal/20",
  processing: "bg-amber/10 text-amber border-amber/20",
  unpaid:     "bg-crimson/10 text-crimson border-crimson/20",
  failed:     "bg-crimson/10 text-crimson border-crimson/20",
  unknown:    "bg-steel/10 text-steel border-steel/20",
}

const ENGAGEMENT_STYLES: Record<string, string> = {
  high:   "bg-teal/10 text-teal border-teal/20",
  medium: "bg-amber/10 text-amber border-amber/20",
  low:    "bg-steel/10 text-steel border-steel/20",
  none:   "bg-steel/10 text-steel border-steel/20",
}

const MODE_STYLES: Record<string, string> = {
  live:          "bg-teal/10 text-teal border-teal/20",
  mock:          "bg-steel/10 text-steel border-steel/20",
  misconfigured: "bg-amber/10 text-amber border-amber/20",
}

function PortalReconSection({ recon, dataSource }: {
  recon: NonNullable<CollectionsDecision["portalReconnaissance"]>
  dataSource?: "live" | "mock"
}) {
  const mode = dataSource ?? "mock"

  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.18em] text-steel mb-1.5 flex items-center gap-1.5">
        <Globe className="h-3 w-3" />
        Portal reconnaissance
        <span className={cn(
          "rounded-full border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide",
          MODE_STYLES[mode] ?? MODE_STYLES.mock
        )}>
          {mode}
        </span>
      </div>
      <div className="rounded-md bg-surface-muted px-3 py-2.5 space-y-2">
        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Visibility */}
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
            VISIBILITY_STYLES[String(recon.visibility)]
          )}>
            {recon.visibility
              ? <><Eye className="h-2.5 w-2.5" /> Visible</>
              : <><EyeOff className="h-2.5 w-2.5" /> Not visible</>}
          </span>

          {/* Payment status */}
          <span className={cn(
            "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
            PAYMENT_STYLES[recon.paymentStatus] ?? PAYMENT_STYLES.unknown
          )}>
            {recon.paymentStatus}
          </span>

          {/* Engagement level */}
          <span className={cn(
            "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
            ENGAGEMENT_STYLES[recon.engagementLevel] ?? ENGAGEMENT_STYLES.none
          )}>
            {recon.engagementLevel} engagement
          </span>

          {/* Skip collection flag */}
          {recon.shouldSkipCollection && (
            <span className="rounded-full border border-teal/20 bg-teal/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-teal">
              skip collection
            </span>
          )}

          {/* Message sent */}
          {recon.messageSent && (
            <span className="rounded-full border border-teal/20 bg-teal/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-teal">
              ✉ portal msg sent
            </span>
          )}
        </div>

        {/* Confidence */}
        {recon.confidence > 0 && (
          <p className="text-[11px] text-steel">
            <span className="font-medium text-foreground/70">Confidence:</span> {recon.confidence}%
            {recon.hasRecentActivity && <span className="ml-2">· Recent portal activity</span>}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

type Filter = "all" | "collections" | "high"

export function RescueClient({ initialQueue }: { initialQueue: RescueInvoice[] }) {
  const [queue, setQueue]           = useState(initialQueue)
  const [selectedId, setSelectedId] = useState<string>(initialQueue[0]?.id ?? "")
  const [filter, setFilter]         = useState<Filter>("all")
  const [running, setRunning]       = useState<string | null>(null)
  const [results, setResults]       = useState<Record<string, RunResult>>({})
  const [reminderLoading, setReminderLoading] = useState<string | null>(null)
  const [reminderDone, setReminderDone]       = useState<Record<string, { hostedUrl?: string; emailSent?: boolean }>>({})
  const [reminderError, setReminderError]     = useState<Record<string, string>>({})
  const [executeLoading, setExecuteLoading]   = useState<string | null>(null)
  const [executeDone, setExecuteDone]         = useState<Record<string, { channel: string; tone: string; mode: string }>>({})
  const [executeError, setExecuteError]       = useState<Record<string, string>>({})
  const router = useRouter()

  const filtered = queue.filter(item => {
    if (filter === "collections") return item.daysOverdue > 0
    if (filter === "high")        return item.daysOverdue > 30
    return true
  })

  const selected = filtered.find(i => i.id === selectedId) ?? filtered[0] ?? null

  const totalAtRisk  = queue.reduce((s, i) => s + i.amount, 0)
  const overdueCount = queue.filter(i => i.daysOverdue > 0).length
  const activeCount  = queue.filter(i => i.rescueState === "investigating" || i.rescueState === "action_taken").length

  async function sendReminder(invoiceId: string) {
    setReminderLoading(invoiceId)
    setReminderError(prev => { const n = { ...prev }; delete n[invoiceId]; return n })
    try {
      const res  = await fetch("/api/receivables/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ invoiceId }),
      })
      const json = await res.json() as { ok: boolean; hostedUrl?: string; emailSent?: boolean; error?: string }
      if (!json.ok) throw new Error(json.error ?? "Failed")
      setReminderDone(prev => ({ ...prev, [invoiceId]: { hostedUrl: json.hostedUrl, emailSent: json.emailSent } }))
    } catch (e) {
      setReminderError(prev => ({ ...prev, [invoiceId]: e instanceof Error ? e.message : "Error" }))
    } finally {
      setReminderLoading(null)
    }
  }

  async function executeAgentDecision(invoiceId: string, decision: CollectionsDecision, customerEmail?: string) {
    setExecuteLoading(invoiceId)
    setExecuteError(prev => { const n = { ...prev }; delete n[invoiceId]; return n })
    try {
      const res  = await fetch("/api/receivables/send-reminder", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          invoiceId,
          channel:       decision.channel,
          tone:          decision.tone,
          outreachDraft: decision.outreachDraft,
          customerEmail,
        }),
      })
      const json = await res.json() as { ok: boolean; channel?: string; tone?: string; mode?: string; error?: string }
      if (!json.ok) throw new Error(json.error ?? "Failed")
      setExecuteDone(prev => ({ ...prev, [invoiceId]: { channel: json.channel ?? decision.channel, tone: json.tone ?? decision.tone, mode: json.mode ?? "mock" } }))
      router.refresh()
    } catch (e) {
      setExecuteError(prev => ({ ...prev, [invoiceId]: e instanceof Error ? e.message : "Error" }))
    } finally {
      setExecuteLoading(null)
    }
  }

  async function runAgent(invoiceId: string) {
    setRunning(invoiceId)
    try {
      const res  = await fetch(`/api/rescue/${invoiceId}/run`, { method: "POST" })
      const data: RunResult = await res.json()
      setResults(prev => ({ ...prev, [invoiceId]: data }))
      router.refresh()
      setQueue(prev => prev.map(item => {
        if (item.id !== invoiceId) return item
        return {
          ...item,
          rescueState:    stateFromActionType(data.actionType, item.rescueState),
          lastActionType: data.actionType,
          lastActionAt:   new Date().toISOString(),
        }
      }))
    } catch {
      setResults(prev => ({
        ...prev,
        [invoiceId]: { actionType: "error", summary: "Failed to run agent. Try again.", detail: "", nextRecommendedStep: undefined },
      }))
    } finally {
      setRunning(null)
    }
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all",         label: "All" },
    { key: "collections", label: "Collections" },
    { key: "high",        label: "High urgency" },
  ]

  return (
    <div className="p-8 lg:p-10 max-w-[1280px] mx-auto">
      {/* Page header */}
      <div className="mb-10">
        <div className="text-[11px] uppercase tracking-[0.18em] text-steel">Collections · recovery</div>
        <h1 className="font-display text-2xl lg:text-3xl mt-1">Rescue Queue</h1>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card-elevated p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-steel">At-risk receivables</div>
          <div className="font-display text-2xl mt-1 text-amber">{fmt(totalAtRisk)}</div>
          <div className="text-[11.5px] text-steel mt-1">Needs recovery action</div>
        </div>
        <div className="card-elevated p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Overdue invoices</div>
          <div className="font-display text-2xl mt-1">{overdueCount}</div>
          <div className="text-[11.5px] text-steel mt-1">Past due date</div>
        </div>
        <div className="card-elevated p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Active cases</div>
          <div className="font-display text-2xl mt-1">{activeCount}</div>
          <div className="text-[11.5px] text-steel mt-1">In recovery workflow</div>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="card-elevated p-12 flex flex-col items-center gap-3 text-center">
          <CheckCircle className="h-8 w-8 text-teal" />
          <p className="font-medium">No at-risk receivables</p>
          <p className="text-[12.5px] text-steel">All invoices are current — check back later.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left: case list */}
          <div className="lg:col-span-5">
            {/* Filter tabs */}
            <div className="flex gap-1 mb-3">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => { setFilter(f.key); const first = queue.filter(i => f.key === "all" ? true : f.key === "collections" ? i.daysOverdue > 0 : i.daysOverdue > 30)[0]; if (first) setSelectedId(first.id) }}
                  className={cn(
                    "px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors",
                    filter === f.key
                      ? "bg-foreground text-background"
                      : "text-steel hover:text-foreground hover:bg-surface-muted"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {filtered.map((item, idx) => {
                const level  = riskLevelFromCase(item)
                const active = item.id === selectedId
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      "w-full text-left rounded-md border bg-card transition-all px-4 py-3.5",
                      active
                        ? "border-l-4 border-l-foreground border-y-border border-r-border shadow-sm"
                        : "border-border hover:bg-surface-muted"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {idx === 0 && filter === "all" && (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber shrink-0" />
                          )}
                          <div className="font-medium text-[13.5px] truncate">{item.customerName}</div>
                        </div>
                        <div className="text-[11.5px] text-steel mt-0.5 font-mono">#{item.invoiceNumber}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-display text-base leading-none">{fmt(item.amount)}</div>
                        {item.daysOverdue > 0 && (
                          <div className="text-[11px] text-crimson mt-1">{item.daysOverdue}d overdue</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <RiskBadge level={level} />
                      <span className="text-[11px] text-steel capitalize">{STATE_LABELS[item.rescueState]}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right: detail panel */}
          {selected && (() => {
            const isRunning = running === selected.id
            const result    = results[selected.id]
            const level     = riskLevelFromCase(selected)
            return (
              <div className="lg:col-span-7">
                <div className="card-elevated p-6 lg:p-8">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Recovery case</div>
                      <h2 className="font-display text-2xl mt-1">{selected.customerName}</h2>
                      <div className="font-mono text-[12px] text-steel mt-1">#{selected.invoiceNumber}</div>
                    </div>
                    <RiskBadge level={level} />
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-3 mt-6">
                    <div className="rounded-md border border-border bg-surface p-4">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Balance</div>
                      <div className={cn("font-display text-xl mt-1", selected.daysOverdue > 0 ? "text-amber" : "")}>
                        {fmt(selected.amount)}
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-surface p-4">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Days overdue</div>
                      <div className={cn("font-display text-xl mt-1", selected.daysOverdue > 0 ? "text-crimson" : "")}>
                        {selected.daysOverdue > 0 ? `${selected.daysOverdue}d` : "—"}
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-surface p-4">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-steel">State</div>
                      <div className="font-display text-xl mt-1 capitalize text-[15px]">
                        {STATE_LABELS[selected.rescueState]}
                      </div>
                    </div>
                  </div>

                  {/* Due date context */}
                  {selected.dueDate && (
                    <div className="mt-4 flex items-center gap-2 text-[12.5px] text-steel">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      Due {new Date(selected.dueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      {selected.lastActionAt && (
                        <span className="ml-auto">Last action {timeAgo(selected.lastActionAt)}</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => runAgent(selected.id)}
                        disabled={isRunning || running !== null}
                        className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-[12.5px] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {isRunning
                          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running…</>
                          : <><Zap className="h-3.5 w-3.5" /> Run Agent</>}
                      </button>

                    <InvestigationPanel
                      invoiceId={selected.id}
                      invoiceNumber={selected.invoiceNumber}
                      customerName={selected.customerName}
                      balance={selected.amount}
                      daysOverdue={selected.daysOverdue}
                    />

                    {/* Send Reminder */}
                    {reminderDone[selected.id] ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[12px] text-teal font-medium">
                          {reminderDone[selected.id].emailSent ? "✓ Reminder emailed" : "✓ Invoice created"}
                        </span>
                        {reminderDone[selected.id].hostedUrl && (
                          <a href={reminderDone[selected.id].hostedUrl} target="_blank" rel="noreferrer" className="text-[11.5px] text-steel underline hover:text-foreground">
                            View invoice →
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => sendReminder(selected.id)}
                          disabled={reminderLoading === selected.id}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-[12.5px] font-semibold transition-colors hover:bg-surface-muted disabled:opacity-50"
                        >
                          {reminderLoading === selected.id
                            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
                            : <><Mail className="h-3.5 w-3.5" /> Send Reminder</>}
                        </button>
                        {reminderError[selected.id] && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11.5px] text-crimson font-medium">
                              {reminderError[selected.id].includes("frequency") && "⏱ "}
                              {reminderError[selected.id].includes("Time restriction") && "🕐 "}
                              {reminderError[selected.id].includes("do-not-contact") && "🚫 "}
                              {reminderError[selected.id].includes("requires approval") && "⚠️ "}
                              {reminderError[selected.id]}
                            </span>
                            {reminderError[selected.id].includes("requires approval") && (
                              <span className="text-[11px] text-steel">Contact your manager to approve this action</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Portal Reconnaissance Card — shown inline after agent runs */}
                  {result?.decision?.portalReconnaissance && (
                    <PortalReconCard recon={result.decision.portalReconnaissance} />
                  )}

                  {/* Execute Agent Recommendation */}
                  {result?.decision && !result.decision.portalReconnaissance?.shouldSkipCollection && (
                    <div className="mt-4">
                      {executeDone[selected.id] ? (
                        <div className="flex items-center gap-2 rounded-md border border-teal/20 bg-teal/10 px-4 py-2.5 text-[12.5px] text-teal font-medium">
                          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                          Sent via {executeDone[selected.id].channel} · {executeDone[selected.id].tone} tone
                          <span className="ml-auto font-mono text-[10px] opacity-70">{executeDone[selected.id].mode}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => executeAgentDecision(selected.id, result.decision!, selected.customerEmail)}
                          disabled={executeLoading === selected.id}
                          className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-[12.5px] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {executeLoading === selected.id
                            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
                            : <><Mail className="h-3.5 w-3.5" /> Send {result.decision.tone} {result.decision.channel === "email" || result.decision.channel === "formal_notice" ? "email" : result.decision.channel}</>}
                        </button>
                      )}
                      {executeError[selected.id] && (
                        <p className="mt-1.5 text-[11.5px] text-crimson">{executeError[selected.id]}</p>
                      )}
                    </div>
                  )}

                  {/* Timeline */}
                  <AgentTimeline trail={selected.auditTrail} latestResult={result} />

                  {selected.auditTrail.length === 0 && !result && (
                    <div className="mt-6 rounded-md border border-border bg-surface p-4 text-[12.5px] text-steel">
                      No agent actions yet. Click <strong className="text-foreground">Run Agent</strong> to begin automated recovery.
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
