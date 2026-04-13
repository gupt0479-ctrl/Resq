import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { WeeklyRevenueChart } from "@/components/finance/WeeklyRevenueChart"
import type { WeeklyDataPoint } from "@/components/finance/WeeklyRevenueChart"
import { ExpenseChart } from "@/components/finance/ExpenseChart"
import type { ExpenseSlice } from "@/components/finance/ExpenseChart"
import { TaxFilterPills } from "@/components/finance/TaxFilterPills"
import type { TaxTransaction } from "@/components/finance/TaxFilterPills"

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

// ── Mock data — Invoice agent ─────────────────────────────────────────────────
// TODO: replace with Supabase query

type MockInvoiceStatus = "paid" | "overdue" | "pending" | "draft"

type MockInvoice = {
  id: string
  number: string
  guest: string
  amount: number
  status: MockInvoiceStatus
  date: string
  dueDate: string
  paymentMethod: string
  daysOverdue?: number
}

const MOCK_INVOICES: MockInvoice[] = [
  {
    id: "inv-1",
    number: "INV-2025-001",
    guest: "Marcus Webb",
    amount: 181.22,
    status: "paid",
    date: "Apr 9",
    dueDate: "Apr 16",
    paymentMethod: "card",
  },
  {
    id: "inv-2",
    number: "INV-2025-002",
    guest: "Priya Nair",
    amount: 94.95,
    status: "overdue",
    date: "Apr 10",
    dueDate: "Apr 10",
    paymentMethod: "—",
    daysOverdue: 2,
  },
  {
    id: "inv-3",
    number: "INV-2025-003",
    guest: "Daniel Kim",
    amount: 522.39,
    status: "paid",
    date: "Apr 10",
    dueDate: "Apr 17",
    paymentMethod: "card",
  },
  {
    id: "inv-4",
    number: "INV-2025-004",
    guest: "Rachel Tran",
    amount: 118.58,
    status: "paid",
    date: "Apr 5",
    dueDate: "Apr 12",
    paymentMethod: "card",
  },
  {
    id: "inv-5",
    number: "INV-2025-005",
    guest: "Tom Okafor",
    amount: 218.81,
    status: "overdue",
    date: "Apr 9",
    dueDate: "Apr 9",
    paymentMethod: "—",
    daysOverdue: 3,
  },
  {
    id: "inv-6",
    number: "INV-2025-006",
    guest: "Unknown",
    amount: 68.26,
    status: "overdue",
    date: "Apr 2",
    dueDate: "Apr 2",
    paymentMethod: "—",
    daysOverdue: 11,
  },
]

// ── Mock data — Finance transactions ─────────────────────────────────────────
// TODO: replace with Supabase query

const MOCK_TRANSACTIONS = {
  revenueIn: [
    { date: "Apr 9",  amount: 181.22, category: "dining",   method: "card" },
    { date: "Apr 10", amount: 522.39, category: "dining",   method: "card" },
    { date: "Apr 5",  amount: 118.58, category: "dining",   method: "card" },
  ],
  expensesOut: [
    { date: "Apr 11", amount: 62.00,   category: "produce",   type: "expense",            description: "Local Farm Direct" },
    { date: "Apr 10", amount: 284.00,  category: "protein",   type: "expense",            description: "Premium Meats Co." },
    { date: "Apr 8",  amount: 192.00,  category: "beverage",  type: "expense",            description: "Vine Street Imports" },
    { date: "Apr 7",  amount: 310.00,  category: "utilities", type: "expense",            description: "Xcel Energy" },
    { date: "Apr 9",  amount: 2800.00, category: "labor",     type: "expense",            description: "Weekly payroll" },
    { date: "Apr 9",  amount: 18.50,   category: "platform",  type: "fee",                description: "OpenTable booking fee" },
    { date: "Apr 11", amount: 54.00,   category: "dairy",     type: "inventory_purchase", description: "Artisan Dairy MN" },
    { date: "Apr 11", amount: 28.00,   category: "waste",     type: "writeoff",           description: "Expired produce" },
  ],
}

// ── Mock data — Weekly revenue chart ─────────────────────────────────────────
// TODO: replace with Supabase query

