"use client"

import { useState, useEffect } from "react"
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Globe,
  Loader2,
  X,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { RiskBadge, type RiskLevel } from "@/components/RiskBadge"
import type { RescueInvoice } from "@/lib/queries/rescue"
import type {
  CashSummaryResponse,
  AnalysisResponse,
  Intervention,
  ActionExecuteResponse,
} from "@/lib/schemas/cash"

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 60) return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}

function riskLevelFromCase(item: RescueInvoice): RiskLevel {
  if (item.daysOverdue > 60 || item.rescueState === "escalated") return "Critical"
  if (item.daysOverdue > 30) return "High"
  if (item.daysOverdue > 0) return "Moderate"
  return "Stable"
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  forgot: "Forgot to pay",
  cash_flow: "Cash flow issue",
  disputing: "Disputing quality",
  bad_actor: "Bad actor",
}

const CLASSIFICATION_STYLES: Record<string, string> = {
  forgot: "bg-teal/10 text-teal border-teal/20",
  cash_flow: "bg-amber/10 text-amber border-amber/20",
  disputing: "bg-steel/10 text-steel border-steel/20",
  bad_actor: "bg-crimson/10 text-crimson border-crimson/20",
}

const ACTION_LABELS: Record<string, string> = {
  receivable_risk_detected: "Risk Flagged",
  customer_followup_sent: "Follow-up Drafted",
  financing_options_scouted: "Financing Scouted",
  payment_plan_suggested: "Plan Proposed",
  rescue_case_resolved: "Case Escalated",
  dispute_clarification_sent: "Clarification Sent",
  cash_analysis_run: "Cash Analysis",
  action_executed: "Action Executed",
}

const ACTION_ICONS: Record<string, string> = {
  receivable_risk_detected: "🔍",
  customer_followup_sent: "✉️",
  financing_options_scouted: "💰",
  payment_plan_suggested: "📋",
  rescue_case_resolved: "⚡",
  dispute_clarification_sent: "💬",
  cash_analysis_run: "📊",
  action_executed: "✅",
}

// ─── CashMetricBoxes (Task 9.1) ───────────────────────────────────────────

