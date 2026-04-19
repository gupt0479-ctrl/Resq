"use client"

import React from "react"
import { cn } from "@/lib/utils"
import {
  CheckSquare,
  MinusSquare,
  Building2,
  MapPin,
  User,
  CreditCard,
  Shield,
  Globe,
  FileText,
  TrendingDown,
  Hash,
} from "lucide-react"
import type { ReceivablesInvestigationResult, VerificationChecks } from "@/lib/schemas/receivables-agent"
import type { CustomerCreditReport, CreditAccount } from "@/lib/data/credit-report-fixtures"
import { getCreditReportForCustomer } from "@/lib/data/credit-report-fixtures"

// ── Types ─────────────────────────────────────────────────────────────────────

type CheckKey = keyof VerificationChecks

// ── Payment history cell ──────────────────────────────────────────────────────

function PayCell({ code }: { code: string }) {
  const base = "w-5 h-5 rounded-sm flex items-center justify-center text-[9px] font-bold shrink-0"
  if (code === "OK") return <div className={cn(base, "bg-emerald-500 text-white")}>✓</div>
  if (code === "30") return <div className={cn(base, "bg-amber-400 text-white")}>30</div>
  if (code === "60") return <div className={cn(base, "bg-orange-500 text-white")}>60</div>
  if (code === "90") return <div className={cn(base, "bg-red-500 text-white")}>90</div>
  if (code === "CO") return <div className={cn(base, "bg-red-900 text-white")}>CO</div>
  return <div className={cn(base, "bg-muted text-muted-foreground")}>ND</div>
}

// ── Account card ──────────────────────────────────────────────────────────────

