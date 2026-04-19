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
  ChevronRight,
} from "lucide-react"
import type { ReceivablesInvestigationResult, VerificationChecks } from "@/lib/schemas/receivables-agent"
import { AnalystWorkspace } from "./analyst-workspace"
import type { CheckKey } from "./analyst-workspace"

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

type CheckState = "pending" | "pass" | "fail"

function VerificationRow({ label, state, revealed, onClick, active }: { label: string; state: CheckState; revealed: boolean; onClick?: () => void; active?: boolean }) {
  return (
    <div
      onClick={revealed ? onClick : undefined}
      className={cn(
        "flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0 transition-all duration-300",
        !revealed && "opacity-40 blur-[1.5px]",
        revealed && onClick && "cursor-pointer hover:bg-muted/50",
        active && "bg-primary/5",
      )}
    >
      <span className={cn(
        "text-sm transition-colors duration-300",
        !revealed && "text-muted-foreground/50",
        revealed && (state === "pass" || state === "fail") && "text-foreground",
      )}>
        {label}
      </span>
      <span className="shrink-0 flex items-center gap-1.5">
        {!revealed && (
          <Square className="size-5 text-muted-foreground/30" />
        )}
        {revealed && state === "pass" && (
          <CheckSquare className="size-5 text-emerald-500 fill-emerald-50 animate-in zoom-in-50 duration-200" />
        )}
        {revealed && state === "fail" && (
          <MinusSquare className="size-5 text-red-500 fill-red-50 animate-in zoom-in-50 duration-200" />
        )}
        {revealed && state === "pending" && (
          <Square className="size-5 text-muted-foreground/30" />
        )}
        {revealed && onClick && (state === "pass" || state === "fail") && (
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
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

// ── Agent Memo (polished summary) ─────────────────────────────────────────────

function AgentMemo({ result }: { result: ReceivablesInvestigationResult }) {
  const checks = result.verificationChecks
  const passedCount = CHECK_KEYS.filter((k) => checkPassed(k, checks[k])).length
  const failedCount = CHECK_KEYS.length - passedCount

  const levelWord = {
    low: "low",
    medium: "moderate",
    high: "elevated",
    critical: "critical",
  }[result.riskLevel]

  const actionWord = result.recommendedAction.replace("_", " ")

  // Build the polished memo sections from the raw result data
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Memo header */}
      <div className="px-5 py-4 border-b bg-muted/30">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Investigation Summary</p>
        <p className="text-[13px] font-medium text-foreground leading-snug">
          {result.customerName} — {result.invoiceIds.length} open invoice{result.invoiceIds.length !== 1 ? "s" : ""}, ${result.totalOverdue.toFixed(2)} outstanding, {result.overdueDays} days overdue
        </p>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Executive takeaway */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Executive Takeaway</p>
          <p className="text-sm text-foreground leading-relaxed">
            This account presents {levelWord} collection risk. Of {CHECK_KEYS.length} verification checks performed, {passedCount} passed and {failedCount} flagged concerns. The recommended course of action is <span className="font-medium">{actionWord}</span>.
          </p>
        </div>

        {/* What stands out */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">What Stands Out</p>
          <div className="text-sm text-foreground leading-relaxed space-y-2">
            {!checks.tinMatch && (
              <p>The entity&apos;s tax identification number could not be matched against IRS records, which may indicate the business has no prior filing history with us or the TIN on file is incorrect.</p>
            )}
            {!checks.bankAccountVerified && (
              <p>No verified payment method is on file. Without a card or bank account, automated payment collection is not possible and manual follow-up will be required.</p>
            )}
            {checks.creditHistoryCheck !== "passed" && (
              <p>
                {checks.creditHistoryCheck === "limited_data"
                  ? "Credit history is limited — fewer than three invoices have been processed, making it difficult to assess payment reliability."
                  : "The credit history check flagged concerning payment patterns, including late or missed payments."}
              </p>
            )}
            {checks.watchlistsClear && checks.tinMatch && checks.bankAccountVerified && checks.creditHistoryCheck === "passed" && (
              <p>No major red flags were identified across identity, compliance, or payment checks. The entity appears to be a legitimate business with a reasonable payment track record.</p>
            )}
          </div>
        </div>

        {/* Verification findings */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Verification Findings</p>
          <p className="text-sm text-foreground leading-relaxed">
            Business name {checks.businessNameVerified ? "verified" : "could not be verified"} against public records.
            Office address {checks.addressVerified ? "confirmed" : "unconfirmed"}.
            {checks.peopleVerified
              ? " Key personnel verified through corporate registries."
              : " People verification incomplete — director or key personnel records could not be confirmed."}
            {checks.ownerKycComplete
              ? " Owner identity verification is complete."
              : " Owner KYC remains incomplete."}
          </p>
        </div>

        {/* Compliance signals */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Compliance Signals</p>
          <p className="text-sm text-foreground leading-relaxed">
            {checks.watchlistsClear
              ? "No matches found across OFAC, EU sanctions, UN sanctions, or PEP watchlists."
              : "Potential watchlist match detected — manual review required before any collection action."}
            {" "}
            {checks.taxCompliant
              ? "Tax compliance checks returned no issues."
              : "Tax compliance could not be confirmed."}
            {" "}
            {checks.onlinePresenceVerified
              ? "The entity has a verifiable online presence."
              : "No verifiable online presence was found, which may indicate a newly formed or inactive entity."}
          </p>
        </div>

        {/* Recommended action */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Recommended Action</p>
          <p className="text-sm text-foreground leading-relaxed">
            {result.recommendedAction === "reminder" && "Send a payment reminder. The risk profile does not warrant escalation at this time, but the account should be monitored for continued non-payment."}
            {result.recommendedAction === "payment_plan" && "Offer a structured payment plan. The account shows enough positive signals to warrant continued engagement, but the overdue balance and risk factors suggest a flexible approach will improve recovery odds."}
            {result.recommendedAction === "escalation" && "Escalate to senior collections or legal review. The combination of overdue balance, verification gaps, and risk signals warrants direct human intervention rather than continued automated follow-up."}
            {result.recommendedAction === "write_off" && "Consider writing off this receivable. The risk profile is severe enough that further collection efforts are unlikely to yield results and may not be worth the operational cost."}
          </p>
        </div>
      </div>
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
  fullWidth?:   boolean
}

export function InvestigationPanel({
  invoiceId,
  invoiceNumber,
  customerName,
  balance,
  daysOverdue,
  fullWidth = false,
}: InvestigationPanelProps) {
  const [open, setOpen]             = useState(false)
  const [loading, setLoading]       = useState(false)
  const [result, setResult]         = useState<ReceivablesInvestigationResult | null>(null)
  const [error, setError]           = useState<string | null>(null)
  // Per-check animation state
  const [revealedCount, setRevealedCount] = useState(0)
  const [animating, setAnimating]         = useState(false)
  // Which check is selected for the 3-panel analyst workspace (null = closed)
  const [selectedCheck, setSelectedCheck] = useState<CheckKey | null>(null)

  // When result arrives, progressively reveal rows one by one from top to bottom
  useEffect(() => {
    if (!result) return
    setAnimating(true)
    setRevealedCount(0)

    let i = 0
    const total = CHECK_KEYS.length
    const timer = setInterval(() => {
      i += 1
      setRevealedCount(i)
      if (i >= total) {
        setAnimating(false)
        clearInterval(timer)
      }
    }, 400)

    return () => clearInterval(timer)
  }, [result])

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

  function getCheckState(index: number, key: keyof VerificationChecks): { state: CheckState; revealed: boolean } {
    if (!result) {
      return { state: "pending", revealed: false }
    }
    if (index < revealedCount) {
      const passed = checkPassed(key, result.verificationChecks[key])
      return { state: passed ? "pass" : "fail", revealed: true }
    }
    return { state: "pending", revealed: false }
  }

  return (
    <>
      {/* Trigger button */}
      {fullWidth ? (
        <button
          onClick={() => { setOpen(true); if (!result) runInvestigation() }}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-foreground text-background px-4 py-3 text-[13.5px] font-medium hover:opacity-90 transition-opacity"
        >
          Run collections agent
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => { setOpen(true); if (!result) runInvestigation() }}
          className="gap-1.5"
        >
          <Search className="size-3.5" />
          Investigate
        </Button>
      )}

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

                  {/* Global loading indicator while API is in flight */}
                  {loading && !result && (
                    <div className="flex items-center gap-2.5 mb-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                      <Loader2 className="size-4 text-primary animate-spin" />
                      <span className="text-sm font-medium text-primary">
                        Running verification checks…
                      </span>
                    </div>
                  )}

                  <div className="rounded-lg border border-border bg-card px-4">
                    {CHECK_KEYS.map((key, i) => {
                      const { state, revealed } = getCheckState(i, key)
                      return (
                        <VerificationRow
                          key={key}
                          label={CHECK_LABELS[key]}
                          state={state}
                          revealed={revealed}
                          onClick={revealed && !loading && result && !animating ? () => setSelectedCheck(key as CheckKey) : undefined}
                          active={selectedCheck === key}
                        />
                      )
                    })}
                  </div>
                  {animating && (
                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                      <Loader2 className="size-3 animate-spin" />
                      Revealing results…
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

              {result && !loading && !animating && (
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

                  {/* Agent reasoning — polished memo */}
                  <AgentMemo result={result} />

                  {/* Suggested action draft */}
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
                      Suggested Message
                    </p>
                    <p className="text-sm text-foreground leading-relaxed break-words whitespace-normal">
                      {result.actionDraft}
                    </p>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3-panel analyst workspace — opens when a check is clicked */}
      {selectedCheck !== null && result && (
        <AnalystWorkspace
          selectedCheck={selectedCheck}
          result={result}
          onClose={() => setSelectedCheck(null)}
          checklistPanel={
            <div className="px-4 pt-4 pb-4">
              <div className="rounded-lg border border-border bg-card px-3">
                {CHECK_KEYS.map((key, i) => {
                  const { state, revealed } = getCheckState(i, key)
                  return (
                    <VerificationRow
                      key={key}
                      label={CHECK_LABELS[key]}
                      state={state}
                      revealed={revealed}
                      onClick={revealed ? () => setSelectedCheck(key as CheckKey) : undefined}
                      active={selectedCheck === key}
                    />
                  )
                })}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <ScoreRing score={result.riskScore} level={result.riskLevel} />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Risk Score</p>
                  <RiskBadge level={result.riskLevel} />
                  <p className="text-xs text-muted-foreground capitalize">
                    Recommended: <span className="font-medium text-foreground">{result.recommendedAction.replace("_", " ")}</span>
                  </p>
                </div>
              </div>
            </div>
          }
        />
      )}
    </>
  )
}
