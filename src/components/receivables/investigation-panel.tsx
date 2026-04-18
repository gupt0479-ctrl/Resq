"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  CheckSquare,
  MinusSquare,
  Square,
  AlertTriangle,
  User,
  MapPin,
  Hash,
  Building2,
  Mail,
  Phone,
  Users,
  X,
  Search,
} from "lucide-react"
import type { ReceivablesInvestigationResult, VerificationChecks } from "@/lib/schemas/receivables-agent"

// ── Verification check row ────────────────────────────────────────────────────

const CHECK_KEYS: (keyof VerificationChecks)[] = [
  "businessNameVerified",
  "addressVerified",
  "peopleVerified",
  "tinMatch",
  "watchlistsClear",
  "bankAccountVerified",
  "taxCompliant",
  "ownerKycComplete",
  "creditHistoryCheck",
  "utilityBillVerified",
  "onlinePresenceVerified",
]

const CHECK_LABELS: Record<keyof VerificationChecks, string> = {
  businessNameVerified:   "Business Name Verification",
  addressVerified:        "Office Address Verification",
  peopleVerified:         "People Verification",
  tinMatch:               "TIN Match",
  watchlistsClear:        "Watchlists Screening",
  bankAccountVerified:    "Bank Account Verification",
  taxCompliant:           "Tax Compliance Check",
  ownerKycComplete:       "Owner / Director KYC",
  creditHistoryCheck:     "Credit History Check",
  utilityBillVerified:    "Utility Bill Verification",
  onlinePresenceVerified: "Website / Online Presence",
}

function checkPassed(key: keyof VerificationChecks, val: boolean | string): boolean {
  if (key === "creditHistoryCheck") return val === "passed"
  return val === true
}

type CheckState = "pending" | "checking" | "pass" | "fail"

function VerificationRow({ label, state }: { label: string; state: CheckState }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0">
      <span className={cn(
        "text-sm transition-colors duration-300",
        state === "pending"  && "text-muted-foreground/50",
        state === "checking" && "text-foreground font-medium",
        (state === "pass" || state === "fail") && "text-foreground",
      )}>
        {label}
      </span>
      <span className="shrink-0">
        {state === "pending" && (
          <Square className="size-5 text-muted-foreground/30" />
        )}
        {state === "checking" && (
          <Loader2 className="size-5 text-primary animate-spin" />
        )}
        {state === "pass" && (
          <CheckSquare className="size-5 text-emerald-500 fill-emerald-50 animate-in zoom-in-50 duration-200" />
        )}
        {state === "fail" && (
          <MinusSquare className="size-5 text-red-500 fill-red-50 animate-in zoom-in-50 duration-200" />
        )}
      </span>
    </div>
  )
}

// ── Risk level badge ──────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: ReceivablesInvestigationResult["riskLevel"] }) {
  const styles = {
    low:      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    medium:   "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    high:     "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  }
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide", styles[level])}>
      {level}
    </span>
  )
}

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, level }: { score: number; level: ReceivablesInvestigationResult["riskLevel"] }) {
  const colors = {
    low:      "#10b981",
    medium:   "#f59e0b",
    high:     "#f97316",
    critical: "#ef4444",
  }
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <div className="relative flex items-center justify-center size-20">
      <svg className="size-20 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/20" />
        <circle
          cx="32" cy="32" r={r} fill="none"
          stroke={colors[level]}
          strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-lg font-bold">{score}</span>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface InvestigationPanelProps {
  invoiceId:    string
  invoiceNumber: string
  customerName: string
  balance:      number
  daysOverdue:  number
}

