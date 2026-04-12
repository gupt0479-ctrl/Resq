"use client"

import { useState } from "react"
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ShoppingCart,
  CalendarClock,
  Handshake,
  PackageSearch,
  TriangleAlert,
  BadgeDollarSign,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PredictionRiskBadge } from "./prediction-risk-badge"
import type { AiInventoryReport, InventoryPrediction, AgentReport } from "@/lib/types"

// ── Trend indicator ───────────────────────────────────────────────────────────

function TrendBadge({ pct }: { pct: number }) {
  if (pct > 5)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-600">
        <TrendingUp className="h-3 w-3" />+{pct}%
      </span>
    )
  if (pct < -5)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600">
        <TrendingDown className="h-3 w-3" />{pct}%
      </span>
    )
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" />flat
    </span>
  )
}

// ── Per-item prediction card ──────────────────────────────────────────────────

function PredictionCard({ item }: { item: InventoryPrediction }) {
  const [explanation, reorderAction] = item.explanationText
    ? item.explanationText.split(/\n\n→\s*/)
    : [null, null]

  const borderColor =
    item.riskLevel === "high"
      ? "border-l-red-400"
      : item.riskLevel === "medium"
        ? "border-l-amber-400"
        : "border-l-green-400"

  return (
    <div className={`border-l-2 pl-3 py-2 ${borderColor}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{item.itemName}</span>
            <PredictionRiskBadge level={item.riskLevel} />
            <TrendBadge pct={item.demandTrendPct} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {item.quantityOnHand} on hand · {item.predictedDailyUsage.toFixed(2)}/day burn rate
            {item.daysToStockout < 999 && ` · ~${item.daysToStockout}d to stockout`}
          </p>
        </div>
      </div>

      {explanation && (
        <p className="mt-1.5 text-xs text-foreground/80 leading-relaxed">{explanation}</p>
      )}

      {reorderAction && (
        <div className="mt-2 flex items-start gap-1.5 rounded-md bg-blue-50 border border-blue-100 px-2.5 py-1.5">
          <ShoppingCart className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
          <span className="text-xs text-blue-800 font-medium">{reorderAction}</span>
        </div>
      )}

      {!explanation && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-3 w-3 shrink-0" />
          {item.orderByDate
            ? `Order ${item.recommendedReorderQty} units from ${item.vendorName} by ${item.orderByDate}`
            : `Reorder ${item.recommendedReorderQty} units from ${item.vendorName}`}
        </div>
      )}
    </div>
  )
}

// ── Shipment Intelligence section ─────────────────────────────────────────────

function ShipmentIntelligence({ report }: { report: AgentReport }) {
  const riskBorder = {
    high: "border-red-200 bg-red-50",
    medium: "border-amber-200 bg-amber-50",
    low: "border-border bg-muted/30",
  }
  const riskText = {
    high: "text-red-700",
    medium: "text-amber-700",
    low: "text-muted-foreground",
  }

  return (
    <div className="space-y-4 pt-3 border-t border-border">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <PackageSearch className="h-4 w-4 text-violet-500" />
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Shipment Intelligence
        </p>
        <span className="ml-auto text-[9px] font-medium uppercase tracking-wide rounded-full bg-violet-100 text-violet-700 px-1.5 py-0.5">
          Gemini
        </span>
      </div>

      {/* Summary */}
      <div className="rounded-md bg-violet-50 border border-violet-100 px-3 py-2.5">
        <p className="text-xs text-violet-900 leading-relaxed">{report.summary}</p>
      </div>

      {/* Order Patterns */}
      {report.orderInsights.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Order Patterns — last 30 days
          </p>
          {report.orderInsights.map((insight) => (
            <div key={insight.itemName} className="border-l-2 border-l-violet-300 pl-3 py-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-foreground">{insight.itemName}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  ordered {insight.orderCount}× · avg {insight.avgOrderSize}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{insight.rationale}</p>
              <div className="mt-1.5 flex items-center gap-1.5 rounded-md bg-blue-50 border border-blue-100 px-2 py-1">
                <ShoppingCart className="h-3 w-3 text-blue-600 shrink-0" />
                <span className="text-[11px] text-blue-800 font-medium">
                  Recommend {insight.recommendedQty} next order from {insight.vendorName}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Spoilage Alerts */}
      {report.spoilageAlerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <TriangleAlert className="h-3.5 w-3.5 text-amber-500" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Spoilage Alerts
            </p>
          </div>
          {report.spoilageAlerts.map((alert) => (
            <div
              key={alert.itemName}
              className={`rounded-md border px-3 py-2 text-xs space-y-1 ${riskBorder[alert.riskLevel]}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">{alert.itemName}</span>
                <span className={`text-[10px] font-semibold uppercase ${riskText[alert.riskLevel]}`}>
                  {alert.riskLevel}
                </span>
              </div>
              <p className="text-muted-foreground">{alert.evidence}</p>
              <p className={`font-medium ${riskText[alert.riskLevel]}`}>
                {alert.recommendation}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Vendor Negotiation Tactics */}
      {report.negotiationOpportunities.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <BadgeDollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Negotiation Tactics
            </p>
          </div>
          {report.negotiationOpportunities.map((opp) => (
            <div
              key={opp.vendorName}
              className={`rounded-md border px-3 py-2 text-xs space-y-1.5 ${riskBorder[opp.priority]}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">{opp.vendorName}</span>
                <span className={`text-[10px] font-semibold uppercase ${riskText[opp.priority]}`}>
                  {opp.priority}
                </span>
              </div>
              <p className="text-muted-foreground">{opp.evidence}</p>
              <ul className="space-y-0.5">
                {opp.tactics.map((tactic, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className={`font-semibold shrink-0 ${riskText[opp.priority]}`}>
                      {i + 1}.
                    </span>
                    <span className={`font-medium ${riskText[opp.priority]}`}>{tactic}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Powered by Gemini 2.5 Flash · {new Date(report.generatedAt).toLocaleTimeString()}
      </p>
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function AgentSkeleton() {
  return (
    <div className="space-y-3 pt-3 border-t border-border animate-pulse">
      <div className="flex items-center gap-1.5">
        <PackageSearch className="h-4 w-4 text-violet-300" />
        <div className="h-3 w-36 rounded bg-muted" />
        <span className="ml-auto text-[9px] font-medium uppercase tracking-wide rounded-full bg-violet-100 text-violet-400 px-1.5 py-0.5">
          Gemini
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <RefreshCw className="h-3 w-3 animate-spin text-violet-400" />
        Running deep shipment analysis…
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-md bg-muted/40 h-12" />
        ))}
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function AiAdvisorPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [report, setReport] = useState<AiInventoryReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLow, setShowLow] = useState(false)

  const [agentReport, setAgentReport] = useState<AgentReport | null>(null)
  const [agentLoading, setAgentLoading] = useState(false)
  const [agentError, setAgentError] = useState<string | null>(null)

  async function refresh() {
    // Predictions (Haiku) — existing
    setLoading(true)
    setError(null)

    // Agent (Gemini) — new, fires in parallel
    setAgentLoading(true)
    setAgentError(null)

    fetch("/api/inventory/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`)
        return data
      })
      .then((d) => setAgentReport(d.report as AgentReport))
      .catch((e) => setAgentError(e instanceof Error ? e.message : "Agent error"))
      .finally(() => setAgentLoading(false))

    try {
      const res = await fetch("/api/inventory/predictions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeExplanation: true }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setReport(data.report as AiInventoryReport)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const highItems   = report?.predictions.filter((p) => p.riskLevel === "high")   ?? []
  const medItems    = report?.predictions.filter((p) => p.riskLevel === "medium") ?? []
  const lowItems    = report?.predictions.filter((p) => p.riskLevel === "low")    ?? []

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Popup panel */}
      {isOpen && (
        <div className="w-[380px] max-h-[600px] flex flex-col rounded-2xl border bg-white shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-white" />
              <span className="text-sm font-semibold text-white">AI Inventory Advisor</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={refresh}
                disabled={loading || agentLoading}
                className="h-7 px-2 text-xs text-white/80 hover:text-white hover:bg-white/20"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${loading || agentLoading ? "animate-spin" : ""}`} />
                {loading || agentLoading ? "Analysing…" : "Run analysis"}
              </Button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto space-y-4 px-4 py-4">
            {error && (
              <div className="flex items-center gap-1.5 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            {!report && !loading && !error && !agentLoading && !agentReport && (
              <p className="text-xs text-muted-foreground">
                Click <span className="font-medium">Run analysis</span> for AI-powered reorder
                recommendations — based on 30-day order patterns, spoilage risk, and vendor performance.
              </p>
            )}

            {report && (
              <>
                <div className="rounded-md bg-violet-50 border border-violet-100 px-3 py-2.5">
                  <p className="text-xs text-violet-900 leading-relaxed">{report.summaryText}</p>
                </div>
                <div className="flex gap-4 text-xs font-medium">
                  <span className="text-red-600">{report.highRiskCount} urgent</span>
                  <span className="text-amber-600">{report.mediumRiskCount} soon</span>
                  <span className="text-muted-foreground">{report.lowRiskCount} ok</span>
                </div>
                {highItems.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Urgent — order now</p>
                    {highItems.map((item) => <PredictionCard key={item.itemId} item={item} />)}
                  </div>
                )}
                {medItems.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Order this week</p>
                    {medItems.map((item) => <PredictionCard key={item.itemId} item={item} />)}
                  </div>
                )}
                {lowItems.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowLow((v) => !v)}
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      {showLow ? "Hide healthy items" : `Show ${lowItems.length} healthy items`}
                    </button>
                    {showLow && (
                      <div className="mt-3 space-y-3">
                        {lowItems.map((item) => <PredictionCard key={item.itemId} item={item} />)}
                      </div>
                    )}
                  </div>
                )}
                {report.vendorInsights && report.vendorInsights.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Handshake className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vendor Performance</p>
                    </div>
                    {report.vendorInsights.map((v) => (
                      <div key={v.vendorName} className={`rounded-md border px-3 py-2 text-xs space-y-1 ${
                        v.priority === "high" ? "border-red-200 bg-red-50"
                        : v.priority === "medium" ? "border-amber-200 bg-amber-50"
                        : "border-border bg-muted/40"
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{v.vendorName}</span>
                          <span className={`text-[10px] font-semibold uppercase ${
                            v.priority === "high" ? "text-red-600"
                            : v.priority === "medium" ? "text-amber-600"
                            : "text-muted-foreground"
                          }`}>{v.priority}</span>
                        </div>
                        <p className="text-muted-foreground">{v.performanceSummary}</p>
                        {v.negotiationSuggestion && (
                          <p className={`font-medium ${v.priority === "high" ? "text-red-800" : "text-amber-800"}`}>
                            {v.negotiationSuggestion}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Based on 30-day usage trends + upcoming reservations · {new Date(report.generatedAt).toLocaleTimeString()}
                </p>
              </>
            )}

            {agentLoading && <AgentSkeleton />}

            {agentError && (
              <div className="flex items-center gap-1.5 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Shipment analysis: {agentError}
              </div>
            )}

            {agentReport && !agentLoading && <ShipmentIntelligence report={agentReport} />}
          </div>
        </div>
      )}

      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen((v: boolean) => !v)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg hover:bg-violet-700 transition-colors"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </button>
    </div>
  )
}
