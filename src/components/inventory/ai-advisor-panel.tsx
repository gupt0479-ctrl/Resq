"use client"

import { useState } from "react"
import { Sparkles, RefreshCw, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PredictionRiskBadge } from "./prediction-risk-badge"
import type { AiInventoryReport, InventoryPrediction } from "@/lib/types"

function DriverLabel({ driver }: { driver: string }) {
  const labels: Record<string, string> = {
    upcoming_reservations: "Upcoming bookings",
    recent_usage_trend: "Usage trend",
    baseline_usage_rate: "Baseline rate",
  }
  return <span>{labels[driver] ?? driver}</span>
}

function PredictionRow({ item }: { item: InventoryPrediction }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-b last:border-b-0 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{item.itemName}</span>
            <PredictionRiskBadge level={item.riskLevel} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {item.daysToStockout < 999
              ? `~${item.daysToStockout}d to stockout · reorder ${item.recommendedReorderQty} units`
              : "No predicted usage"}
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-1.5">
          {item.explanationText && (
            <p className="text-xs text-muted-foreground italic">{item.explanationText}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {item.topDrivers.map((d) => (
              <span
                key={d.driver}
                className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs"
              >
                <DriverLabel driver={d.driver} />
                <span className="text-muted-foreground">·</span>
                <span
                  className={
                    d.impact === "high"
                      ? "text-red-600"
                      : d.impact === "medium"
                        ? "text-amber-600"
                        : "text-green-600"
                  }
                >
                  {d.impact}
                </span>
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground pt-1">
            <span>7d usage: {item.predictedUsage7d}</span>
            <span>14d usage: {item.predictedUsage14d}</span>
            <span>On hand: {item.quantityOnHand}</span>
            <span>Safety stock: {item.safetyStock}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export function AiAdvisorPanel() {
  const [report, setReport] = useState<AiInventoryReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

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

  const riskItems = report?.predictions.filter(
    (p) => p.riskLevel === "high" || p.riskLevel === "medium"
  ) ?? []
  const displayItems = showAll ? riskItems : riskItems.slice(0, 5)

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

      <CardContent className="space-y-3">
        {error && (
          <div className="flex items-center gap-1.5 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        {!report && !loading && !error && (
          <p className="text-xs text-muted-foreground">
            Click <span className="font-medium">Run analysis</span> to generate AI-powered reorder
            recommendations based on upcoming reservations and usage trends.
          </p>
        )}

        {report && (
          <>
            {/* Summary */}
            <div className="rounded-md bg-violet-50 border border-violet-100 px-3 py-2">
              <p className="text-xs text-violet-800">{report.summaryText}</p>
            </div>

            {/* Risk counts */}
            <div className="flex gap-3 text-xs">
              <span className="text-red-600 font-medium">{report.highRiskCount} high</span>
              <span className="text-amber-600 font-medium">{report.mediumRiskCount} medium</span>
              <span className="text-green-600 font-medium">{report.lowRiskCount} low</span>
            </div>

            {/* Item list */}
            {riskItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">All items are healthy.</p>
            ) : (
              <div>
                {displayItems.map((item) => (
                  <PredictionRow key={item.itemId} item={item} />
                ))}
                {riskItems.length > 5 && (
                  <button
                    onClick={() => setShowAll((v) => !v)}
                    className="mt-1 text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    {showAll ? "Show less" : `Show ${riskItems.length - 5} more`}
                  </button>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Generated {new Date(report.generatedAt).toLocaleTimeString()}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
