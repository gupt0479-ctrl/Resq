"use client"

import { useState } from "react"
import { Copy, X } from "lucide-react"
import type { VendorPerformanceStat } from "@/lib/types"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type Props = {
  vendorStats: VendorPerformanceStat[]
}

const priorityColor = {
  high:   { bar: "bg-red-500",    label: "bg-red-50 text-red-600 border-red-200" },
  medium: { bar: "bg-amber-400",  label: "bg-amber-50 text-amber-700 border-amber-200" },
  low:    { bar: "bg-emerald-400", label: "bg-emerald-50 text-emerald-700 border-emerald-200" },
}

const priorityLabel = {
  high:   "Negotiate",
  medium: "Review",
  low:    "OK",
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
  }).format(n)
}

function buildEmailDraft(v: VendorPerformanceStat): string {
  const subject =
    v.negotiationPriority === "high"
      ? `Delivery Performance & Pricing Review — ${v.vendorName}`
      : `Supplier Relationship Check-In — ${v.vendorName}`

  const lateLines =
    v.lateCount > 0
      ? `Over our last ${v.totalDeliveries} deliveries, ${v.lateCount} arrived late (average ${v.avgDaysLate} day${v.avgDaysLate !== 1 ? "s" : ""} late), bringing your on-time rate to ${v.onTimePct}%.`
      : `Your on-time delivery rate has been 100% across our last ${v.totalDeliveries} deliveries — thank you for that consistency.`

  const priceLines = v.hasPriceIncrease
    ? `We have also noticed recent price increases on several items supplied by your team. Given our ${fmtCurrency(v.totalSpend30d)} spend over the past 30 days, we would like to discuss how we can maintain a mutually beneficial pricing arrangement going forward.`
    : ""

  const ask =
    v.negotiationPriority === "high"
      ? `We would appreciate a meeting this week to discuss:\n  1. A delivery reliability improvement plan with measurable milestones\n  2. A credit or discount clause for future late deliveries beyond ${v.avgDaysLate > 0 ? Math.ceil(v.avgDaysLate) : 1} day(s)\n${v.hasPriceIncrease ? "  3. A pricing review and potential volume-based discount given our ongoing spend\n" : ""}`
      : `We would welcome a brief call to review current pricing and ensure we are set up for continued success together.\n`

  return `Subject: ${subject}

Dear ${v.vendorName} Team,

I hope this message finds you well. I am reaching out on behalf of Bistro Nova to review our current supplier relationship.

${lateLines}${priceLines ? "\n\n" + priceLines : ""}

${ask}
Please let us know your availability. We value our partnership and look forward to resolving these points collaboratively.

Warm regards,
Bistro Nova — Operations`
}

export function VendorPerformanceCard({ vendorStats }: Props) {
  const [selected, setSelected] = useState<VendorPerformanceStat | null>(null)
  const [copied, setCopied] = useState(false)

  if (vendorStats.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No delivery data available.</p>
    )
  }

  const emailDraft = selected ? buildEmailDraft(selected) : ""

  function handleCopy() {
    navigator.clipboard.writeText(emailDraft).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <>
      <div className="space-y-3">
        {vendorStats.map((v) => {
          const colors = priorityColor[v.negotiationPriority]
          const isActionable = v.lateCount > 0
          const badgeLabel = v.lateCount === 0 ? "OK" : priorityLabel[v.negotiationPriority]
          const badgeColors = v.lateCount === 0 ? priorityColor.low : colors
          const inner = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground truncate">{v.vendorName}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {fmtCurrency(v.totalSpend30d)}
                  </span>
                  <span
                    className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${badgeColors.label}`}
                  >
                    {badgeLabel}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${colors.bar}`}
                    style={{ width: `${v.onTimePct}%` }}
                  />
                </div>
                <span className="w-10 text-right text-[10px] font-medium tabular-nums text-muted-foreground">
                  {v.onTimePct}%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {v.totalDeliveries} deliveries
                {v.lateCount > 0 ? ` · ${v.lateCount} late (avg ${v.avgDaysLate}d)` : " · all on time"}
                {v.hasPriceIncrease ? " · price increases" : ""}
              </p>
            </>
          )

          return isActionable ? (
            <button
              key={v.vendorName}
              onClick={() => { setSelected(v); setCopied(false) }}
              className="w-full text-left space-y-1.5 rounded-lg px-2 py-1.5 -mx-2 hover:bg-muted/60 transition-colors cursor-pointer"
            >
              {inner}
            </button>
          ) : (
            <div key={v.vendorName} className="space-y-1.5 px-2 py-1.5 -mx-2">
              {inner}
            </div>
          )
        })}
      </div>

      <Dialog open={selected !== null} onClose={() => setSelected(null)}>
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle>Suggested Email — {selected?.vendorName}</DialogTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {selected?.negotiationPriority === "high"
                  ? "Negotiation email based on delivery issues and pricing"
                  : "Check-in email based on performance data"}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="shrink-0 rounded p-1 hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </DialogHeader>
        <DialogBody>
          <pre className="whitespace-pre-wrap font-sans text-xs text-foreground leading-relaxed bg-muted/40 rounded-lg p-3 max-h-72 overflow-y-auto border border-border">
            {emailDraft}
          </pre>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
            Close
          </Button>
          <Button size="sm" onClick={handleCopy}>
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            {copied ? "Copied!" : "Copy email"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