function CashMetricBoxes() {
  const [summary, setSummary] = useState<CashSummaryResponse | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState(false)

  useEffect(() => {
    fetch("/api/cash/summary")
      .then((r) => r.json())
      .then((data) => setSummary(data))
      .catch(() => setSummaryError(true))
      .finally(() => setSummaryLoading(false))
  }, [])

  if (summaryLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-elevated p-5 animate-pulse">
            <div className="h-3 w-24 bg-surface-muted rounded mb-3" />
            <div className="h-7 w-32 bg-surface-muted rounded mb-2" />
            <div className="h-3 w-20 bg-surface-muted rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (summaryError || !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {["Current Cash Position", "Cash Collected (90d)", "Breakpoint Week", "Largest Risk Driver"].map((label) => (
          <div key={label} className="card-elevated p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-steel">{label}</div>
            <div className="font-display text-xl mt-1 text-steel/50">—</div>
            <div className="text-[11.5px] text-steel mt-1">No data available</div>
          </div>
        ))}
      </div>
    )
  }

  const boxes = [
    summary.currentCashPosition,
    summary.cashCollected,
    summary.breakpointWeek,
    summary.largestRiskDriver,
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {boxes.map((box) => (
        <div key={box.label} className="card-elevated p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-steel">{box.label}</div>
          <div className={cn(
            "font-display text-xl mt-1",
            box.label.includes("Breakpoint") && box.value !== "No risk" ? "text-crimson" : "",
            box.label.includes("Risk") ? "text-amber" : "",
          )}>
            {box.value}
          </div>
          {box.detail && (
            <div className="text-[11.5px] text-steel mt-1">{box.detail}</div>
          )}
        </div>
      ))}
      {summary.deviation && (
        <div className="col-span-full">
          <div className={cn(
            "rounded-md border px-4 py-3 text-[12.5px]",
            summary.deviation.urgency === "critical"
              ? "border-crimson/30 bg-crimson/5 text-crimson"
              : "border-amber/30 bg-amber/5 text-amber",
          )}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold">
                {summary.deviation.urgency === "critical" ? "Critical deviation" : "Deviation detected"}
              </span>
            </div>
            <p className="mt-1 text-foreground/80">{summary.deviation.summary}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CaseList (Task 9.2 — left column) ────────────────────────────────────

function CaseList({
  queue,
  selectedId,
  onSelect,
}: {
  queue: RescueInvoice[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-3">
        Cases · {queue.length} total
      </div>
      {queue.map((item) => {
        const level = riskLevelFromCase(item)
        const active = item.id === selectedId
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={cn(
              "w-full text-left rounded-md border bg-card transition-all px-4 py-3.5",
              active
                ? "border-l-4 border-l-foreground border-y-border border-r-border shadow-sm"
                : "border-border hover:bg-surface-muted",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-[13.5px] truncate">{item.customerName}</div>
                <div className="text-[11.5px] text-steel mt-0.5 font-mono">
                  #{item.invoiceNumber}
                </div>
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
              {item.lastActionAt && (
                <span className="text-[11px] text-steel">{timeAgo(item.lastActionAt)}</span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── RecentAuditTrail (Task 9.2 — compact trail in MainArea) ──────────────

function RecentAuditTrail({ trail }: { trail: RescueInvoice["auditTrail"] }) {
  const recent = trail.slice(-3)
  if (recent.length === 0) return null

  return (
    <div className="mt-5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-2">
        Recent agent actions
      </div>
      <div className="space-y-1.5">
        {recent.map((entry, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-[12px]"
          >
            <span>{ACTION_ICONS[entry.actionType] ?? "⚙️"}</span>
            <span className="font-medium">
              {ACTION_LABELS[entry.actionType] ?? entry.actionType.replace(/_/g, " ")}
            </span>
            <span className="ml-auto text-steel text-[11px]">{timeAgo(entry.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── MainArea (Task 9.2 — right column) ───────────────────────────────────

function MainArea({
  selected,
  analysisLoading,
  analysisError,
  onRunAnalysis,
}: {
  selected: RescueInvoice
  analysisLoading: boolean
  analysisError: string | null
  onRunAnalysis: () => void
}) {
  const level = riskLevelFromCase(selected)

  return (
    <div className="card-elevated p-6 lg:p-8">
      {/* ClientHeader */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-steel">Selected client</div>
          <h2 className="font-display text-2xl mt-1">{selected.customerName}</h2>
          <div className="flex items-center gap-3 mt-2">
            <span className="font-display text-lg">
              {fmt(selected.amount)}
            </span>
            {selected.daysOverdue > 0 && (
              <span className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                selected.daysOverdue > 30
                  ? "border-crimson/20 bg-crimson/10 text-crimson"
                  : "border-amber/20 bg-amber/10 text-amber",
              )}>
                {selected.daysOverdue}d overdue
              </span>
            )}
          </div>
        </div>
        <RiskBadge level={level} />
      </div>

      {/* Due date context */}
      {selected.dueDate && (
        <div className="mt-4 flex items-center gap-2 text-[12.5px] text-steel">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          Due{" "}
          {new Date(selected.dueDate).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      )}

      {/* RecentAuditTrail */}
      <RecentAuditTrail trail={selected.auditTrail} />

      {/* RunAnalysisButton — single primary CTA */}
      <div className="mt-6">
        <button
          onClick={onRunAnalysis}
          disabled={analysisLoading}
          className="inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-[13px] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {analysisLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" /> Run AI Analysis
            </>
          )}
        </button>
      </div>

      {selected.auditTrail.length === 0 && !analysisError && (
        <div className="mt-6 rounded-md border border-border bg-surface p-4 text-[12.5px] text-steel">
          No agent actions yet. Click{" "}
          <strong className="text-foreground">Run AI Analysis</strong> to begin.
        </div>
      )}

      {analysisError && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-crimson/30 bg-crimson/5 px-4 py-3 text-[12.5px] text-crimson">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{analysisError}</span>
        </div>
      )}
    </div>
  )
}

// ─── AnalysisOverlay (Task 9.3) ───────────────────────────────────────────

function AnalysisOverlay({
  result,
  onClose,
  onExecuteAction,
  onMarkReviewed,
  executing,
  executeResult,
}: {
  result: AnalysisResponse
  onClose: () => void
  onExecuteAction: (intervention: Intervention) => void
  onMarkReviewed: () => void
  executing: boolean
  executeResult: ActionExecuteResponse | null
}) {
  const [snippetsOpen, setSnippetsOpen] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[90vh] mx-4 rounded-lg border border-border bg-card shadow-xl flex flex-col overflow-hidden">
        {/* OverlayHeader */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-muted shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-steel">AI Analysis</div>
            <h3 className="font-display text-lg mt-0.5">{result.clientName}</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              result.mode === "live"
                ? "bg-teal/10 text-teal border-teal/20"
                : "bg-steel/10 text-steel border-steel/20",
            )}>
              {result.mode}
            </span>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 hover:bg-surface transition-colors"
            >
              <X className="h-4 w-4 text-steel" />
            </button>
          </div>
        </div>

        {/* OverlayBody */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid lg:grid-cols-12 gap-0 divide-x divide-border">
            {/* OverlayLeftRail */}
            <div className="lg:col-span-4 p-5 space-y-6 overflow-y-auto">
              {/* PaymentBehaviorSection */}
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-3 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Payment behavior
                </div>
                <div className="space-y-2">
                  <div className="rounded-md border border-border bg-surface p-3">
                    <div className="text-[10px] text-steel">Avg days to pay</div>
                    <div className="font-display text-lg mt-0.5">
                      {result.collectionLag.avgDaysToCollect}d
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-surface p-3">
                    <div className="text-[10px] text-steel">Collection tier</div>
                    <div className={cn(
                      "mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      result.collectionLag.tier === "on_time"
                        ? "bg-teal/10 text-teal border-teal/20"
                        : result.collectionLag.tier === "slightly_late"
                        ? "bg-amber/10 text-amber border-amber/20"
                        : "bg-crimson/10 text-crimson border-crimson/20",
                    )}>
                      {result.collectionLag.tier.replace(/_/g, " ")}
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-surface p-3">
                    <div className="text-[10px] text-steel">On-time rate</div>
                    <div className="font-display text-lg mt-0.5">
                      {result.collectionLag.onTimePercent}%
                    </div>
                  </div>
                </div>
              </div>

              {/* ExternalResearchSection */}
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-3 flex items-center gap-1.5">
                  <Globe className="h-3 w-3" />
                  External research
                  <span className={cn(
                    "rounded-full border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide",
                    result.externalFindings.dataSource === "live"
                      ? "bg-teal/10 text-teal border-teal/20"
                      : "bg-steel/10 text-steel border-steel/20",
                  )}>
                    {result.externalFindings.dataSource}
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-[12px] leading-relaxed text-foreground/80">
                    {result.externalFindings.newsSummary}
                  </p>

                  {result.externalFindings.distressFlag && (
                    <div className="flex items-center gap-2 rounded-md border border-crimson/20 bg-crimson/5 px-3 py-2 text-[11px] text-crimson font-medium">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      Financial distress signals detected
                    </div>
                  )}

                  {result.externalFindings.rawSnippets.length > 0 && (
                    <div>
                      <button
                        onClick={() => setSnippetsOpen((v) => !v)}
                        className="flex items-center gap-1 text-[11px] text-steel hover:text-foreground transition-colors"
                      >
                        {snippetsOpen ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        {result.externalFindings.rawSnippets.length} source snippets
                      </button>
                      {snippetsOpen && (
                        <div className="mt-2 space-y-1.5">
                          {result.externalFindings.rawSnippets.map((s, i) => (
                            <div
                              key={i}
                              className="rounded bg-surface-muted px-3 py-2 text-[11px] text-steel leading-relaxed"
                            >
                              <span className="font-mono text-[9px] text-steel/50 mr-1.5">
                                [{i + 1}]
                              </span>
                              {s}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* OverlayCenterPanel */}
            <div className="lg:col-span-8 p-5 space-y-6">
              {/* ClientSummaryBoxes — 2x2 grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-border bg-surface p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-steel">
                    Total outstanding
                  </div>
                  <div className="font-display text-xl mt-1 text-amber">
                    {fmt(result.clientSummary.totalOutstanding)}
                  </div>
                </div>
                <div className="rounded-md border border-border bg-surface p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-steel">
                    Avg days to pay
                  </div>
                  <div className="font-display text-xl mt-1">
                    {result.clientSummary.avgDaysToPay}d
                  </div>
                </div>
                <div className="rounded-md border border-border bg-surface p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-steel">
                    Payment reliability
                  </div>
                  <div className={cn(
                    "font-display text-xl mt-1",
                    result.clientSummary.paymentReliabilityPercent >= 80
                      ? "text-teal"
                      : result.clientSummary.paymentReliabilityPercent >= 50
                      ? "text-amber"
                      : "text-crimson",
                  )}>
                    {result.clientSummary.paymentReliabilityPercent}%
                  </div>
                </div>
                <div className="rounded-md border border-border bg-surface p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-steel">
                    Risk classification
                  </div>
                  <div className="mt-1">
                    <span className={cn(
                      "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                      CLASSIFICATION_STYLES[result.clientSummary.riskClassification] ??
                        "bg-steel/10 text-steel border-steel/20",
                    )}>
                      {CLASSIFICATION_LABELS[result.clientSummary.riskClassification] ??
                        result.clientSummary.riskClassification}
                    </span>
                  </div>
                </div>
              </div>

              {/* AiSummaryText */}
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-2">
                  AI summary
                </div>
                <div className="rounded-md border border-border bg-surface p-4 text-[13px] leading-relaxed text-foreground/90">
                  {result.aiSummary}
                </div>
              </div>

              {/* InterventionList — read-only ranked actions */}
              {result.interventions.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-2">
                    Ranked interventions
                  </div>
                  <div className="space-y-2">
                    {result.interventions.map((intervention, i) => (
                      <div
                        key={intervention.id}
                        className={cn(
                          "rounded-md border bg-surface p-3 text-[12px]",
                          i === 0 ? "border-foreground/20" : "border-border",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {i === 0 && (
                                <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-background">
                                  recommended
                                </span>
                              )}
                              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-steel capitalize">
                                {intervention.category.replace(/_/g, " ")}
                              </span>
                              <span className={cn(
                                "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                                intervention.riskLevel === "low"
                                  ? "bg-teal/10 text-teal border-teal/20"
                                  : intervention.riskLevel === "medium"
                                  ? "bg-amber/10 text-amber border-amber/20"
                                  : "bg-crimson/10 text-crimson border-crimson/20",
                              )}>
                                {intervention.riskLevel}
                              </span>
                            </div>
                            <p className="mt-1.5 text-foreground/80">{intervention.description}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-display text-sm text-teal">
                              +{fmt(intervention.cashImpactEstimate)}
                            </div>
                            <div className="text-[10px] text-steel mt-0.5">
                              {intervention.speedDays}d · {Math.round(intervention.confidenceScore * 100)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning banner */}
              {result.warning && (
                <div className="rounded-md border border-amber/30 bg-amber/5 px-4 py-2.5 text-[12px] text-amber">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {result.warning}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* OverlayFooter */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface-muted shrink-0">
          <div className="text-[11px] text-steel">
            Generated {new Date(result.generatedAt).toLocaleString()}
          </div>
          <div className="flex items-center gap-3">
            {executeResult ? (
              <div className="flex items-center gap-2 text-[12.5px] text-teal font-medium">
                <CheckCircle className="h-4 w-4" />
                {executeResult.status === "executed"
                  ? "Action executed"
                  : executeResult.status === "requires_manual"
                  ? "Requires manual action"
                  : "Action failed"}
                {executeResult.guidanceText && (
                  <span className="text-steel font-normal ml-1">— {executeResult.guidanceText}</span>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={onMarkReviewed}
                  className="rounded-md border border-border px-4 py-2 text-[12.5px] font-semibold transition-colors hover:bg-surface"
                >
                  Mark Reviewed
                </button>
                {result.recommendedAction && (
                  <button
                    onClick={() => onExecuteAction(result.recommendedAction!)}
                    disabled={executing || !result.recommendedAction.executable}
                    className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-[12.5px] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {executing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Executing…
                      </>
                    ) : (
                      <>
                        <Zap className="h-3.5 w-3.5" /> Execute Recommended Action
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

export function RescueClient({ initialQueue }: { initialQueue: RescueInvoice[] }) {
  const queue = initialQueue
  const [selectedId, setSelectedId] = useState<string>(initialQueue[0]?.id ?? "")

  // Analysis overlay state
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [showOverlay, setShowOverlay] = useState(false)

  // Action execution state
  const [executing, setExecuting] = useState(false)
  const [executeResult, setExecuteResult] = useState<ActionExecuteResponse | null>(null)

  const selected = queue.find((i) => i.id === selectedId) ?? queue[0] ?? null

  async function runAnalysis() {
    if (!selected) return
    setAnalysisLoading(true)
    setAnalysisResult(null)
    setExecuteResult(null)
    setAnalysisError(null)
    try {
      const res = await fetch("/api/cash/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: undefined, // server defaults to DEMO_ORG_ID
          clientId: selected.customerId,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setAnalysisError(data.error ?? data.detail ?? "Analysis failed. Please try again.")
        return
      }
      setAnalysisResult(data as AnalysisResponse)
      setShowOverlay(true)
    } catch {
      setAnalysisError("Network error. Please try again.")
    } finally {
      setAnalysisLoading(false)
    }
  }

  async function executeAction(intervention: Intervention) {
    setExecuting(true)
    try {
      const res = await fetch(`/api/cash/actions/${intervention.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: intervention.category,
          description: intervention.description,
          executable: intervention.executable,
          clientName: analysisResult?.clientName,
        }),
      })
      const data: ActionExecuteResponse = await res.json()
      setExecuteResult(data)
    } catch {
      // Silently fail
    } finally {
      setExecuting(false)
    }
  }

  function markReviewed() {
    setShowOverlay(false)
    setAnalysisResult(null)
    setExecuteResult(null)
  }

  return (
    <div className="p-8 lg:p-10 max-w-[1280px] mx-auto">
      {/* Page header */}
      <div className="mb-10">
        <div className="text-[11px] uppercase tracking-[0.18em] text-steel">
          Cash control tower
        </div>
        <h1 className="font-display text-2xl lg:text-3xl mt-1">Rescue Queue</h1>
      </div>

      {/* CashMetricBoxes — top row (Task 9.1) */}
      <CashMetricBoxes />

      {queue.length === 0 ? (
        <div className="card-elevated p-12 flex flex-col items-center gap-3 text-center">
          <CheckCircle className="h-8 w-8 text-teal" />
          <p className="font-medium">No at-risk receivables</p>
          <p className="text-[12.5px] text-steel">
            All invoices are current — check back later.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left: CaseList (Task 9.2) */}
          <div className="lg:col-span-5">
            <CaseList
              queue={queue}
              selectedId={selected?.id ?? ""}
              onSelect={setSelectedId}
            />
          </div>

          {/* Right: MainArea (Task 9.2) */}
          {selected && (
            <div className="lg:col-span-7">
              <MainArea
                selected={selected}
                analysisLoading={analysisLoading}
                analysisError={analysisError}
                onRunAnalysis={runAnalysis}
              />
            </div>
          )}
        </div>
      )}

      {/* AnalysisOverlay (Task 9.3) */}
      {showOverlay && analysisResult && (
        <AnalysisOverlay
          result={analysisResult}
          onClose={() => {
            setShowOverlay(false)
            setExecuteResult(null)
          }}
          onExecuteAction={executeAction}
          onMarkReviewed={markReviewed}
          executing={executing}
          executeResult={executeResult}
        />
      )}
    </div>
  )
}