const WEEKLY_CHART_DATA: WeeklyDataPoint[] = [
  { day: "Mon", revenue: 0 },
  { day: "Tue", revenue: 0 },
  { day: "Wed", revenue: 118.58 },
  { day: "Thu", revenue: 0 },
  { day: "Fri", revenue: 181.22 },
  { day: "Sat", revenue: 522.39 },
  { day: "Sun", revenue: 0 },
]

// ── Mock data — Expense chart slices ─────────────────────────────────────────
// TODO: replace with Supabase query

const EXPENSE_CHART_DATA: ExpenseSlice[] = [
  { name: "labor",    value: 2800.00, color: "#4b5563" },
  { name: "protein",  value: 284.00,  color: "#f87171" },
  { name: "utilities",value: 310.00,  color: "#fbbf24" },
  { name: "beverage", value: 192.00,  color: "#60a5fa" },
  { name: "produce",  value: 62.00,   color: "#4ade80" },
  { name: "dairy",    value: 54.00,   color: "#2dd4bf" },
  { name: "platform", value: 18.50,   color: "#c084fc" },
  { name: "waste",    value: 28.00,   color: "#fb923c" },
]

// ── Mock data — Tax write-off transactions ───────────────────────────────────
// TODO: replace with Supabase query

const TAX_TRANSACTIONS: TaxTransaction[] = [
  { date: "Apr 9",  description: "Weekly payroll",       category: "labor",    amount: 2800.00, type: "expense",            writeoffEligible: "yes" },
  { date: "Apr 10", description: "Premium Meats Co.",    category: "protein",  amount: 284.00,  type: "expense",            writeoffEligible: "yes" },
  { date: "Apr 7",  description: "Xcel Energy",          category: "utilities",amount: 310.00,  type: "expense",            writeoffEligible: "yes" },
  { date: "Apr 8",  description: "Vine Street Imports",  category: "beverage", amount: 192.00,  type: "expense",            writeoffEligible: "yes" },
  { date: "Apr 11", description: "Local Farm Direct",    category: "produce",  amount: 62.00,   type: "expense",            writeoffEligible: "yes" },
  { date: "Apr 11", description: "Artisan Dairy MN",     category: "dairy",    amount: 54.00,   type: "inventory_purchase", writeoffEligible: "yes" },
  { date: "Apr 9",  description: "OpenTable booking fee",category: "platform", amount: 18.50,   type: "fee",                writeoffEligible: "yes" },
  { date: "Apr 11", description: "Expired produce",      category: "waste",    amount: 28.00,   type: "writeoff",           writeoffEligible: "yes" },
]

// ── Derived KPIs ──────────────────────────────────────────────────────────────
// TODO: replace with Supabase query

const REVENUE_WEEK   = 822.00
const PENDING_AMT    = 0.00
const OVERDUE_AMT    = 382.02   // 94.95 + 218.81 + 68.26
const EXPENSES_WEEK  = 3748.50
const NET_CASH_FLOW  = -2926.50 // REVENUE_WEEK - EXPENSES_WEEK
const TAX_WRITEOFFS  = 3466.50

// ── Top line items by revenue ─────────────────────────────────────────────────
// TODO: replace with Supabase query from invoice line items

