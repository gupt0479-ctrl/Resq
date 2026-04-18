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
  TrendingDown,
  Zap,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { InvestigationPanel } from "@/components/receivables/investigation-panel"
import type { RescueInvoice } from "@/lib/queries/rescue"

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

const STATE_COLORS: Record<RescueInvoice["rescueState"], string> = {
  detected:      "bg-red-100 text-red-700 border-red-200",
  investigating: "bg-amber-100 text-amber-700 border-amber-200",
  action_taken:  "bg-blue-100 text-blue-700 border-blue-200",
  resolved:      "bg-emerald-100 text-emerald-700 border-emerald-200",
  escalated:     "bg-purple-100 text-purple-700 border-purple-200",
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

// ── Agent Timeline (audit trail visualization) ────────────────────────────────

function AgentTimeline({ trail, latestResult }: {
  trail: RescueInvoice["auditTrail"]
  latestResult?: RunResult
}) {
  type TimelineEntry = {
    actionType: string; summary: string; detail: string | null
    nextStep: string | null; createdAt: string; isNew: boolean
  }
  const allSteps: TimelineEntry[] = trail.map((step) => ({
    actionType: step.actionType,
    summary: step.inputSummary,
    detail: (step.outputPayload?.detail as string | null) ?? null,
    nextStep: (step.outputPayload?.nextRecommendedStep as string | null) ?? null,
    createdAt: step.createdAt,
    isNew: false,
  }))

  if (latestResult && latestResult.actionType !== "already_resolved") {
    allSteps.push({
      actionType: latestResult.actionType,
      summary: latestResult.summary,
      detail: latestResult.detail,
      nextStep: latestResult.nextRecommendedStep ?? null,
      createdAt: new Date().toISOString(),
      isNew: true,
    })
  }

  if (allSteps.length === 0) return null

  return (
    <div className="mt-3 space-y-0">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Agent Timeline
      </p>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-3 top-3 bottom-3 w-px bg-border" />
        <div className="space-y-3 pl-8">
          {allSteps.map((step, idx) => (
            <TimelineStep
              key={idx}
              step={step}
              isLast={idx === allSteps.length - 1}
              isNew={step.isNew}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function TimelineStep({
  step,
  isLast,
  isNew,
}: {
  step: { actionType: string; summary: string; detail: string | null; nextStep: string | null; createdAt: string }
  isLast: boolean
  isNew: boolean
}) {
  const [open, setOpen] = useState(isNew && isLast)

  return (
    <div className={`relative rounded-lg border p-3 text-xs transition-all ${
      isNew
        ? "border-primary/30 bg-primary/5 animate-in slide-in-from-bottom-2 duration-300"
        : "border-border bg-card"
    }`}>
      {/* Dot on timeline */}
      <div className={`absolute -left-5 top-3.5 h-2.5 w-2.5 rounded-full border-2 border-background ${
        isNew ? "bg-primary" : "bg-muted-foreground/40"
      }`} />

      <button
        className="w-full text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">{ACTION_ICONS[step.actionType] ?? "⚙️"}</span>
            <span className={`font-semibold ${isNew ? "text-primary" : "text-foreground"}`}>
              {ACTION_LABELS[step.actionType] ?? step.actionType.replace(/_/g, " ")}
            </span>
            {isNew && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-foreground">
                new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>{timeAgo(step.createdAt)}</span>
            {open
              ? <ChevronDown className="h-3 w-3" />
              : <ChevronRight className="h-3 w-3" />
            }
          </div>
        </div>
        <p className="mt-1 text-muted-foreground leading-relaxed">{step.summary}</p>
      </button>

      {open && step.detail && (
        <div className="mt-2 border-t border-border pt-2">
          <pre className="whitespace-pre-wrap font-sans leading-relaxed text-foreground">{step.detail}</pre>
          {step.nextStep && (
            <div className="mt-2 flex items-start gap-1.5 text-muted-foreground">
              <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              <span>Next: {step.nextStep}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function RescueClient({ initialQueue }: { initialQueue: RescueInvoice[] }) {
  const [queue, setQueue] = useState(initialQueue)
  const [running, setRunning] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, RunResult>>({})
  const [expanded, setExpanded] = useState<string | null>(
    // Auto-expand the highest-risk item that has an existing audit trail
    initialQueue.find((i) => i.auditTrail.length > 0)?.id ?? null
  )
  const router = useRouter()

  const totalAtRisk = queue.reduce((s, i) => s + i.amount, 0)
  const overdueCount = queue.filter((i) => i.daysOverdue > 0).length
  const activeCount = queue.filter(
    (i) => i.rescueState === "investigating" || i.rescueState === "action_taken"
  ).length

  async function runAgent(invoiceId: string) {
    setRunning(invoiceId)
    setExpanded(invoiceId)
    try {
      const res = await fetch(`/api/rescue/${invoiceId}/run`, { method: "POST" })
      const data: RunResult = await res.json()
      setResults((prev) => ({ ...prev, [invoiceId]: data }))
      router.refresh()
      setQueue((prev) =>
        prev.map((item) => {
          if (item.id !== invoiceId) return item
          const nextState = stateFromActionType(data.actionType, item.rescueState)
          return {
            ...item,
            rescueState: nextState,
            lastActionType: data.actionType,
            lastActionAt: new Date().toISOString(),
          }
        })
      )
    } catch {
      setResults((prev) => ({
        ...prev,
        [invoiceId]: {
          actionType: "error",
          summary: "Failed to run agent. Try again.",
          detail: "",
          nextRecommendedStep: undefined,
        },
      }))
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Cashflow Rescue
          </h1>
          <p className="text-xs text-muted-foreground">
            Autonomous recovery — detect overdue receivables, draft outreach, surface financing, propose plans
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-2xl font-bold text-red-700">{fmt(totalAtRisk)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Total at-risk receivables</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-2xl font-bold text-amber-700">{overdueCount}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Overdue invoices</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-2xl font-bold text-blue-700">{activeCount}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Active recovery cases</p>
        </div>
      </div>

      {/* Queue */}
      {queue.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
            <p className="text-sm font-medium text-foreground">No at-risk receivables</p>
            <p className="text-xs text-muted-foreground">
              All invoices are current — check back later.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="border-b border-border pb-3 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Recovery Queue — ranked by risk score
              </CardTitle>
              <span className="text-[10px] text-muted-foreground">
                {queue.length} case{queue.length !== 1 ? "s" : ""}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {queue.map((item, idx) => {
                const isRunning = running === item.id
                const result = results[item.id]
                const isExpanded = expanded === item.id

                return (
                  <li
                    key={item.id}
                    className={`px-4 py-4 transition-colors ${
                      isExpanded ? "bg-muted/30" : "hover:bg-muted/20"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Rank badge */}
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        idx === 0
                          ? "bg-red-100 text-red-700"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {idx === 0 ? <AlertTriangle className="h-4 w-4" /> : `#${idx + 1}`}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        {/* Row 1: name + invoice + state */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            className="text-sm font-semibold text-foreground hover:text-primary"
                            onClick={() => setExpanded(isExpanded ? null : item.id)}
                          >
                            {item.customerName}
                          </button>
                          <span className="text-xs text-muted-foreground">
                            #{item.invoiceNumber}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold ${STATE_COLORS[item.rescueState]}`}
                          >
                            {STATE_LABELS[item.rescueState]}
                          </Badge>
                        </div>

                        {/* Row 2: amount, days overdue, last action */}
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {fmt(item.amount)}
                          </span>
                          {item.daysOverdue > 0 && (
                            <span className="font-medium text-red-600">
                              {item.daysOverdue}d overdue
                            </span>
                          )}
                          {item.dueDate && (
                            <span>
                              due{" "}
                              {new Date(item.dueDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                          {item.lastActionType && item.lastActionAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {ACTION_LABELS[item.lastActionType] ?? item.lastActionType} ·{" "}
                              {timeAgo(item.lastActionAt)}
                            </span>
                          )}
                        </div>

                        {/* Row 3: audit trail pills */}
                        {item.auditTrail.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.auditTrail.map((step, i) => (
                              <span
                                key={i}
                                className="flex items-center gap-0.5 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                              >
                                <span>{ACTION_ICONS[step.actionType] ?? "⚙️"}</span>
                                {ACTION_LABELS[step.actionType] ?? step.actionType}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Expanded: agent timeline */}
                        {isExpanded && (
                          <AgentTimeline
                            trail={item.auditTrail}
                            latestResult={result}
                          />
                        )}

                        {!isExpanded && item.auditTrail.length > 0 && (
                          <button
                            onClick={() => setExpanded(item.id)}
                            className="mt-1.5 text-[11px] text-primary hover:underline"
                          >
                            View agent timeline →
                          </button>
                        )}
                      </div>

                      {/* Right: action buttons */}
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {item.rescueState !== "resolved" && item.rescueState !== "escalated" ? (
                          <button
                            onClick={() => runAgent(item.id)}
                            disabled={isRunning || running !== null}
                            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                          >
                            {isRunning ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Zap className="h-3.5 w-3.5" />
                            )}
                            {isRunning ? "Running…" : "Run Agent"}
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Resolved
                          </span>
                        )}

                        <InvestigationPanel
                          invoiceId={item.id}
                          invoiceNumber={item.invoiceNumber}
                          customerName={item.customerName}
                          balance={item.amount}
                          daysOverdue={item.daysOverdue}
                        />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <p className="text-[11px] text-muted-foreground">
        Each "Run Agent" step advances the recovery state machine: detect → follow-up → financing
        → payment plan → resolve. Every action is logged to the audit trail.
      </p>
    </div>
  )
}
