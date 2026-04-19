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
  Loader2,
  Zap,
  Mail,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { RiskBadge, type RiskLevel } from "@/components/RiskBadge"
import { InvestigationPanel } from "@/components/receivables/investigation-panel"
import type { RescueInvoice } from "@/lib/queries/rescue"
import { SurvivalScanPanel } from "@/components/rescue/SurvivalScanPanel"

interface RunResult {
  actionType: string
  summary: string
  detail: string | null
  nextRecommendedStep?: string
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
  rescue_case_resolved:      "Case Resolved",
}

const ACTION_ICONS: Record<string, string> = {
  receivable_risk_detected:  "🔍",
  customer_followup_sent:    "✉️",
  financing_options_scouted: "💰",
  payment_plan_suggested:    "📋",
  rescue_case_resolved:      "✅",
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
  type Entry = { actionType: string; summary: string; detail: string | null; nextStep: string | null; createdAt: string; isNew: boolean }
  const steps: Entry[] = trail.map((s) => ({
    actionType: s.actionType,
    summary: s.inputSummary,
    detail: (s.outputPayload?.detail as string | null) ?? null,
    nextStep: (s.outputPayload?.nextRecommendedStep as string | null) ?? null,
    createdAt: s.createdAt,
    isNew: false,
  }))
  if (latestResult && latestResult.actionType !== "already_resolved") {
    steps.push({
      actionType: latestResult.actionType,
      summary: latestResult.summary,
      detail: latestResult.detail,
      nextStep: latestResult.nextRecommendedStep ?? null,
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
  step: { actionType: string; summary: string; detail: string | null; nextStep: string | null; createdAt: string }
  isLast: boolean
  isNew: boolean
}) {
  const [open, setOpen] = useState(isNew && isLast)
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
          <div className="flex items-center gap-2">
            <span>{ACTION_ICONS[step.actionType] ?? "⚙️"}</span>
            <span className={cn("font-semibold", isNew ? "text-foreground" : "")}>
              {ACTION_LABELS[step.actionType] ?? step.actionType.replace(/_/g, " ")}
            </span>
            {isNew && (
              <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-background">new</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-steel">
            <span>{timeAgo(step.createdAt)}</span>
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </div>
        </div>
        <p className="mt-1 text-steel leading-relaxed">{step.summary}</p>
      </button>
      {open && step.detail && (
        <div className="mt-2 border-t border-border pt-2">
          <pre className="whitespace-pre-wrap font-sans leading-relaxed text-[12px]">{step.detail}</pre>
          {step.nextStep && (
            <div className="mt-2 flex items-start gap-1.5 text-steel">
              <ArrowRight className="mt-0.5 h-3 w-3 shrink-0" />
              <span>Next: {step.nextStep}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type Filter = "all" | "collections" | "high"

export function RescueClient({ initialQueue }: { initialQueue: RescueInvoice[] }) {
  const [queue, setQueue]           = useState(initialQueue)
  const [selectedId, setSelectedId] = useState<string>(initialQueue[0]?.id ?? "")
  const [filter, setFilter]         = useState<Filter>("all")
  const [running, setRunning]       = useState<string | null>(null)
  const [results, setResults]       = useState<Record<string, RunResult>>({})
  const [reminderLoading, setReminderLoading] = useState<string | null>(null)
  const [reminderDone, setReminderDone]       = useState<Record<string, { hostedUrl?: string; emailSent?: boolean; mode?: string }>>({})
  const [reminderError, setReminderError]     = useState<Record<string, string>>({})
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
      const json = await res.json() as { ok: boolean; hostedUrl?: string; emailSent?: boolean; mode?: string; error?: string }
      if (!json.ok) throw new Error(json.error ?? "Failed")
      setReminderDone(prev => ({ ...prev, [invoiceId]: { hostedUrl: json.hostedUrl, emailSent: json.emailSent, mode: json.mode } }))
    } catch (e) {
      setReminderError(prev => ({ ...prev, [invoiceId]: e instanceof Error ? e.message : "Error" }))
    } finally {
      setReminderLoading(null)
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

      {/* Survival scan — async progress UX */}
      <div className="mb-8">
        <SurvivalScanPanel />
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
                    {selected.rescueState !== "resolved" && selected.rescueState !== "escalated" ? (
                      <button
                        onClick={() => runAgent(selected.id)}
                        disabled={isRunning || running !== null}
                        className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-[12.5px] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {isRunning
                          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running…</>
                          : <><Zap className="h-3.5 w-3.5" /> Run Agent</>}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-teal/30 bg-teal/10 px-4 py-2 text-[12.5px] font-medium text-teal">
                        <CheckCircle className="h-3.5 w-3.5" /> Resolved
                      </span>
                    )}

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
                          {reminderDone[selected.id].mode && reminderDone[selected.id].mode !== "live" && (
                            <span className="ml-1.5 text-[10px] text-steel uppercase">{reminderDone[selected.id].mode}</span>
                          )}
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
                          <span className="text-[11.5px] text-crimson">{reminderError[selected.id]}</span>
                        )}
                      </div>
                    )}
                  </div>

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
