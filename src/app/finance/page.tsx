import type { ReactNode } from "react"
import { connection } from "next/server"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  TrendingUp,
  AlertCircle,
  Lightbulb,
  CheckCircle,
  Calendar,
  Download,
} from "lucide-react"
import {
  FinanceExpenseChart,
  FinanceWeeklyRevenueChart,
} from "@/components/finance/finance-charts"
import type { WeeklyDataPoint } from "@/components/finance/WeeklyRevenueChart"
import type { ExpenseSlice } from "@/components/finance/ExpenseChart"
import { TaxFilterPills } from "@/components/finance/TaxFilterPills"
import type { TaxTransaction } from "@/components/finance/TaxFilterPills"
import { CountUpNumber } from "@/components/finance/CountUpNumber"
import { FinanceAnimations } from "@/components/finance/FinanceAnimations"
import { DEMO_ORG_ID } from "@/lib/db"
import { isDatabaseConfigured } from "@/lib/env"
import { getFinanceSummaryQuery, listTransactionsQuery } from "@/lib/queries/finance"
import { listInvoicesQuery } from "@/lib/queries/invoices"
import type { FinanceTransactionResponse } from "@/lib/schemas/finance"
import type { InvoiceStatus } from "@/lib/constants/enums"

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" })
}

function fmtRound(n: number) {
  return Math.round(n).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

// ── Data derivation helpers ───────────────────────────────────────────────────

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
const WEEK_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

function buildWeeklyChartData(
  transactions: FinanceTransactionResponse[]
): WeeklyDataPoint[] {
  const byDay: Record<string, number> = {
    Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0,
  }
  for (const t of transactions) {
    if (t.direction !== "in") continue
    const day = DAY_ABBR[new Date(t.occurredAt).getDay()]
    byDay[day] = (byDay[day] ?? 0) + t.amount
  }
  return WEEK_ORDER.map((day) => ({
    day,
    revenue: Math.round((byDay[day] ?? 0) * 100) / 100,
  }))
}

const CATEGORY_COLORS: Record<string, string> = {
  labor:             "#4b5563",
  protein:           "#f87171",
  utilities:         "#fbbf24",
  beverage:          "#60a5fa",
  produce:           "#4ade80",
  dairy:             "#2dd4bf",
  platform:          "#c084fc",
  waste:             "#fb923c",
  inventory_purchase:"#34d399",
  dining_revenue:    "#6366f1",
}
const EXTRA_COLORS = ["#94a3b8", "#f472b6", "#a78bfa", "#38bdf8", "#fb7185"]

function buildExpenseChartData(
  expenseTransactions: FinanceTransactionResponse[]
): ExpenseSlice[] {
  const byCat: Record<string, number> = {}
  for (const t of expenseTransactions) {
    byCat[t.category] = (byCat[t.category] ?? 0) + t.amount
  }
  let extra = 0
  return Object.entries(byCat).map(([cat, value]) => ({
    name:  cat === "dining_revenue" ? "Revenue" : cat,
    value: Math.round(value * 100) / 100,
    color: CATEGORY_COLORS[cat] ?? EXTRA_COLORS[extra++ % EXTRA_COLORS.length],
  }))
}

function buildTaxTransactions(
  transactions: FinanceTransactionResponse[]
): TaxTransaction[] {
  return transactions
    .filter((t) => t.taxRelevant)
    .map((t) => ({
      date: new Date(t.occurredAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      description: t.notes ?? t.category,
      category: t.category,
      amount: t.amount,
      type: t.type,
      writeoffEligible: (t.writeoffEligible ? "yes" : "no") as TaxTransaction["writeoffEligible"],
    }))
}

function computeDaysOverdue(dueAt: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(dueAt).getTime()) / (1000 * 60 * 60 * 24))
  )
}