const TOP_LINE_ITEMS = [
  { name: "Chef Tasting Menu x6", amount: 348 },
  { name: "Short Rib x2",         amount: 84 },
  { name: "Wagyu Ribeye",         amount: 68 },
  { name: "Wine Pairing x6",      amount: 60 },
  { name: "Cocktails x4",         amount: 56 },
]
const TOP_LINE_MAX = Math.max(...TOP_LINE_ITEMS.map((i) => i.amount))

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub: string
  color: "green" | "gray" | "red" | "amber" | "blue"
}) {
  const colorMap: Record<typeof color, string> = {
    green: "text-emerald-600",
    gray:  "text-muted-foreground",
    red:   "text-red-600",
    amber: "text-amber-600",
    blue:  "text-blue-600",
  }
  const bgMap: Record<typeof color, string> = {
    green: "border-emerald-100",
    gray:  "border-border",
    red:   "border-red-100 bg-red-50/30",
    amber: "border-amber-100",
    blue:  "border-blue-100",
  }
  return (
    <div className={`rounded-xl border p-4 ${bgMap[color]}`}>
      <p className={`text-xl font-bold tabular-nums ${colorMap[color]}`}>{value}</p>
      <p className="mt-0.5 text-xs font-medium text-foreground">{label}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: MockInvoiceStatus }) {
  const map: Record<MockInvoiceStatus, string> = {
    paid:    "bg-emerald-100 text-emerald-700",
    overdue: "bg-red-100 text-red-700",
    pending: "bg-amber-100 text-amber-700",
    draft:   "bg-muted text-muted-foreground",
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${map[status]}`}>
      {status}
    </span>
  )
}

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
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
    <div className={`rounded-xl border border-border bg-card p-4 border-l-4 ${borderColor} ${fullWidth ? "lg:col-span-2" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const paidInvoices    = MOCK_INVOICES.filter((i) => i.status === "paid")
  const overdueInvoices = MOCK_INVOICES.filter((i) => i.status === "overdue")
  const draftInvoices   = MOCK_INVOICES.filter((i) => i.status === "draft")

  // Invoice aging buckets
  const aging0to7   = overdueInvoices.filter((i) => (i.daysOverdue ?? 0) <= 7)
  const aging8to30  = overdueInvoices.filter((i) => (i.daysOverdue ?? 0) > 7 && (i.daysOverdue ?? 0) <= 30)
  const agingOver30 = overdueInvoices.filter((i) => (i.daysOverdue ?? 0) > 30)

  const aging0to7Amt   = aging0to7.reduce((s, i) => s + i.amount, 0)
  const aging8to30Amt  = aging8to30.reduce((s, i) => s + i.amount, 0)
  const agingOver30Amt = agingOver30.reduce((s, i) => s + i.amount, 0)

  // Cash flow bar proportions
  const cashTotal = REVENUE_WEEK + EXPENSES_WEEK
  const revPct    = ((REVENUE_WEEK / cashTotal) * 100).toFixed(0)
  const expPct    = ((EXPENSES_WEEK / cashTotal) * 100).toFixed(0)

  return (
    <div className="space-y-5 p-6">
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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Revenue this week"
          value={fmtRound(REVENUE_WEEK)}
          sub={`${paidInvoices.length} paid invoices`}
          color="green"
        />
        <KpiCard
          label="Pending receivables"
          value={fmt(PENDING_AMT)}
          sub="0 invoices pending"
          color="gray"
        />
        <KpiCard
          label="Overdue"
          value={fmt(OVERDUE_AMT)}
          sub={`${overdueInvoices.length} invoices · oldest 11 days`}
          color="red"
        />
        <KpiCard
          label="Expenses this week"
          value={fmt(EXPENSES_WEEK)}
          sub={`${MOCK_TRANSACTIONS.expensesOut.length} transactions`}
          color="amber"
        />
        <KpiCard
          label="Net cash flow"
          value={`−${fmt(Math.abs(NET_CASH_FLOW))}`}
          sub="Revenue minus expenses"
          color="red"
        />
        <KpiCard
          label="Tax write-offs tracked"
          value={fmt(TAX_WRITEOFFS)}
          sub="tax_relevant transactions"
          color="blue"
        />
      </div>

      {/* ── Weekly revenue chart ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Weekly revenue
            </CardTitle>
            <span className="text-xs text-muted-foreground">{fmtRound(REVENUE_WEEK)} this week</span>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <WeeklyRevenueChart data={WEEKLY_CHART_DATA} />
        </CardContent>
      </Card>

      {/* ── Invoice agent panel ──────────────────────────────────────────────── */}
      <SectionHeader
        title="From the invoice agent"
        sub="Live data from completed reservations"
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left — invoice status + table */}
        <div className="space-y-4">
          {/* Stat pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Total",   value: `${MOCK_INVOICES.length}`,                           bg: "bg-muted text-muted-foreground" },
              { label: "Paid",    value: `${paidInvoices.length} (${fmtRound(REVENUE_WEEK)})`, bg: "bg-emerald-100 text-emerald-700" },
              { label: "Overdue", value: `${overdueInvoices.length} (${fmt(OVERDUE_AMT)})`,    bg: "bg-red-100 text-red-700" },
              { label: "Draft",   value: String(draftInvoices.length),                          bg: "bg-muted text-muted-foreground" },
            ].map(({ label, value, bg }) => (
              <span key={label} className={`rounded-full px-3 py-1 text-xs font-medium ${bg}`}>
                {label}: {value}
              </span>
            ))}
          </div>

          {/* Invoice table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Guest</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead className="text-right">Days OD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_INVOICES.map((inv) => (
                      <TableRow
                        key={inv.id}
                        className={inv.status === "overdue" ? "bg-red-50 hover:bg-red-100/70" : undefined}
                      >
                        <TableCell className="font-mono text-[11px] text-muted-foreground">
                          {inv.number}
                        </TableCell>
                        <TableCell className="font-medium">{inv.guest}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {fmt(inv.amount)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={inv.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{inv.paymentMethod}</TableCell>
                        <TableCell className="text-muted-foreground">{inv.dueDate}</TableCell>
                        <TableCell className="text-right">
                          {inv.daysOverdue !== undefined ? (
                            <span className="font-medium text-red-600">{inv.daysOverdue}d</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right — aging + top revenue */}
        <div className="space-y-4">
          {/* Aging buckets */}
          <Card>
            <CardHeader className="border-b border-border pb-3 pt-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Invoice aging
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <AgingBucket
                label="0–7 days overdue"
                count={aging0to7.length}
                amount={aging0to7Amt}
                color="text-amber-600"
                bg="bg-amber-50 border-amber-200"
              />
              <AgingBucket
                label="8–30 days overdue"
                count={aging8to30.length}
                amount={aging8to30Amt}
                color="text-red-600"
                bg="bg-red-50 border-red-200"
              />
              <AgingBucket
                label="30+ days overdue"
                count={agingOver30.length}
                amount={agingOver30Amt}
                color="text-muted-foreground"
                bg="bg-muted/40 border-border"
              />
            </CardContent>
          </Card>

          {/* Top revenue by item */}
          <Card>
            <CardHeader className="border-b border-border pb-3 pt-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Top revenue by item
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-4 pb-4">
              {TOP_LINE_ITEMS.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between gap-4 text-xs">
                    <span className="text-foreground truncate">{item.name}</span>
                    <span className="shrink-0 font-medium tabular-nums text-foreground">
                      {fmt(item.amount)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${(item.amount / TOP_LINE_MAX) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Cash flow panel ──────────────────────────────────────────────────── */}
      <SectionHeader
        title="Cash flow"
        sub="7-day forward projection"
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left — current position */}
        <Card>
          <CardHeader className="border-b border-border pb-3 pt-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Current position
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 pb-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Money in this week</span>
              <span className="font-semibold text-emerald-600 tabular-nums">{fmt(REVENUE_WEEK)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Money out this week</span>
              <span className="font-semibold text-red-600 tabular-nums">{fmt(EXPENSES_WEEK)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-semibold text-foreground">Net</span>
              <span className="text-xl font-bold text-red-600 tabular-nums">
                −{fmt(Math.abs(NET_CASH_FLOW))}
              </span>
            </div>

            {/* In vs out bar */}
            <div className="space-y-1.5">
              <div className="flex h-3 overflow-hidden rounded-full gap-0.5">
                <div
                  className="h-full rounded-l-full bg-blue-500"
                  style={{ width: `${revPct}%` }}
                />
                <div
                  className="h-full flex-1 rounded-r-full bg-red-400"
                  style={{ width: `${expPct}%` }}
                />
              </div>
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-500" /> Revenue {revPct}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-400" /> Expenses {expPct}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right — 7-day forecast */}
        <Card className="border-blue-100">
          <CardHeader className="border-b border-border pb-3 pt-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              Expected this week
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 pb-5 space-y-3">
            {[
              { label: "Confirmed reservations (5): est.", value: "$400–600" },
              { label: "Pending receivables",              value: fmt(PENDING_AMT) },
              { label: "Overdue to collect",               value: fmt(OVERDUE_AMT) },
              { label: "Scheduled expenses (est.)",        value: "~$3,200" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-foreground tabular-nums">{value}</span>
              </div>
            ))}

            {/* AI cash flow tip */}
            <div className="mt-2 flex items-start gap-2.5 rounded-lg bg-blue-50 border border-blue-100 px-3 py-3">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
              <p className="text-xs leading-relaxed text-blue-800">
                Your overdue invoices total $382. Sending reminders today could recover this before
                end of week. INV-2025-006 is 11 days overdue — prioritize that one.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Expense breakdown ────────────────────────────────────────────────── */}
      <SectionHeader
        title="Expenses this week"
        sub="All transactions from finance_transactions"
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left — expense categories table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">% of total</TableHead>
                  <TableHead>Tax relevant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {EXPENSE_CHART_DATA.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium capitalize">{row.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(row.value)}</TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {((row.value / EXPENSES_WEEK) * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        yes
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <tfoot>
                <tr className="border-t border-border">
                  <td className="p-2 font-bold text-sm text-foreground">Total</td>
                  <td className="p-2 text-right font-bold text-sm text-foreground tabular-nums">
                    {fmt(EXPENSES_WEEK)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </Table>
          </CardContent>
        </Card>

        {/* Right — donut chart */}
        <Card>
          <CardHeader className="border-b border-border pb-3 pt-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Expense breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 pb-5">
            <ExpenseChart data={EXPENSE_CHART_DATA} />
          </CardContent>
        </Card>
      </div>

      {/* ── Tax write-off tracker ────────────────────────────────────────────── */}
      <SectionHeader
        title="Tax write-off tracker"
        sub="Transactions flagged tax_relevant=true · For your accountant"
      />

      <Card>
        <CardContent className="pt-4 pb-5 space-y-4">
          {/* Blue info banner */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-xs text-blue-800 leading-relaxed">
              <span className="font-semibold">{fmt(TAX_WRITEOFFS)}</span> in potentially deductible
              expenses tracked this week. Export this list for your accountant at tax time.
            </p>
            <button className="shrink-0 flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 transition-colors">
              <Download className="h-3 w-3" />
              Export
            </button>
          </div>

          {/* Filter pills + table (client component) */}
          <TaxFilterPills transactions={TAX_TRANSACTIONS} />
        </CardContent>
      </Card>

      {/* ── AI finance tips ──────────────────────────────────────────────────── */}
      <SectionHeader
        title="Finance insights"
        sub="Powered by OpsPilot AI"
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
          title="3 invoices overdue — act today"
          body="INV-2025-006 is 11 days overdue ($68.26). Beyond 14 days, collection rates drop significantly. Send a personal follow-up, not just an automated reminder."
        />
        <InsightCard
          borderColor="border-l-blue-400"
          icon={<Lightbulb className="h-4 w-4 text-blue-500" />}
          title="Labor is 74% of weekly expenses"
          body="Industry benchmark for restaurants is 28-35%. Your labor cost ratio suggests either a slow week for revenue or an opportunity to review scheduling."
        />
        <InsightCard
          borderColor="border-l-green-400"
          icon={<CheckCircle className="h-4 w-4 text-green-500" />}
          title="Tax documentation is strong this week"
          body="All 8 expense transactions are flagged tax_relevant. You have $3,466.50 in documented deductible expenses — well organized for filing."
        />
        <InsightCard
          borderColor="border-l-purple-400"
          icon={<Calendar className="h-4 w-4 text-purple-500" />}
          title="Cash flow forecast: watch next 7 days"
          body="You have 5 confirmed reservations worth an estimated $400-600 in revenue. Combined with $382 in overdue invoices if collected, next week could close positive. Key risk: if protein costs stay elevated and covers stay below 10/day, the week runs negative."
          fullWidth
        />
      </div>
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
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${bg}`}>
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{count} invoice{count !== 1 ? "s" : ""}</p>
      </div>
      <p className={`font-semibold text-sm tabular-nums ${color}`}>{fmt(amount)}</p>
    </div>
  )
}
