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
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PredictionRiskBadge } from "./prediction-risk-badge"
import type { AiInventoryReport, InventoryPrediction } from "@/lib/types"

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

// ── Per-item card ─────────────────────────────────────────────────────────────

function PredictionCard({ item }: { item: InventoryPrediction }) {
  // Split explanation from reorder action (separated by \n\n→ in orchestrator)
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
      {/* Header row */}
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

      {/* AI explanation — always visible */}
      {explanation && (
        <p className="mt-1.5 text-xs text-foreground/80 leading-relaxed">{explanation}</p>
      )}

      {/* Reorder action — prominent CTA */}
      {reorderAction && (
        <div className="mt-2 flex items-start gap-1.5 rounded-md bg-blue-50 border border-blue-100 px-2.5 py-1.5">
          <ShoppingCart className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
          <span className="text-xs text-blue-800 font-medium">{reorderAction}</span>
        </div>
      )}

      {/* Fallback when no AI explanation yet */}
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

// ── Main panel ────────────────────────────────────────────────────────────────

export function AiAdvisorPanel() {
  const [report, setReport] = useState<AiInventoryReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLow, setShowLow] = useState(false)

  async function refresh() {
    setLoading(true)
    setError(null)
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <CardTitle className="text-sm font-medium">AI Inventory Advisor</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={loading}
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Analysing…" : "Run analysis"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error */}
        {error && (
          <div className="flex items-center gap-1.5 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Idle state */}
        {!report && !loading && !error && (
          <p className="text-xs text-muted-foreground">
            Click <span className="font-medium">Run analysis</span> for AI-powered reorder
            recommendations — based on 30-day usage trends, upcoming reservation volume, and
            per-item burn rates.
          </p>
        )}

        {report && (
          <>
            {/* AI summary */}
            <div className="rounded-md bg-violet-50 border border-violet-100 px-3 py-2.5">
              <p className="text-xs text-violet-900 leading-relaxed">{report.summaryText}</p>
            </div>

            {/* Risk tally */}
            <div className="flex gap-4 text-xs font-medium">
              <span className="text-red-600">{report.highRiskCount} urgent</span>
              <span className="text-amber-600">{report.mediumRiskCount} soon</span>
              <span className="text-muted-foreground">{report.lowRiskCount} ok</span>
            </div>

            {/* High risk */}
            {highItems.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                  Urgent — order now
                </p>
                {highItems.map((item) => (
                  <PredictionCard key={item.itemId} item={item} />
                ))}
              </div>
            )}

            {/* Medium risk */}
            {medItems.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
                  Order this week
                </p>
                {medItems.map((item) => (
                  <PredictionCard key={item.itemId} item={item} />
                ))}
              </div>
            )}

            {/* Low risk — collapsed by default */}
            {lowItems.length > 0 && (
              <div>
                <button
                  onClick={() => setShowLow((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  {showLow
                    ? "Hide healthy items"
                    : `Show ${lowItems.length} healthy items`}
                </button>
                {showLow && (
                  <div className="mt-3 space-y-3">
                    {lowItems.map((item) => (
                      <PredictionCard key={item.itemId} item={item} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Vendor insights */}
            {report.vendorInsights && report.vendorInsights.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Handshake className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Vendor Performance
                  </p>
                </div>
                {report.vendorInsights.map((v) => (
                  <div
                    key={v.vendorName}
                    className={`rounded-md border px-3 py-2 text-xs space-y-1 ${
                      v.priority === "high"
                        ? "border-red-200 bg-red-50"
                        : v.priority === "medium"
                          ? "border-amber-200 bg-amber-50"
                          : "border-border bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{v.vendorName}</span>
                      <span
                        className={`text-[10px] font-semibold uppercase ${
                          v.priority === "high"
                            ? "text-red-600"
                            : v.priority === "medium"
                              ? "text-amber-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {v.priority}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{v.performanceSummary}</p>
                    {v.negotiationSuggestion && (
                      <p className={`font-medium ${
                        v.priority === "high" ? "text-red-800" : "text-amber-800"
                      }`}>
                        {v.negotiationSuggestion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Based on 30-day usage trends + upcoming reservations ·{" "}
              {new Date(report.generatedAt).toLocaleTimeString()}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