function AccountCard({ account, highlight }: { account: CreditAccount; highlight?: boolean }) {
  const statusColors = {
    current:     "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-800",
    late_30:     "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/20 dark:border-amber-800",
    late_60:     "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-900/20 dark:border-orange-800",
    late_90:     "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-900/20 dark:border-red-800",
    charged_off: "text-red-900 bg-red-100 border-red-300 dark:text-red-200 dark:bg-red-900/30 dark:border-red-700",
    collection:  "text-red-900 bg-red-100 border-red-300 dark:text-red-200 dark:bg-red-900/30 dark:border-red-700",
  }
  const statusLabels = {
    current: "Current", late_30: "30 Days Late", late_60: "60 Days Late",
    late_90: "90 Days Late", charged_off: "Charged Off", collection: "In Collection",
  }

  return (
    <div className={cn(
      "rounded-lg border bg-card p-4 space-y-3",
      highlight ? "border-amber-300 bg-amber-50/30 dark:border-amber-700 dark:bg-amber-900/10" : "border-border",
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{account.accountName}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{account.accountNumber} · {account.type}</p>
        </div>
        <span className={cn("shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded border", statusColors[account.status])}>
          {statusLabels[account.status]}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <p className="text-muted-foreground">Balance</p>
          <p className="font-semibold">${account.balance.toLocaleString()}</p>
        </div>
        {account.creditLimit && (
          <div>
            <p className="text-muted-foreground">Limit</p>
            <p className="font-semibold">${account.creditLimit.toLocaleString()}</p>
          </div>
        )}
        <div>
          <p className="text-muted-foreground">Opened</p>
          <p className="font-semibold">{account.dateOpened}</p>
        </div>
      </div>

      {/* Payment history grid */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-1.5">Payment History (24 months, newest first)</p>
        <div className="flex flex-wrap gap-0.5">
          {account.paymentHistory.slice(0, 24).map((code, i) => (
            <PayCell key={i} code={code} />
          ))}
        </div>
      </div>

      {account.remarks && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1">
          ⚠ {account.remarks}
        </p>
      )}
    </div>
  )
}

// ── Evidence panel (LEFT) ─────────────────────────────────────────────────────

function EvidencePanel({ checkKey, report }: { checkKey: CheckKey; report: CustomerCreditReport }) {
  const header = (
    <div className="flex items-center gap-2 px-5 py-3 border-b bg-muted/20 shrink-0">
      <FileText className="size-3.5 text-muted-foreground" />
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
        {report.bureau} Credit Report · {report.reportDate}
      </p>
      <span className="ml-auto text-[10px] text-muted-foreground">#{report.reportNumber}</span>
    </div>
  )

  // Credit History — show full account list + payment grids
  if (checkKey === "creditHistoryCheck") {
    const badAccounts = report.accounts.filter((a) => a.status !== "current")
    const goodAccounts = report.accounts.filter((a) => a.status === "current")
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {header}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-foreground">Account History</p>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-emerald-500 inline-block" />OK</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-amber-400 inline-block" />30d</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-red-500 inline-block" />90d</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-red-900 inline-block" />CO</span>
            </div>
          </div>
          {badAccounts.map((a) => <AccountCard key={a.accountNumber} account={a} highlight />)}
          {goodAccounts.map((a) => <AccountCard key={a.accountNumber} account={a} />)}
          {report.publicRecords.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-foreground mb-2">Public Records</p>
              {report.publicRecords.map((pr, i) => (
                <div key={i} className="rounded-lg border border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20 px-4 py-3 mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-red-700 dark:text-red-300">{pr.type}</p>
                    <span className="text-[10px] font-semibold text-red-600 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">{pr.status}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{pr.court} · {pr.dateField}</p>
                  {pr.amount && <p className="text-[11px] font-semibold text-red-700 dark:text-red-300 mt-0.5">Amount: ${pr.amount.toLocaleString()}</p>}
                  {pr.referenceNumber && <p className="text-[10px] text-muted-foreground">Ref: {pr.referenceNumber}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Personal info checks — show personal section
  if (checkKey === "businessNameVerified" || checkKey === "peopleVerified" || checkKey === "ownerKycComplete") {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {header}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <p className="text-xs font-semibold text-foreground">Personal Information</p>
          <div className="rounded-lg border border-border bg-card divide-y divide-border/50">
            {[
              { label: "Full Name", value: report.personal.name },
              { label: "SSN", value: report.personal.ssn },
              { label: "Date of Birth", value: report.personal.dob },
              { label: "Current Address", value: report.personal.currentAddress },
            ].map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4 px-4 py-2.5">
                <span className="text-[11px] text-muted-foreground shrink-0">{row.label}</span>
                <span className="text-[11px] font-medium text-right">{row.value}</span>
              </div>
            ))}
          </div>
          {report.personal.previousAddresses.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Previous Addresses</p>
              {report.personal.previousAddresses.map((addr, i) => (
                <p key={i} className="text-[11px] text-foreground py-1 border-b border-border/40 last:border-0">{addr}</p>
              ))}
            </div>
          )}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Employment</p>
            {report.personal.employers.map((emp, i) => (
              <div key={i} className="rounded-lg border border-border bg-card px-4 py-2.5 mb-2">
                <p className="text-[11px] font-semibold">{emp.name}</p>
                <p className="text-[10px] text-muted-foreground">{emp.address}</p>
                <p className="text-[10px] text-muted-foreground">Reported: {emp.dateReported}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Address check — show address section
  if (checkKey === "addressVerified" || checkKey === "utilityBillVerified") {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {header}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <p className="text-xs font-semibold text-foreground">Address Records</p>
          <div className="rounded-lg border border-border bg-card divide-y divide-border/50">
            <div className="px-4 py-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Current Address</p>
              <p className="text-sm font-medium">{report.personal.currentAddress}</p>
            </div>
            {report.personal.previousAddresses.map((addr, i) => (
              <div key={i} className="px-4 py-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Previous Address {i + 1}</p>
                <p className="text-sm font-medium">{addr}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Account Addresses on File</p>
            {report.accounts.slice(0, 3).map((a) => (
              <p key={a.accountNumber} className="text-[11px] text-foreground py-1 border-b border-border/40 last:border-0">
                {a.accountName} — {a.dateOpened}
              </p>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Bank / payment method — show account summary
  if (checkKey === "bankAccountVerified" || checkKey === "tinMatch" || checkKey === "taxCompliant") {
    const summary = report.summary
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {header}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <p className="text-xs font-semibold text-foreground">Account Summary</p>
          <div className="rounded-lg border border-border bg-card divide-y divide-border/50">
            {[
              { label: "Total Accounts", value: String(summary.totalAccounts) },
              { label: "Open Accounts", value: String(summary.openAccounts) },
              { label: "Delinquent Accounts", value: String(summary.delinquentAccounts), warn: summary.delinquentAccounts > 0 },
              { label: "Derogatory Marks", value: String(summary.derogatoryMarks), warn: summary.derogatoryMarks > 0 },
              { label: "Total Balance", value: `$${summary.totalBalance.toLocaleString()}` },
              { label: "Total Credit Limit", value: `$${summary.totalCreditLimit.toLocaleString()}` },
              { label: "Monthly Payments", value: `$${summary.monthlyPayments.toLocaleString()}` },
              { label: "Oldest Account", value: summary.oldestAccount },
              { label: "Avg Account Age", value: summary.averageAccountAge },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[11px] text-muted-foreground">{row.label}</span>
                <span className={cn("text-[11px] font-semibold", row.warn ? "text-red-600 dark:text-red-400" : "text-foreground")}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs font-semibold text-foreground">Accounts</p>
          {report.accounts.slice(0, 2).map((a) => <AccountCard key={a.accountNumber} account={a} />)}
        </div>
      </div>
    )
  }

  // Watchlist / compliance — show score + public records
  if (checkKey === "watchlistsClear") {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {header}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{report.creditScore}</p>
              <p className="text-[10px] text-muted-foreground">{report.scoreRange}</p>
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-semibold mb-1">Score Factors</p>
              {report.scoreFactors.slice(0, 3).map((f, i) => (
                <p key={i} className="text-[10px] text-muted-foreground leading-relaxed">• {f}</p>
              ))}
            </div>
          </div>
          {report.publicRecords.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">Public Records ({report.publicRecords.length})</p>
              {report.publicRecords.map((pr, i) => (
                <div key={i} className="rounded-lg border border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20 px-4 py-3 mb-2">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-300">{pr.type}</p>
                  <p className="text-[11px] text-muted-foreground">{pr.court} · {pr.dateField}</p>
                  {pr.amount && <p className="text-[11px] font-semibold text-red-700 dark:text-red-300">Amount: ${pr.amount.toLocaleString()}</p>}
                  <p className="text-[10px] text-muted-foreground">Status: {pr.status}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20 px-4 py-3">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">No Public Records Found</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">No judgments, liens, or bankruptcies on file.</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Recent Inquiries</p>
            {report.inquiries.filter((q) => q.type === "hard").map((q, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                <span className="text-[11px] text-foreground">{q.creditor}</span>
                <span className="text-[10px] text-muted-foreground">{q.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Online presence — show score + inquiries
  if (checkKey === "onlinePresenceVerified") {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {header}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-[11px] font-semibold mb-2">Credit Score</p>
            <div className="flex items-center gap-3">
              <p className="text-3xl font-bold">{report.creditScore}</p>
              <div>
                <p className="text-[10px] text-muted-foreground">{report.scoreRange}</p>
                <p className="text-[10px] text-muted-foreground">{report.bureau}</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">All Inquiries</p>
            {report.inquiries.map((q, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                <span className="text-[11px] text-foreground">{q.creditor}</span>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold",
                    q.type === "hard" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-muted text-muted-foreground"
                  )}>{q.type}</span>
                  <span className="text-[10px] text-muted-foreground">{q.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Default — show report summary
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {header}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{report.creditScore}</p>
            <p className="text-[10px] text-muted-foreground">{report.scoreRange}</p>
          </div>
          <div className="flex-1 space-y-1">
            {report.scoreFactors.map((f, i) => (
              <p key={i} className="text-[10px] text-muted-foreground">• {f}</p>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card divide-y divide-border/50">
          {[
            { label: "Report Date", value: report.reportDate },
            { label: "Bureau", value: report.bureau },
            { label: "Total Accounts", value: String(report.summary.totalAccounts) },
            { label: "Derogatory Marks", value: String(report.summary.derogatoryMarks) },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[11px] text-muted-foreground">{row.label}</span>
              <span className="text-[11px] font-semibold">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Analysis panel helpers ────────────────────────────────────────────────────

function StatusBadge({ passed, limitedData }: { passed: boolean; limitedData?: boolean }) {
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold",
      passed
        ? "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-800"
        : "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-900/20 dark:border-red-800",
    )}>
      {passed ? <CheckSquare className="size-3.5" /> : <MinusSquare className="size-3.5" />}
      {passed ? "Passed" : limitedData ? "Limited Data" : "Failed"}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">{title}</p>
      <div className="text-sm text-foreground leading-relaxed">{children}</div>
    </div>
  )
}

function Callout({ children, variant = "primary" }: { children: React.ReactNode; variant?: "primary" | "warn" | "danger" }) {
  return (
    <div className={cn(
      "rounded-lg border px-4 py-3 text-sm leading-relaxed",
      variant === "primary" && "bg-primary/5 border-primary/20 text-foreground",
      variant === "warn" && "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-200",
      variant === "danger" && "bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200",
    )}>
      {children}
    </div>
  )
}

// ── Analysis panel (MIDDLE) ───────────────────────────────────────────────────

function AnalysisPanel({ checkKey, result, report }: {
  checkKey: CheckKey
  result: ReceivablesInvestigationResult
  report: CustomerCreditReport
}) {
  const checks = result.verificationChecks
  const val = checks[checkKey]
  const passed = checkKey === "creditHistoryCheck" ? val === "passed" : val === true
  const limitedData = checkKey === "creditHistoryCheck" && val === "limited_data"

  // ── Credit History ──────────────────────────────────────────────────────────
  if (checkKey === "creditHistoryCheck") {
    const cr = result.creditReport
    const badAccounts = report.accounts.filter((a) => a.status !== "current")
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <StatusBadge passed={passed} limitedData={limitedData} />
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded",
            cr.overallStatus === "clean" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
            cr.overallStatus === "caution" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
            cr.overallStatus === "high_risk" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
          )}>
            {cr.overallStatus.replace("_", " ").toUpperCase()}
          </span>
        </div>
        <Section title="What Was Checked">
          We reviewed the full payment history across all accounts on file, including on-time payment rate, delinquency patterns, charged-off accounts, and public records. The assessment covers the past 24 months of activity.
        </Section>
        <Section title="What Was Found">
          <p className="mb-2">
            {val === "passed"
              ? `${report.customerName} has a consistent payment record with no significant delinquencies. All active accounts are current.`
              : val === "limited_data"
              ? `Fewer than three invoices have been processed for this entity, making a full credit assessment unreliable. The accounts on file show ${badAccounts.length > 0 ? "some concerning patterns" : "no major issues"}.`
              : `Payment history shows ${badAccounts.length} account${badAccounts.length !== 1 ? "s" : ""} with delinquency or charge-off status. This is a significant risk signal.`}
          </p>
          {cr.redFlags.length > 0 && (
            <div className="space-y-2 mt-3">
              {cr.redFlags.map((flag) => (
                <div key={flag.flag} className={cn(
                  "rounded-lg border px-3 py-2.5 flex items-start gap-2",
                  flag.severity === "critical" && "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20",
                  flag.severity === "warning" && "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20",
                  flag.severity === "none" && "border-border bg-card",
                )}>
                  <span className={cn("size-2 rounded-full mt-1.5 shrink-0",
                    flag.severity === "critical" && "bg-red-500",
                    flag.severity === "warning" && "bg-amber-500",
                    flag.severity === "none" && "bg-emerald-500",
                  )} />
                  <div>
                    <p className="text-xs font-semibold">{flag.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{flag.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
        <Section title="Why It Matters">
          {val === "passed"
            ? "A clean credit history gives the collections agent confidence to pursue standard recovery actions. The entity has demonstrated consistent willingness to pay."
            : val === "limited_data"
            ? "Without sufficient payment history, the system cannot reliably predict whether this entity will pay. Automated collection actions carry higher uncertainty."
            : "Delinquent accounts and charge-offs indicate a pattern of non-payment. This significantly increases the risk of non-recovery and warrants escalated handling."}
        </Section>
        <Callout variant={passed ? "primary" : val === "limited_data" ? "warn" : "danger"}>
          <p className="text-xs font-semibold mb-1">Recommended Next Step</p>
          {val === "passed" && "Proceed with standard collection workflow. No credit-related holds required."}
          {val === "limited_data" && "Request a payment upfront or offer a structured payment plan. Flag for manual review on future invoices."}
          {val === "failed" && "Escalate to senior collections review. Shorten payment terms for future engagements and require deposits before service delivery."}
        </Callout>
      </div>
    )
  }

  // ── Business Name ───────────────────────────────────────────────────────────
  if (checkKey === "businessNameVerified") {
    const co = result.companyInfo
    return (
      <div className="space-y-5">
        <StatusBadge passed={passed} limitedData={limitedData} />
        <Section title="What Was Checked">
          The submitted business name was cross-referenced against the Secretary of State business registry for the entity&apos;s registered state, public corporate databases, and the name on file in the credit report.
        </Section>
        <Section title="What Was Found">
          {passed
            ? `The business name "${co?.companyName ?? result.customerName}" matches active registration records. No name changes or dissolution events were detected.`
            : `The submitted business name could not be confirmed against public registry records. This may indicate the entity is unregistered, recently formed, or operating under a different legal name.`}
        </Section>
        <Section title="Why It Matters">
          A verified business name confirms the entity is a legitimate registered business. Unverified names increase the risk of dealing with a shell entity or a business that cannot be legally pursued for collections.
        </Section>
        <Callout variant={passed ? "primary" : "warn"}>
          <p className="text-xs font-semibold mb-1">Recommended Next Step</p>
          {passed ? "No action required. Business name is confirmed." : "Request official registration documents from the client before proceeding with any collection action."}
        </Callout>
      </div>
    )
  }

  // ── Address ─────────────────────────────────────────────────────────────────
  if (checkKey === "addressVerified") {
    const co = result.companyInfo
    return (
      <div className="space-y-5">
        <StatusBadge passed={passed} limitedData={limitedData} />
        <Section title="What Was Checked">
          The submitted office address was validated against Google Maps geocoding, cross-referenced with the address on the credit report, and checked for virtual office patterns (high-numbered suites in commercial mail centers).
        </Section>
        <Section title="What Was Found">
          {passed
            ? `The address "${co?.address ?? "on file"}" resolves to a real commercial location and matches the address associated with the entity&apos;s credit accounts.`
            : `The submitted address could not be confirmed as a legitimate commercial location. It may be a virtual office, residential address, or an address that does not match any credit account on file.`}
        </Section>
        <Section title="Why It Matters">
          A verified address confirms the business operates from a real location and can be physically contacted or served legal documents if collections escalate.
        </Section>
        <Callout variant={passed ? "primary" : "warn"}>
          <p className="text-xs font-semibold mb-1">Recommended Next Step</p>
          {passed ? "Address confirmed. No further action needed." : "Request a utility bill or lease agreement to confirm the physical operating address."}
        </Callout>
      </div>
    )
  }

  // ── People Verification ─────────────────────────────────────────────────────
  if (checkKey === "peopleVerified") {
    const co = result.companyInfo
    const people = co?.keyPeople ?? []
    return (
      <div className="space-y-5">
        <StatusBadge passed={passed} limitedData={limitedData} />
        <Section title="What Was Checked">
          Key personnel associated with this entity were searched across OpenCorporates, Secretary of State registries, and the credit report&apos;s employment records to identify any patterns of concern.
        </Section>
        <Section title="What Was Found">
          {passed
            ? `${people.length > 0 ? people.join(", ") : "Key personnel"} verified through corporate registries. No dissolution patterns or shell company indicators found.`
            : `People verification was incomplete. Director or key personnel records could not be confirmed through available public sources.`}
          {people.length > 0 && (
            <div className="mt-2 rounded-lg border border-border bg-card px-4 py-2.5">
              {people.map((p) => (
                <p key={p} className="text-xs py-1 border-b border-border/40 last:border-0">{p}</p>
              ))}
            </div>
          )}
        </Section>
        <Section title="Why It Matters">
          Verifying key people confirms the entity is run by real, identifiable individuals with no history of fraudulent business activity or rapid company dissolution patterns.
        </Section>
        <Callout variant={passed ? "primary" : "warn"}>
          <p className="text-xs font-semibold mb-1">Recommended Next Step</p>
          {passed ? "People verification complete." : "Request director identification documents and cross-check against corporate registry records."}
        </Callout>
      </div>
    )
  }

  // ── TIN Match ───────────────────────────────────────────────────────────────
  if (checkKey === "tinMatch") {
    return (
      <div className="space-y-5">
        <StatusBadge passed={passed} limitedData={limitedData} />
        <Section title="What Was Checked">
          The entity&apos;s tax identification number (TIN/EIN) was validated against IRS records and cross-referenced with the payment history on file to confirm the entity has a legitimate tax filing history.
        </Section>
        <Section title="What Was Found">
          {passed
            ? "The TIN on file matches IRS records for this entity. The business has a verifiable tax filing history, which is consistent with a legitimate operating company."
            : "The TIN could not be matched against IRS records. This may indicate the entity has no prior filing history, the TIN on file is incorrect, or the business is newly formed."}
        </Section>
        <Section title="Why It Matters">
          A valid TIN confirms the entity is registered with the IRS and has a tax identity. Without a matched TIN, the business may be operating informally or may not be legally collectible.
        </Section>
        <Callout variant={passed ? "primary" : "warn"}>
          <p className="text-xs font-semibold mb-1">Recommended Next Step</p>
          {passed ? "TIN verified. No action required." : "Request the entity's EIN confirmation letter (IRS Form CP 575) before extending further credit."}
        </Callout>
      </div>
    )
  }

  // ── Watchlist ───────────────────────────────────────────────────────────────
  if (checkKey === "watchlistsClear") {
    const ws = result.watchlistScreening
    const flagged = ws?.overallStatus === "flagged"
    return (
      <div className="space-y-5">
        <StatusBadge passed={passed} limitedData={limitedData} />
        {ws && (
          <div className={cn(
            "rounded-lg border px-4 py-3",
            flagged ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20" : "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20",
          )}>
            <p className={cn("text-xs font-semibold", flagged ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300")}>
              {flagged ? "⚠ Watchlist Match Detected" : "✓ All Lists Clear"}
            </p>
            {ws.screenedNames.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">Screened: {ws.screenedNames.join(", ")}</p>
            )}
          </div>
        )}
        <Section title="What Was Checked">
          The entity&apos;s director name and company name were screened against OFAC SDN, EU Financial Sanctions, UN Security Council Sanctions, and PEP lists. Public records were also reviewed for civil judgments and tax liens.
        </Section>
        <Section title="What Was Found">
          {passed
            ? "No matches found on any sanctions list or PEP database. Public records show no judgments or liens."
            : "A potential watchlist match was detected. This requires immediate manual review before any collection action can proceed."}
          {report.publicRecords.length > 0 && (
            <div className="mt-2 space-y-2">
              {report.publicRecords.map((pr, i) => (
                <div key={i} className="rounded-lg border border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20 px-3 py-2">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-300">{pr.type} — {pr.status}</p>
                  <p className="text-[11px] text-muted-foreground">{pr.court} · {pr.dateField}</p>
                  {pr.amount && <p className="text-[11px] font-semibold text-red-700 dark:text-red-300">${pr.amount.toLocaleString()}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>
        <Section title="Why It Matters">
          {passed
            ? "A clean watchlist result means the entity is not subject to sanctions and can be engaged through standard collection processes."
            : "A watchlist match is a hard block. Proceeding with collection actions against a sanctioned entity may violate federal law. This must be resolved by a compliance officer before any further action."}
        </Section>
        <Callout variant={passed ? "primary" : "danger"}>
          <p className="text-xs font-semibold mb-1">Recommended Next Step</p>
          {passed ? "No compliance concerns. Proceed with standard workflow." : "Immediately escalate to legal and compliance. Do not send any communications to this entity until the watchlist match is resolved."}
        </Callout>
      </div>
    )
  }

  // ── Bank Account ────────────────────────────────────────────────────────────
  if (checkKey === "bankAccountVerified") {
    return (
      <div className="space-y-5">
        <StatusBadge passed={passed} limitedData={limitedData} />
        <Section title="What Was Checked">
          The submitted bank account and routing number were validated through Plaid sandbox verification. The account was checked for active status, account type, and institution match.
        </Section>
        <Section title="What Was Found">
          {passed
            ? "A verified payment method is on file. The bank account is active and the routing number is valid."
            : "No verified bank account or payment method could be confirmed. The submitted details either failed validation or were not provided."}
        </Section>
        <Section title="Why It Matters">
          A verified bank account is required for automated payment collection. Without it, the collections agent cannot initiate ACH transfers or automated payment requests.
        </Section>
        <Callout variant={passed ? "primary" : "warn"}>
          <p className="text-xs font-semibold mb-1">Recommended Next Step</p>
          {passed ? "Payment method confirmed. Automated collection is available." : "Request updated bank account details from the client. Consider requiring a voided check or bank statement."}
        </Callout>
      </div>
    )
  }

  // ── Tax Compliance ──────────────────────────────────────────────────────────
  if (checkKey === "taxCompliant") {
    return (
      <div className="space-y-5">
        <StatusBadge passed={passed} limitedData={limitedData} />
        <Section title="What Was Checked">
          Tax compliance was assessed based on available public records, IRS filing indicators, and any tax liens found in the credit report.
        </Section>
        <Section title="What Was Found">
          {passed
            ? `No tax liens or IRS compliance issues found for ${result.customerName}. The entity appears to be in good standing with federal and state tax authorities.`
            : `Tax compliance could not be confirmed. There may be outstanding tax obligations or the entity has insufficient filing history.`}
          {report.publicRecords.filter((pr) => pr.type === "Tax Lien").map((pr, i) => (
            <div key={i} className="mt-2 rounded-lg border border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20 px-3 py-2">
              <p className="text-xs font-semibold text-red-700 dark:text-red-300">Tax Lien — {pr.status}</p>
              <p className="text-[11px] text-muted-foreground">{pr.court} · {pr.dateField}</p>
              {pr.amount && <p className="text-[11px] font-semibold text-red-700 dark:text-red-300">${pr.amount.toLocaleString()}</p>}
            </div>
          ))}
        </Section>
        <Section title="Why It Matters">
          Tax liens take priority over other creditors in collections proceedings. An entity with outstanding tax obligations may have limited assets available for recovery.
        </Section>
        <Callout variant={passed ? "primary" : "warn"}>
          <p className="text-xs font-semibold mb-1">Recommended Next Step</p>
          {passed ? "No tax compliance issues. Proceed normally." : "Request tax clearance documentation before extending further credit or initiating legal collection."}
        </Callout>
      </div>
    )
  }

  // ── Owner KYC ───────────────────────────────────────────────────────────────
  if (checkKey === "ownerKycComplete") {
    return (
      <div className="space-y-5">
        <StatusBadge passed={passed} limitedData={limitedData} />
        <Section title="What Was Checked">
          Owner and director identity verification was performed, including document analysis, liveness check, and cross-matching of submitted identity documents against corporate registry records.
        </Section>
        <Section title="What Was Found">
          {passed
            ? `Identity verification for ${result.customerName} is complete. Documents were authenticated and the liveness check passed.`
            : `Owner KYC is incomplete. Contact information or identity documents may be missing, or the verification link was not completed.`}
        </Section>
        <Section title="Why It Matters">
          Completed owner KYC confirms the person controlling the entity is who they claim to be. Without it, the collections agent cannot be certain it is communicating with the correct party.
        </Section>
        <Callout variant={passed ? "primary" : "warn"}>
          <p className="text-xs font-semibold mb-1">Recommended Next Step</p>
          {passed ? "Owner identity confirmed." : "Resend the KYC verification link and follow up directly with the director to complete the identity check."}
        </Callout>
      </div>
    )
  }

  // ── Utility Bill / Operational Presence ────────────────────────────────────
  if (checkKey === "utilityBillVerified") {
    return (
      <div className="space-y-5">
        <StatusBadge passed={passed} limitedData={limitedData} />
        <Section title="What Was Checked">
          Recent operational activity was assessed by reviewing account activity dates, address consistency across credit accounts, and any available utility or service records.
        </Section>
        <Section title="What Was Found">
          {passed
            ? "Recent account activity confirms the entity is actively operating at the registered address. The most recent credit account activity is within the past 12 months."
            : "No recent activity was found to confirm the entity is currently operating at the registered location. This may indicate the business is dormant or has relocated."}
        </Section>
        <Section title="Why It Matters">
          Confirming operational presence ensures the entity is still active and reachable. A dormant or relocated business significantly reduces the likelihood of successful collections.
        </Section>
        <Callout variant={passed ? "primary" : "warn"}>
          <p className="text-xs font-semibold mb-1">Recommended Next Step</p>
          {passed ? "Operational presence confirmed." : "Attempt direct contact to verify the entity is still operating before investing further in collection efforts."}
        </Callout>
      </div>
    )
  }

  // ── Online Presence ─────────────────────────────────────────────────────────
  if (checkKey === "onlinePresenceVerified") {
    const ext = result.externalSignals
    return (
      <div className="space-y-5">
        <StatusBadge passed={passed} limitedData={limitedData} />
        <Section title="What Was Checked">
          The entity&apos;s submitted website was visited and assessed for legitimacy. Domain age, business name match, and content quality were evaluated. External news and media signals were also reviewed.
        </Section>
        <Section title="What Was Found">
          {passed
            ? "The entity has a verifiable online presence. The website loads, contains real business content, and the business name matches."
            : "No verifiable online presence was found. The website may not exist, be a placeholder, or the business name does not match the submitted URL."}
          {ext?.searched && ext.articles.length > 0 && (
            <div className="mt-2 space-y-2">
              {ext.articles.slice(0, 3).map((a, i) => (
                <div key={i} className="rounded-lg border border-border bg-card px-3 py-2">
                  <p className="text-xs font-medium">{a.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{a.snippet}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
        <Section title="Why It Matters">
          A legitimate online presence is a basic signal of business authenticity. Entities with no web presence or newly registered domains carry higher fraud risk.
        </Section>
        <Callout variant={passed ? "primary" : "warn"}>
          <p className="text-xs font-semibold mb-1">Recommended Next Step</p>
          {passed ? "Online presence confirmed." : "Request the entity's official website and social media profiles. Consider a manual review of their digital footprint."}
        </Callout>
      </div>
    )
  }

  // Fallback
  return (
    <div className="space-y-5">
      <StatusBadge passed={passed} limitedData={limitedData} />
      <Section title="Result">
        {passed ? "This check passed." : "This check did not pass. Review the evidence panel for details."}
      </Section>
    </div>
  )
}

// ── Check label map ───────────────────────────────────────────────────────────

const CHECK_LABELS: Record<CheckKey, string> = {
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

const CHECK_ICONS: Record<CheckKey, React.ReactNode> = {
  businessNameVerified:   <Building2 className="size-3.5" />,
  addressVerified:        <MapPin className="size-3.5" />,
  peopleVerified:         <User className="size-3.5" />,
  tinMatch:               <Hash className="size-3.5" />,
  watchlistsClear:        <Shield className="size-3.5" />,
  bankAccountVerified:    <CreditCard className="size-3.5" />,
  taxCompliant:           <FileText className="size-3.5" />,
  ownerKycComplete:       <User className="size-3.5" />,
  creditHistoryCheck:     <TrendingDown className="size-3.5" />,
  utilityBillVerified:    <Building2 className="size-3.5" />,
  onlinePresenceVerified: <Globe className="size-3.5" />,
}

// ── Main 3-panel workspace ────────────────────────────────────────────────────

interface AnalystWorkspaceProps {
  selectedCheck: CheckKey
  result: ReceivablesInvestigationResult
  onClose: () => void
  checklistPanel: React.ReactNode
}

export function AnalystWorkspace({ selectedCheck, result, onClose, checklistPanel }: AnalystWorkspaceProps) {
  const report = getCreditReportForCustomer(result.customerName)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* 3-panel container */}
      <div className="relative w-[96vw] max-w-[1400px] h-[88vh] bg-background rounded-xl shadow-2xl flex overflow-hidden">

        {/* ── LEFT: Evidence / Document ── */}
        <div className="w-[30%] shrink-0 border-r flex flex-col overflow-hidden bg-muted/10">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-background shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <p className="text-xs font-semibold">Source Evidence</p>
            </div>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">{report.bureau}</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <EvidencePanel checkKey={selectedCheck} report={report} />
          </div>
        </div>

        {/* ── MIDDLE: AI Analysis ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b bg-background shrink-0">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              {CHECK_ICONS[selectedCheck]}
            </div>
            <p className="text-xs font-semibold">{CHECK_LABELS[selectedCheck]}</p>
            <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">AI Analysis</span>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <AnalysisPanel checkKey={selectedCheck} result={result} report={report} />
          </div>
        </div>

        {/* ── RIGHT: Verification Checklist ── */}
        <div className="w-[28%] shrink-0 border-l flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-background shrink-0">
            <p className="text-xs font-semibold">Verification Checks</p>
            <button onClick={onClose} className="rounded-md p-1 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {checklistPanel}
          </div>
        </div>

      </div>
    </div>
  )
}

// Export types for use in parent
export type { CheckKey }