function formatDueDate(dueAt: string): string {
  return new Date(dueAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

// ── Sparkline paths (80×20 decorative SVG, no axes) ──────────────────────────

const SPARKLINE_PATHS: Record<string, string> = {
  up:       "M0,17 C15,15 30,12 45,9 S65,5 80,2",
  spike:    "M0,13 C20,13 30,13 40,13 C50,13 55,7 60,4 C65,2 70,2 80,3",
  steady:   "M0,11 C20,10 40,12 60,10 S75,11 80,10",
  dip:      "M0,4 C15,7 30,12 45,15 S65,18 80,17",
  steadyUp: "M0,17 C15,15 35,11 55,7 S70,4 80,3",
}

const SPARKLINE_COLORS: Record<string, string> = {
  blue:   "#60a5fa",
  red:    "#f87171",
  amber:  "#fbbf24",
  green:  "#4ade80",
  purple: "#c084fc",
  gray:   "#94a3b8",
}

const DEFAULT_SPARKLINE_VARIANT: Record<string, keyof typeof SPARKLINE_PATHS> = {
  blue:   "up",
  red:    "dip",
  amber:  "steady",
  green:  "up",
  purple: "steadyUp",
  gray:   "steady",
}

// ── Sub-components ────────────────────────────────────────────────────────────

type KpiColor = "green" | "gray" | "red" | "amber" | "blue" | "purple"

function KpiCard({
  label,
  value,
  sub,
  color,
  sparkline: sparklineOverride,
}: {
  label: string
  value: string
  sub: string
  color: KpiColor
  sparkline?: keyof typeof SPARKLINE_PATHS
}) {
  const topBorderMap: Record<KpiColor, string> = {
    blue:   "border-t-blue-500",
    red:    "border-t-red-500",
    amber:  "border-t-amber-500",
    green:  "border-t-green-500",
    purple: "border-t-purple-500",
    gray:   "border-t-slate-500",
  }
  const shadowMap: Record<KpiColor, string> = {
    blue:   "shadow-blue-500/20",
    red:    "shadow-red-500/20",
    amber:  "shadow-amber-500/20",
    green:  "shadow-green-500/20",
    purple: "shadow-purple-500/20",
    gray:   "shadow-slate-500/20",
  }
  const valueColorMap: Record<KpiColor, string> = {
    blue:   "text-blue-400",
    red:    "text-red-400",
    amber:  "text-amber-400",
    green:  "text-green-400",
    purple: "text-purple-400",
    gray:   "text-slate-400",
  }

  const sparkVariant = sparklineOverride ?? DEFAULT_SPARKLINE_VARIANT[color] ?? "steady"
  const sparkPath  = SPARKLINE_PATHS[sparkVariant]
  const sparkColor = SPARKLINE_COLORS[color] ?? "#94a3b8"

  return (
    <div
      className={`relative overflow-hidden rounded-xl border-t-2 border border-border bg-card p-4 shadow-lg ${topBorderMap[color]} ${shadowMap[color]}`}
      data-animate-section
    >
      <CountUpNumber
        value={value}
        className={`text-xl font-bold tabular-nums ${valueColorMap[color]}`}
      />
      <p className="mt-0.5 text-xs font-medium text-foreground">{label}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
      {/* Decorative sparkline */}
      <svg
        width="80"
        height="20"
        viewBox="0 0 80 20"
        className="absolute bottom-3 right-3 opacity-60"
        aria-hidden="true"
      >
        <path
          d={sparkPath}
          fill="none"
          stroke={sparkColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const map: Record<InvoiceStatus, string> = {
    paid:    "bg-emerald-100 text-emerald-700",
    overdue: "bg-red-100 text-red-700",
    pending: "bg-amber-100 text-amber-700",
    draft:   "bg-muted text-muted-foreground",
    sent:    "bg-blue-100 text-blue-700",
    void:    "bg-muted text-muted-foreground",
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${map[status]}`}>
      {status}
    </span>
  )
}

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="sticky top-16 z-10 bg-background/80 backdrop-blur-md py-3 -mx-6 px-6 border-b border-border/50">
      <div className="border-l-4 border-blue-500 pl-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  )
}

function InsightCard({
  borderColor,
  icon,
  title,
  body,
  fullWidth = false,
}: {
  borderColor: string
  icon: ReactNode
  title: string
  body: string
  fullWidth?: boolean
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-4 border-l-4 ${borderColor} ${fullWidth ? "lg:col-span-2" : ""} hover:bg-muted/60 hover:border-border hover:-translate-y-0.5 transition-all duration-200`}
      data-animate-section
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function FinancePage() {
  await connection()

  if (!isDatabaseConfigured()) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Finance data unavailable — Supabase is not configured.
        </p>
      </div>
    )
  }

  const [summary, transactions, invoices] = await Promise.all([
    getFinanceSummaryQuery(DEMO_ORG_ID),
    listTransactionsQuery(DEMO_ORG_ID, { limit: 50 }),
    listInvoicesQuery(DEMO_ORG_ID),
  ])

  // ── Derived transaction data ────────────────────────────────────────────────
  const expenseTransactions = transactions.filter((t) => t.direction === "out")
  const weeklyChartData     = buildWeeklyChartData(transactions)
  const expenseChartData    = buildExpenseChartData(expenseTransactions)
  const taxTransactions     = buildTaxTransactions(transactions)
  const taxWriteoffs        = taxTransactions.reduce((s, t) => s + t.amount, 0)

  // ── Invoice derived data ────────────────────────────────────────────────────
  type PageInvoice = {
    id: string
    number: string
    guest: string
    amount: number
    status: InvoiceStatus
    dueDate: string
    daysOverdue?: number
  }

  const pageInvoices: PageInvoice[] = invoices.map((inv) => ({
    id:          inv.id,
    number:      inv.invoiceNumber,
    guest:       inv.customerName,
    amount:      inv.totalAmount,
    status:      inv.status,
    dueDate:     formatDueDate(inv.dueAt),
    daysOverdue: inv.status === "overdue" ? computeDaysOverdue(inv.dueAt) : undefined,
  }))

  const paidInvoices    = pageInvoices.filter((i) => i.status === "paid")
  const overdueInvoices = pageInvoices.filter((i) => i.status === "overdue")
  const draftInvoices   = pageInvoices.filter((i) => i.status === "draft")

  const aging0to7   = overdueInvoices.filter((i) => (i.daysOverdue ?? 0) <= 7)
  const aging8to30  = overdueInvoices.filter(
    (i) => (i.daysOverdue ?? 0) > 7 && (i.daysOverdue ?? 0) <= 30
  )
  const agingOver30 = overdueInvoices.filter((i) => (i.daysOverdue ?? 0) > 30)

  const aging0to7Amt   = aging0to7.reduce((s, i) => s + i.amount, 0)
  const aging8to30Amt  = aging8to30.reduce((s, i) => s + i.amount, 0)
  const agingOver30Amt = agingOver30.reduce((s, i) => s + i.amount, 0)

  const maxDaysOverdue = overdueInvoices.reduce(
    (max, i) => Math.max(max, i.daysOverdue ?? 0),
    0
  )

  // ── Cash flow bar proportions ───────────────────────────────────────────────
  const cashTotal = summary.revenueThisWeek + summary.expensesThisWeek
  const revPct    = cashTotal > 0
    ? ((summary.revenueThisWeek / cashTotal) * 100).toFixed(0)
    : "0"
  const expPct    = cashTotal > 0
    ? ((summary.expensesThisWeek / cashTotal) * 100).toFixed(0)
    : "0"

  // ── Top line items — no query yet, static stub ──────────────────────────────
  const TOP_LINE_ITEMS = [
    { name: "Chef Tasting Menu x6", amount: 348 },
    { name: "Short Rib x2",         amount: 84 },
    { name: "Wagyu Ribeye",         amount: 68 },
    { name: "Wine Pairing x6",      amount: 60 },
    { name: "Cocktails x4",         amount: 56 },
  ]
  const TOP_LINE_MAX = Math.max(...TOP_LINE_ITEMS.map((i) => i.amount))

  return (
    <div
      className="space-y-5 p-6 min-h-screen bg-background"
      style={{
        backgroundImage: "radial-gradient(circle, hsl(var(--muted-foreground) / 0.08) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Finance</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Invoice agent · Orders · Cash flow · Tax write-offs
          </p>
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">{todayLabel()}</p>
      </div>

      {/* ── KPI cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Revenue this week"
          value={fmtRound(summary.revenueThisWeek)}
          sub={`${paidInvoices.length} paid invoices`}
          color="blue"
        />
        <KpiCard
          label="Overdue"
          value={fmt(summary.overdueReceivables)}
          sub={`${overdueInvoices.length} invoice${overdueInvoices.length !== 1 ? "s" : ""} · oldest ${maxDaysOverdue} days`}
          color="red"
          sparkline="spike"
        />
        <KpiCard
          label="Expenses this week"
          value={fmt(summary.expensesThisWeek)}
          sub={`${expenseTransactions.length} transactions`}
          color="amber"
        />
        <KpiCard
          label="Net cash flow"
          value={
            summary.netCashFlowEstimate < 0
              ? `−${fmt(Math.abs(summary.netCashFlowEstimate))}`
              : fmt(summary.netCashFlowEstimate)
          }
          sub="Revenue minus expenses"
          color={summary.netCashFlowEstimate < 0 ? "red" : "green"}
        />
        <KpiCard
          label="Tax write-offs tracked"
          value={fmt(taxWriteoffs)}
          sub="tax_relevant transactions"
          color="purple"
        />
      </div>

      {/* ── Weekly revenue chart ─────────────────────────────────────────────── */}
      <div
        className="bg-card border border-border rounded-xl"
        data-animate-section
      >
        <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Weekly revenue
          </p>
          <span className="text-xs text-muted-foreground">{fmtRound(summary.revenueThisWeek)} this week</span>
        </div>
        <div className="px-2 pb-4">
          <FinanceWeeklyRevenueChart data={weeklyChartData} />
        </div>
      </div>

      {/* ── AI finance tips ──────────────────────────────────────────────────── */}
      <SectionHeader
        title="Finance insights"
        sub="Powered by Resq AI"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <InsightCard
          borderColor="border-l-amber-400"
          icon={<TrendingUp className="h-4 w-4 text-amber-500" />}
          title="Wagyu Ribeye cost is rising"
          body="Your protein costs increased this week. Wagyu Ribeye is both your highest cost item and your highest ticket item — consider a $4-6 menu price adjustment to protect margin."
        />
        <InsightCard
          borderColor="border-l-red-400"
          icon={<AlertCircle className="h-4 w-4 text-red-500" />}
          title={`${overdueInvoices.length} invoice${overdueInvoices.length !== 1 ? "s" : ""} overdue — act today`}
          body={`You have ${fmt(summary.overdueReceivables)} in overdue invoices. Beyond 14 days, collection rates drop significantly. Send a personal follow-up, not just an automated reminder.`}
        />
        <InsightCard
          borderColor="border-l-blue-400"
          icon={<Lightbulb className="h-4 w-4 text-blue-500" />}
          title="Labor is 74% of weekly expenses"
          body="Industry benchmark for businesses is 28-35%. Your labor cost ratio suggests either a slow week for revenue or an opportunity to review scheduling."
        />
        <InsightCard
          borderColor="border-l-green-400"
          icon={<CheckCircle className="h-4 w-4 text-green-500" />}
          title="Tax documentation is strong this week"
          body={`${taxTransactions.length} expense transaction${taxTransactions.length !== 1 ? "s are" : " is"} flagged tax_relevant. You have ${fmt(taxWriteoffs)} in documented deductible expenses — well organized for filing.`}
        />
        <InsightCard
          borderColor="border-l-purple-400"
          icon={<Calendar className="h-4 w-4 text-purple-500" />}
          title="Cash flow forecast: watch next 7 days"
          body={`You have 5 confirmed bookings worth an estimated $400-600 in revenue. Combined with ${fmt(summary.overdueReceivables)} in overdue invoices if collected, next week could close positive. Key risk: if costs stay elevated and bookings stay below 10/day, the week runs negative.`}
          fullWidth
        />
      </div>

      {/* ── Invoice agent panel ──────────────────────────────────────────────── */}
      <SectionHeader
        title="From the invoice agent"
        sub="Live data from completed bookings"
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left — invoice status + table */}
        <div className="space-y-4">
          {/* Stat pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Total",   value: `${pageInvoices.length}`,                                          bg: "bg-muted text-muted-foreground" },
              { label: "Paid",    value: `${paidInvoices.length} (${fmtRound(summary.revenueThisWeek)})`,   bg: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300" },
              { label: "Overdue", value: `${overdueInvoices.length} (${fmt(summary.overdueReceivables)})`,   bg: "bg-red-500/20 text-red-600 dark:text-red-300" },
              { label: "Draft",   value: String(draftInvoices.length),                                        bg: "bg-muted text-muted-foreground" },
            ].map(({ label, value, bg }) => (
              <span key={label} className={`rounded-full px-3 py-1 text-xs font-medium ${bg}`}>
                {label}: {value}
              </span>
            ))}
          </div>

          {/* Invoice table */}
          <div
            className="bg-card rounded-xl border border-border overflow-hidden"
            data-animate-section
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">Invoice #</TableHead>
                    <TableHead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">Customer</TableHead>
                    <TableHead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider text-right">Amount</TableHead>
                    <TableHead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">Method</TableHead>
                    <TableHead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">Due</TableHead>
                    <TableHead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider text-right">Days OD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageInvoices.map((inv) => (
                    <TableRow
                      key={inv.id}
                      className={
                        inv.status === "overdue"
                          ? "bg-red-500/10 border-l-2 border-l-red-500 border-b border-border/30 transition-all duration-150 hover:bg-red-500/20"
                          : "text-foreground border-b border-border/30 transition-all duration-150 hover:bg-muted/30 hover:border-l-2 hover:border-l-blue-500"
                      }
                    >
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {inv.number}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{inv.guest}</TableCell>
                      <TableCell className={`text-right font-medium tabular-nums ${
                        inv.status === "paid"    ? "text-green-400" :
                        inv.status === "overdue" ? "text-red-400"   : "text-amber-400"
                      }`}>
                        {fmt(inv.amount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={inv.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell className="text-muted-foreground">{inv.dueDate}</TableCell>
                      <TableCell className="text-right">
                        {inv.daysOverdue !== undefined ? (
                          <span className="font-medium text-red-400">{inv.daysOverdue}d</span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Right — aging + top revenue */}
        <div className="space-y-4">
          {/* Aging buckets */}
          <div
            className="bg-card border border-border rounded-xl"
            data-animate-section
          >
            <div className="border-b border-border px-5 py-3.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Invoice aging
              </p>
            </div>
            <div className="space-y-3 p-4">
              <AgingBucket
                label="0–7 days overdue"
                count={aging0to7.length}
                amount={aging0to7Amt}
                color="text-amber-400"
                bg="bg-amber-500/10 border border-amber-500/30"
              />
              <AgingBucket
                label="8–30 days overdue"
                count={aging8to30.length}
                amount={aging8to30Amt}
                color="text-red-400"
                bg="bg-red-500/10 border border-red-500/30"
              />
              <AgingBucket
                label="30+ days overdue"
                count={agingOver30.length}
                amount={agingOver30Amt}
                color="text-slate-400"
                bg="bg-muted/30 border border-border/50"
              />
            </div>
          </div>

          {/* Top revenue by item */}
          <div
            className="bg-card border border-border rounded-xl"
            data-animate-section
          >
            <div className="border-b border-border px-5 py-3.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Top revenue by item
              </p>
            </div>
            <div className="space-y-2.5 p-5">
              {TOP_LINE_ITEMS.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between gap-4 text-xs">
                    <span className="text-foreground truncate">{item.name}</span>
                    <span className="shrink-0 font-medium tabular-nums text-muted-foreground">
                      {fmt(item.amount)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${(item.amount / TOP_LINE_MAX) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Cash flow panel ──────────────────────────────────────────────────── */}
      <SectionHeader
        title="Cash flow"
        sub="7-day forward projection"
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left — current position */}
        <div
          className="bg-card border border-border rounded-xl"
          data-animate-section
        >
          <div className="border-b border-border px-5 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Current position
            </p>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Money in this week</span>
              <span className="font-semibold text-emerald-400 tabular-nums">{fmt(summary.revenueThisWeek)}</span>
            </div>

            {/* Animated ratio bar */}
            <div className="space-y-1.5">
              <div className="h-2 rounded-full overflow-hidden bg-red-500/40">
                <div
                  className="h-full rounded-l-full bg-blue-500"
                  style={{ width: `${revPct}%` }}
                  data-animate-width={`${revPct}%`}
                />
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-blue-400">In {fmtRound(summary.revenueThisWeek)}</span>
                <span className="text-red-400">Out {fmtRound(summary.expensesThisWeek)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Money out this week</span>
              <span className="font-semibold text-red-400 tabular-nums">{fmt(summary.expensesThisWeek)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-semibold text-foreground">Net</span>
              {summary.netCashFlowEstimate < 0 ? (
                <span className="text-xl font-bold text-red-400 tabular-nums">
                  −{fmt(Math.abs(summary.netCashFlowEstimate))}
                </span>
              ) : (
                <span className="text-xl font-bold text-emerald-400 tabular-nums">
                  {fmt(summary.netCashFlowEstimate)}
                </span>
              )}
            </div>

            {/* In vs out legend */}
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Revenue {revPct}%
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-400" /> Expenses {expPct}%
              </span>
            </div>
          </div>
        </div>

        {/* Right — 7-day forecast */}
        <div
          className="bg-card border border-border rounded-xl"
          data-animate-section
        >
          <div className="border-b border-border px-5 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
              Expected this week
            </p>
          </div>
          <div className="p-5 space-y-3">
            {[
              { label: "Confirmed bookings (5): est.", value: "$400–600" },
              { label: "Pending receivables",              value: fmt(summary.pendingReceivables) },
              { label: "Overdue to collect",               value: fmt(summary.overdueReceivables) },
              { label: "Scheduled expenses (est.)",        value: "~$3,200" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-foreground tabular-nums">{value}</span>
              </div>
            ))}

            {/* AI cash flow tip */}
            <div className="mt-2 flex items-start gap-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-3">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
              <p className="text-xs leading-relaxed text-blue-400 dark:text-blue-300">
                Your overdue invoices total {fmt(summary.overdueReceivables)}. Sending reminders
                today could recover this before end of week. Prioritize your oldest overdue invoice.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Expense breakdown ────────────────────────────────────────────────── */}
      <SectionHeader
        title="Expenses this week"
        sub="All transactions from finance_transactions"
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left — expense categories table */}
        <div
          className="bg-card rounded-xl border border-border overflow-hidden"
          data-animate-section
        >
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">Category</TableHead>
                <TableHead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider text-right">Amount</TableHead>
                <TableHead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider text-right">% of total</TableHead>
                <TableHead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">Tax relevant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenseChartData.map((row) => (
                <TableRow
                  key={row.name}
                  className="text-foreground border-b border-border/30 transition-all duration-150 hover:bg-muted/30 hover:border-l-2 hover:border-l-blue-500"
                >
                  <TableCell className="font-medium text-foreground capitalize">{row.name}</TableCell>
                  <TableCell className="text-right tabular-nums text-red-400">{fmt(row.value)}</TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {summary.expensesThisWeek > 0
                      ? ((row.value / summary.expensesThisWeek) * 100).toFixed(1)
                      : "0.0"}%
                  </TableCell>
                  <TableCell>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                      yes
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot>
              <tr className="border-t border-border">
                <td className="p-2 font-bold text-sm text-foreground">Total</td>
                <td className="p-2 text-right font-bold text-sm text-red-400 tabular-nums">
                  {fmt(summary.expensesThisWeek)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </Table>
        </div>

        {/* Right — donut chart */}
        <div
          className="bg-card border border-border rounded-xl"
          data-animate-section
        >
          <div className="border-b border-border px-5 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Expense breakdown
            </p>
          </div>
          <div className="p-5">
            <FinanceExpenseChart data={expenseChartData} />
          </div>
        </div>
      </div>

      {/* ── Tax write-off tracker ────────────────────────────────────────────── */}
      <SectionHeader
        title="Tax write-off tracker"
        sub="Transactions flagged tax_relevant=true · For your accountant"
      />

      <div
        className="bg-card border border-border rounded-xl"
        data-animate-section
      >
        <div className="p-5 space-y-4">
          {/* Blue info banner */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3">
            <p className="text-xs text-blue-400 dark:text-blue-300 leading-relaxed">
              <span className="font-semibold text-blue-500 dark:text-blue-200">{fmt(taxWriteoffs)}</span> in potentially deductible
              expenses tracked this week. Export this list for your accountant at tax time.
            </p>
            <button className="shrink-0 flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-500 dark:text-blue-300 hover:bg-blue-500/20 transition-colors">
              <Download className="h-3 w-3" />
              Export
            </button>
          </div>

          {/* Filter pills + table (client component) */}
          <TaxFilterPills transactions={taxTransactions} />
        </div>
      </div>

      <FinanceAnimations />
    </div>
  )
}

// ── AgingBucket helper ────────────────────────────────────────────────────────

function AgingBucket({
  label,
  count,
  amount,
  color,
  bg,
}: {
  label: string
  count: number
  amount: number
  color: string
  bg: string
}) {
  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${bg}`}>
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{count} invoice{count !== 1 ? "s" : ""}</p>
      </div>
      <p className={`font-semibold text-sm tabular-nums ${color}`}>{fmt(amount)}</p>
    </div>
  )
}