export function InvestigationPanel({
  invoiceId,
  invoiceNumber,
  customerName,
  balance,
  daysOverdue,
}: InvestigationPanelProps) {
  const [open, setOpen]             = useState(false)
  const [loading, setLoading]       = useState(false)
  const [result, setResult]         = useState<ReceivablesInvestigationResult | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [reminderLoading, setReminderLoading] = useState(false)
  const [reminderSent, setReminderSent]       = useState<{ invoiceId: string; hostedUrl?: string; mode: string } | null>(null)
  const [reminderError, setReminderError]     = useState<string | null>(null)
  // Per-check animation state: index of the furthest revealed check (-1 = none yet)
  const [revealedUpto, setRevealedUpto] = useState(-1)

  // When a result arrives, tick through each check with a 220ms stagger
  useEffect(() => {
    if (!result) return
    setRevealedUpto(-1)
    CHECK_KEYS.forEach((_, i) => {
      setTimeout(() => setRevealedUpto(i), i * 220)
    })
  }, [result])

  // While loading, advance a "checking" cursor every 600ms to show progress
  useEffect(() => {
    if (!loading) return
    setRevealedUpto(-1)
    let idx = 0
    const interval = setInterval(() => {
      setRevealedUpto(idx)
      idx = (idx + 1) % CHECK_KEYS.length
    }, 600)
    return () => clearInterval(interval)
  }, [loading])

  async function sendReminder() {
    setReminderLoading(true)
    setReminderError(null)
    try {
      const res = await fetch("/api/receivables/send-reminder", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ invoiceId }),
      })
      const json = await res.json() as { ok: boolean; stripeInvoiceId?: string; hostedUrl?: string; mode?: string; error?: string }
      if (!json.ok) throw new Error(json.error ?? "Failed to send reminder")
      setReminderSent({ invoiceId: json.stripeInvoiceId ?? "", hostedUrl: json.hostedUrl, mode: json.mode ?? "mock" })
    } catch (e) {
      setReminderError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setReminderLoading(false)
    }
  }

  async function runInvestigation() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/receivables/investigate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ invoiceId }),
      })
      const json = (await res.json()) as { ok: boolean; result?: ReceivablesInvestigationResult; error?: string }
      if (!json.ok || !json.result) throw new Error(json.error ?? "Investigation failed")
      setResult(json.result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  function getCheckState(index: number, key: keyof VerificationChecks): CheckState {
    if (loading) {
      if (index < revealedUpto) return "pending"
      if (index === revealedUpto) return "checking"
      return "pending"
    }
    if (!result) return "pending"
    if (index > revealedUpto) return "pending"
    return checkPassed(key, result.verificationChecks[key]) ? "pass" : "fail"
  }

  return (
    <>
      {/* Trigger button */}
      <Button
        size="sm"
        variant="outline"
        onClick={() => { setOpen(true); if (!result) runInvestigation() }}
        className="gap-1.5"
      >
        <Search className="size-3.5" />
        Investigate
      </Button>

      {/* Slide-over panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative ml-auto h-full w-full max-w-2xl bg-background shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" />
                <div>
                  <p className="font-semibold text-sm">Risk Investigation</p>
                  <p className="text-xs text-muted-foreground">
                    {invoiceNumber} · {customerName} · ${balance.toFixed(2)}
                    {daysOverdue > 0 && ` · ${daysOverdue}d overdue`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 hover:bg-muted transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {/* Checklist always visible once panel opens — animates during load and on result */}
              {(loading || result) && (
                <div className="px-6 pt-6">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Verification Checks
                  </p>
                  <div className="rounded-lg border border-border bg-card px-4">
                    {CHECK_KEYS.map((key, i) => (
                      <VerificationRow
                        key={key}
                        label={CHECK_LABELS[key]}
                        state={getCheckState(i, key)}
                      />
                    ))}
                  </div>
                  {loading && (
                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                      <Loader2 className="size-3 animate-spin" />
                      Agent is investigating…
                    </p>
                  )}
                </div>
              )}

              {error && !loading && (
                <div className="m-6 rounded-lg bg-destructive/10 border border-destructive/20 p-4 flex gap-3">
                  <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Investigation failed</p>
                    <p className="text-xs text-muted-foreground mt-1">{error}</p>
                    <button
                      onClick={runInvestigation}
                      className="text-xs text-primary underline mt-2"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {result && !loading && (
                <div className="px-6 pb-6 space-y-6 mt-6">
                  {/* Risk score + level */}
                  <div className="flex items-center gap-6">
                    <ScoreRing score={result.riskScore} level={result.riskLevel} />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Risk Score</p>
                      <RiskBadge level={result.riskLevel} />
                      <p className="text-xs text-muted-foreground mt-1 capitalize">
                        Recommended: <span className="font-medium text-foreground">{result.recommendedAction.replace("_", " ")}</span>
                      </p>
                    </div>
                  </div>

                  {/* Customer details + risk factors */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left: company profile */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Company Profile
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <Building2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Company</p>
                            <p className="text-sm font-medium break-words">{result.companyInfo?.companyName ?? result.customerName}</p>
                          </div>
                        </div>

                        {result.companyInfo?.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Office Address</p>
                              <p className="text-sm font-medium break-words">{result.companyInfo.address}</p>
                            </div>
                          </div>
                        )}

                        {result.companyInfo?.email && (
                          <div className="flex items-start gap-2">
                            <Mail className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Email</p>
                              <p className="text-sm font-medium break-words">{result.companyInfo.email}</p>
                            </div>
                          </div>
                        )}

                        {result.companyInfo?.phone && (
                          <div className="flex items-start gap-2">
                            <Phone className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Phone</p>
                              <p className="text-sm font-medium">{result.companyInfo.phone}</p>
                            </div>
                          </div>
                        )}

                        {result.companyInfo?.keyPeople && result.companyInfo.keyPeople.length > 0 && (
                          <div className="flex items-start gap-2">
                            <Users className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Key People</p>
                              {result.companyInfo.keyPeople.map(p => (
                                <p key={p} className="text-sm font-medium">{p}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: invoice stats */}
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                          Account Summary
                        </p>
                        <div className="space-y-3">
                          <div className="flex items-start gap-2">
                            <User className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground">Contact</p>
                              <p className="text-sm font-medium">{result.customerName}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <Hash className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground">Total Overdue</p>
                              <p className="text-sm font-medium">${result.totalOverdue.toFixed(2)}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <Building2 className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground">Open Invoices</p>
                              <p className="text-sm font-medium">{result.invoiceIds.length}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground">Days Overdue</p>
                              <p className="text-sm font-medium">{result.overdueDays}d</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Risk factors */}
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Risk Factors
                        </p>
                        <div className="space-y-2">
                          {result.riskFactors.map((f) => (
                            <div key={f.label}>
                              <div className="flex justify-between text-xs mb-0.5">
                                <span className="text-muted-foreground">{f.label}</span>
                                <span className="font-medium">{f.score}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    f.score < 30 ? "bg-emerald-500" :
                                    f.score < 60 ? "bg-amber-500" :
                                    f.score < 80 ? "bg-orange-500" : "bg-red-500"
                                  )}
                                  style={{ width: `${f.score}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Watchlist screening */}
                  {result.watchlistScreening && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                        {result.watchlistScreening.overallStatus === "flagged"
                          ? <ShieldAlert className="size-3.5 text-red-500" />
                          : <ShieldCheck className="size-3.5 text-emerald-500" />}
                        Watchlist Screening
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-xs font-semibold normal-case tracking-normal",
                          result.watchlistScreening.dataSource === "live"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground",
                        )}>
                          {result.watchlistScreening.dataSource}
                        </span>
                      </p>

                      {/* Overall status banner */}
                      <div className={cn(
                        "rounded-lg border px-4 py-2.5 mb-3 flex items-center gap-2",
                        result.watchlistScreening.overallStatus === "flagged"
                          ? "border-red-200 bg-red-50/60 dark:border-red-800 dark:bg-red-950/20"
                          : result.watchlistScreening.overallStatus === "review_required"
                          ? "border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20"
                          : "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20",
                      )}>
                        <span className={cn(
                          "text-xs font-semibold",
                          result.watchlistScreening.overallStatus === "flagged"   && "text-red-700 dark:text-red-300",
                          result.watchlistScreening.overallStatus === "review_required" && "text-amber-700 dark:text-amber-300",
                          result.watchlistScreening.overallStatus === "clear"     && "text-emerald-700 dark:text-emerald-300",
                        )}>
                          {result.watchlistScreening.overallStatus === "flagged"        ? "⚠ Flag Detected — Manual Review Required"
                           : result.watchlistScreening.overallStatus === "review_required" ? "⚠ Review Required"
                           : "✓ All Clear"}
                        </span>
                        {result.watchlistScreening.screenedNames.length > 0 && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            Screened: {result.watchlistScreening.screenedNames.join(", ")}
                          </span>
                        )}
                      </div>

                      {/* Per-list rows */}
                      <div className="rounded-lg border border-border bg-card px-4 divide-y divide-border/50">
                        {result.watchlistScreening.hits.map((hit) => (
                          <div key={hit.list} className="flex items-center justify-between gap-3 py-2">
                            <span className="text-xs text-muted-foreground">{hit.label}</span>
                            <span className={cn(
                              "shrink-0 flex items-center gap-1 text-xs font-medium",
                              hit.status === "flagged"      && "text-red-600 dark:text-red-400",
                              hit.status === "inconclusive" && "text-amber-600 dark:text-amber-400",
                              hit.status === "clear"        && "text-emerald-600 dark:text-emerald-400",
                            )}>
                              <span className={cn(
                                "size-1.5 rounded-full",
                                hit.status === "flagged"      && "bg-red-500",
                                hit.status === "inconclusive" && "bg-amber-500",
                                hit.status === "clear"        && "bg-emerald-500",
                              )} />
                              {hit.status === "flagged" ? "Flagged" : hit.status === "inconclusive" ? "Inconclusive" : "Clear"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Credit report red flags */}
                  {result.creditReport && result.creditReport.redFlags.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Credit Report
                        <span className={cn(
                          "ml-2 px-1.5 py-0.5 rounded text-xs font-semibold",
                          result.creditReport.overallStatus === "high_risk" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
                          result.creditReport.overallStatus === "caution"   && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                          result.creditReport.overallStatus === "clean"     && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                        )}>
                          {result.creditReport.overallStatus.replace("_", " ")}
                        </span>
                      </p>
                      <div className="space-y-2">
                        {result.creditReport.redFlags.map((flag) => (
                          <div key={flag.flag} className={cn(
                            "rounded-lg border px-4 py-2.5 flex items-start gap-3",
                            flag.severity === "critical" && "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20",
                            flag.severity === "warning"  && "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20",
                            flag.severity === "none"     && "border-border bg-card",
                          )}>
                            <span className={cn(
                              "mt-0.5 shrink-0 size-2 rounded-full",
                              flag.severity === "critical" && "bg-red-500",
                              flag.severity === "warning"  && "bg-amber-500",
                              flag.severity === "none"     && "bg-emerald-500",
                            )} />
                            <div>
                              <p className="text-xs font-medium">{flag.label}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{flag.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* External signals */}
                  {result.externalSignals?.searched && result.externalSignals.articles.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                        External Signals
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-xs font-semibold normal-case tracking-normal",
                          result.externalSignals.dataSource === "live"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground",
                        )}>
                          {result.externalSignals.dataSource}
                        </span>
                      </p>
                      <div className="space-y-2">
                        {result.externalSignals.articles.map((article, i) => (
                          <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
                            <span className={cn(
                              "mt-1.5 shrink-0 size-2 rounded-full",
                              article.relevance === "high"   && "bg-red-500",
                              article.relevance === "medium" && "bg-amber-500",
                              article.relevance === "low"    && "bg-muted-foreground/40",
                            )} />
                            <div className="min-w-0">
                              <p className="text-xs font-medium break-words">{article.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 break-words">{article.snippet}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {result.externalSignals.marketContext && (
                        <p className="text-xs text-muted-foreground italic mt-2">
                          Market context: {result.externalSignals.marketContext}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Agent reasoning */}
                  {result.reasoning && (
                    <div className="rounded-lg bg-muted/50 border border-border p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Agent Summary
                      </p>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                        {result.reasoning}
                      </p>
                    </div>
                  )}

                  {/* Suggested action draft */}
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
                      Suggested Message
                    </p>
                    <p className="text-sm text-foreground leading-relaxed break-words whitespace-normal">
                      {result.actionDraft}
                    </p>
                  </div>

                  {/* Send Reminder via Stripe */}
                  {reminderSent ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20 px-4 py-3 flex items-center gap-2">
                      <CheckSquare className="size-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          Reminder sent via Stripe {reminderSent.mode === "mock" && "(mock)"}
                        </p>
                        {reminderSent.hostedUrl ? (
                          <a href={reminderSent.hostedUrl} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 underline mt-0.5 block">
                            View invoice →
                          </a>
                        ) : reminderSent.invoiceId && (
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">{reminderSent.invoiceId}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={sendReminder}
                        disabled={reminderLoading}
                        className="w-full gap-2"
                      >
                        {reminderLoading
                          ? <><Loader2 className="size-4 animate-spin" /> Sending…</>
                          : "Send Reminder via Stripe"}
                      </Button>
                      {reminderError && (
                        <p className="text-xs text-destructive text-center">{reminderError}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
