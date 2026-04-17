"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowRight, CheckCircle, Clock, Loader2, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { RescueInvoice } from "@/lib/queries/rescue"

interface RunResult {
  actionType: string
  summary: string
  detail: string
  nextRecommendedStep?: string
}

const STATE_LABELS: Record<RescueInvoice["rescueState"], string> = {
  detected:     "Risk Detected",
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
  receivable_risk_detected:  "Risk flagged",
  customer_followup_sent:    "Follow-up drafted",
  financing_options_scouted: "Financing scouted",
  payment_plan_suggested:    "Plan proposed",
  escalation_triggered:      "Escalated",
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

export function RescueClient({ initialQueue }: { initialQueue: RescueInvoice[] }) {
  const [queue, setQueue] = useState(initialQueue)
  const [running, setRunning] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, RunResult>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const router = useRouter()

  const totalAtRisk = queue.reduce((s, i) => s + i.amount, 0)
  const overdueCount = queue.filter((i) => i.daysOverdue > 0).length
  const activeCount = queue.filter((i) =>
    i.rescueState === "investigating" || i.rescueState === "action_taken"
  ).length

  async function runAgent(invoiceId: string) {
    setRunning(invoiceId)
    try {
      const res = await fetch(`/api/rescue/${invoiceId}/run`, { method: "POST" })
      const data: RunResult = await res.json()
      setResults((prev) => ({ ...prev, [invoiceId]: data }))
      setExpanded(invoiceId)
      // Refresh queue data from server
      router.refresh()
      // Optimistically update state in list
      setQueue((prev) =>
        prev.map((item) => {
          if (item.id !== invoiceId) return item
          const nextState = stateFromActionType(data.actionType, item.rescueState)
          return { ...item, rescueState: nextState, lastActionType: data.actionType, lastActionAt: new Date().toISOString() }
        })
      )
    } catch {
      setResults((prev) => ({ ...prev, [invoiceId]: { actionType: "error", summary: "Failed to run agent. Try again.", detail: "", nextRecommendedStep: undefined } }))
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Cashflow Rescue</h1>
        <p className="text-xs text-muted-foreground">
          AI-powered recovery for overdue receivables — detect, follow up, scout financing, propose plans
        </p>
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
          <p className="mt-0.5 text-xs text-muted-foreground">Active rescue cases</p>
        </div>
      </div>

      {/* Queue */}
      {queue.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
            <p className="text-sm font-medium text-foreground">No at-risk receivables</p>
            <p className="text-xs text-muted-foreground">All invoices are current. Check back later.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="border-b border-border pb-3 pt-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Recovery Queue — ranked by risk
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {queue.map((item) => {
                const isRunning = running === item.id
                const result = results[item.id]
                const isExpanded = expanded === item.id

                return (
                  <li key={item.id} className="px-4 py-4">
                    <div className="flex items-start gap-4">
                      {/* Left: risk indicator */}
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      </div>

                      {/* Center: invoice info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{item.customerName}</span>
                          <span className="text-xs text-muted-foreground">#{item.invoiceNumber}</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold ${STATE_COLORS[item.rescueState]}`}
                          >
                            {STATE_LABELS[item.rescueState]}
                          </Badge>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">{fmt(item.amount)}</span>
                          {item.daysOverdue > 0 && (
                            <span className="text-red-600 font-medium">{item.daysOverdue}d overdue</span>
                          )}
                          {item.dueDate && (
                            <span>due {new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                          )}
                          {item.lastActionType && item.lastActionAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {ACTION_LABELS[item.lastActionType] ?? item.lastActionType} · {timeAgo(item.lastActionAt)}
                            </span>
                          )}
                        </div>

                        {/* Audit trail */}
                        {item.auditTrail.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.auditTrail.map((step, idx) => (
                              <span
                                key={idx}
                                className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                              >
                                {ACTION_LABELS[step.actionType] ?? step.actionType}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Result panel */}
                        {result && isExpanded && (
                          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-xs">
                            <p className="font-semibold text-blue-900">{result.summary}</p>
                            {result.detail && (
                              <pre className="mt-2 whitespace-pre-wrap font-sans text-blue-800 leading-relaxed">{result.detail}</pre>
                            )}
                            {result.nextRecommendedStep && (
                              <div className="mt-2 flex items-center gap-1 text-blue-700">
                                <ArrowRight className="h-3 w-3 shrink-0" />
                                <span>Next: {result.nextRecommendedStep}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {result && !isExpanded && (
                          <button
                            onClick={() => setExpanded(item.id)}
                            className="mt-2 text-[11px] text-primary hover:underline"
                          >
                            Show last result ↓
                          </button>
                        )}
                      </div>

                      {/* Right: Run Agent button */}
                      <div className="shrink-0">
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
                            {item.rescueState === "escalated" ? "Escalated" : "Resolved"}
                          </span>
                        )}
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
        Each "Run Agent" step advances the recovery state machine: detect → follow-up → financing → payment plan → escalate.
        All actions are logged to the audit trail.
      </p>
    </div>
  )
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
    case "escalation_triggered":          return "escalated"
    default:                              return current
  }
}
