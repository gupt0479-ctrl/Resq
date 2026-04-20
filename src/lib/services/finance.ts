import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { eq, and, count, gte, lte, desc, inArray } from "drizzle-orm"
import type { FinanceSummaryResponse } from "@/lib/schemas/finance"

// ─── Create revenue transaction (idempotent) ─────────────────────────────

export interface CreateRevenueTransactionInput {
  organizationId: string
  invoiceId:      string
  amount:         number
  paymentMethod?: string
  notes?:         string
}

export async function createRevenueTransaction(
  input: CreateRevenueTransactionInput
): Promise<void> {
  const [countResult] = await db
    .select({ count: count() })
    .from(schema.financeTransactions)
    .where(
      and(
        eq(schema.financeTransactions.organizationId, input.organizationId),
        eq(schema.financeTransactions.invoiceId, input.invoiceId),
        eq(schema.financeTransactions.type, "revenue"),
        eq(schema.financeTransactions.direction, "in"),
      ),
    )

  if (countResult && Number(countResult.count) > 0) return

  try {
    await db.insert(schema.financeTransactions).values({
      organizationId: input.organizationId,
      invoiceId:      input.invoiceId,
      type:           "revenue",
      category:       "invoice_collection",
      amount:         String(input.amount),
      direction:      "in",
      occurredAt:     new Date(),
      paymentMethod:  input.paymentMethod ?? "card",
      taxRelevant:    true,
      notes:          input.notes ?? null,
    })
  } catch (err) {
    if ((err as { code?: string }).code === "23505") return
    throw new Error(`Failed to create revenue transaction: ${(err as Error).message}`)
  }
}

// ─── Create arbitrary transaction ────────────────────────────────────────

export interface CreateTransactionInput {
  organizationId:  string
  type:            string
  category:        string
  amount:          number
  direction:       "in" | "out"
  occurredAt?:     string
  paymentMethod?:  string
  taxRelevant?:    boolean
  writeoffEligible?: boolean
  notes?:          string
  invoiceId?:      string
  externalRef?:    string
}

export async function createTransaction(
  input: CreateTransactionInput
): Promise<string> {
  const [row] = await db
    .insert(schema.financeTransactions)
    .values({
      organizationId:   input.organizationId,
      invoiceId:        input.invoiceId ?? null,
      type:             input.type,
      category:         input.category,
      amount:           String(input.amount),
      direction:        input.direction,
      occurredAt:       input.occurredAt ? new Date(input.occurredAt) : new Date(),
      paymentMethod:    input.paymentMethod ?? null,
      taxRelevant:      input.taxRelevant ?? false,
      writeoffEligible: input.writeoffEligible ?? false,
      notes:            input.notes ?? null,
      externalRef:      input.externalRef ?? null,
    })
    .returning({ id: schema.financeTransactions.id })

  if (!row) {
    throw new Error("Failed to create transaction")
  }
  return row.id
}

// ─── List transactions ───────────────────────────────────────────────────

export async function listTransactions(
  organizationId: string,
  opts: {
    type?:        string
    taxRelevant?: boolean
    limit?:       number
    offset?:      number
    since?:       string
  } = {}
) {
  // Try the finance_transactions ledger first
  const conditions = [eq(schema.financeTransactions.organizationId, organizationId)]

  if (opts.type) conditions.push(eq(schema.financeTransactions.type, opts.type))
  if (opts.taxRelevant !== undefined) conditions.push(eq(schema.financeTransactions.taxRelevant, opts.taxRelevant))
  if (opts.since) conditions.push(gte(schema.financeTransactions.occurredAt, new Date(opts.since)))

  const data = await db
    .select()
    .from(schema.financeTransactions)
    .where(and(...conditions))
    .orderBy(desc(schema.financeTransactions.occurredAt))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0)

  return data
}

// ─── Finance summary ─────────────────────────────────────────────────────

export async function getFinanceSummary(
  organizationId?: string,
): Promise<FinanceSummaryResponse> {
  const now = new Date()
  const asOf = now.toISOString()

  // "Last 7 days" window
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10)
  const todayStr = now.toISOString().slice(0, 10)
  const sinceIso = sevenDaysAgo.toISOString()

  let revenueThisWeek = 0
  let revenueToday = 0
  let expensesThisWeek = 0

  if (organizationId) {
    const ledgerRows = await db
      .select({
        amount:     schema.financeTransactions.amount,
        direction:  schema.financeTransactions.direction,
        type:       schema.financeTransactions.type,
        occurredAt: schema.financeTransactions.occurredAt,
      })
      .from(schema.financeTransactions)
      .where(
        and(
          eq(schema.financeTransactions.organizationId, organizationId),
          gte(schema.financeTransactions.occurredAt, new Date(sinceIso)),
        ),
      )

    const todayPrefix = `${todayStr}T`
    for (const r of ledgerRows) {
      const amt = Number(r.amount) || 0
      if (r.direction === "in" && r.type === "revenue") {
        revenueThisWeek += amt
        const oc = r.occurredAt.toISOString()
        if (oc.startsWith(todayPrefix) || oc.slice(0, 10) === todayStr) {
          revenueToday += amt
        }
      }
      if (r.direction === "out") {
        expensesThisWeek += amt
      }
    }
    if (revenueThisWeek === 0) {
      const paidInvoices = await db
        .select({
          amountPaid: schema.invoices.amountPaid,
          paidAt: schema.invoices.paidAt,
        })
        .from(schema.invoices)
        .where(
          and(
            eq(schema.invoices.organizationId, organizationId),
            eq(schema.invoices.status, "paid"),
            gte(schema.invoices.paidAt, new Date(sinceIso)),
          ),
        )

      for (const invoice of paidInvoices) {
        const amount = Number(invoice.amountPaid) || 0
        revenueThisWeek += amount
        if (!invoice.paidAt) continue
        const paidAt = invoice.paidAt.toISOString()
        if (paidAt.startsWith(todayPrefix) || paidAt.slice(0, 10) === todayStr) {
          revenueToday += amount
        }
      }
    }
  }

  // ── Receivables from invoices (graceful fallback if table is empty/missing) ─
  let pendingReceivables = 0
  let pendingInvoiceCount = 0
  let overdueReceivables = 0
  let overdueInvoiceCount = 0
  let aging = {
    current:   { count: 0, amount: 0 },
    due1to30:  { count: 0, amount: 0 },
    due31to60: { count: 0, amount: 0 },
    over60:    { count: 0, amount: 0 },
  }

  try {
    const { notInArray } = await import("drizzle-orm")

    const pendingConditions = [
      inArray(schema.invoices.status, ["sent", "pending"]),
    ]
    if (organizationId) pendingConditions.push(eq(schema.invoices.organizationId, organizationId))

    const overdueConditions = [
      eq(schema.invoices.status, "overdue"),
    ]
    if (organizationId) overdueConditions.push(eq(schema.invoices.organizationId, organizationId))

    const openConditions = [
      notInArray(schema.invoices.status, ["paid", "void"]),
    ]
    if (organizationId) openConditions.push(eq(schema.invoices.organizationId, organizationId))

    const [pendingRes, overdueRes, openRes] = await Promise.all([
      db
        .select({ totalAmount: schema.invoices.totalAmount, amountPaid: schema.invoices.amountPaid })
        .from(schema.invoices)
        .where(and(...pendingConditions)),
      db
        .select({ totalAmount: schema.invoices.totalAmount, amountPaid: schema.invoices.amountPaid })
        .from(schema.invoices)
        .where(and(...overdueConditions)),
      db
        .select({ totalAmount: schema.invoices.totalAmount, amountPaid: schema.invoices.amountPaid, dueAt: schema.invoices.dueAt })
        .from(schema.invoices)
        .where(and(...openConditions)),
    ])

    pendingReceivables  = sumRemaining(pendingRes.map((r) => ({ total_amount: Number(r.totalAmount), amount_paid: Number(r.amountPaid) })))
    pendingInvoiceCount = pendingRes.length

    overdueReceivables  = sumRemaining(overdueRes.map((r) => ({ total_amount: Number(r.totalAmount), amount_paid: Number(r.amountPaid) })))
    overdueInvoiceCount = overdueRes.length

    aging = computeAging(
      openRes.map((r) => ({
        total_amount: Number(r.totalAmount),
        amount_paid:  Number(r.amountPaid),
        due_at:       r.dueAt.toISOString(),
      })),
      now,
    )
  } catch {
    // invoices table not seeded — receivables stay at 0
  }

  return {
    asOf,
    revenueToday:        round2(revenueToday),
    revenueThisWeek:     round2(revenueThisWeek),
    pendingReceivables,
    overdueReceivables,
    expensesThisWeek:    round2(expensesThisWeek),
    netCashFlowEstimate: round2(revenueThisWeek - expensesThisWeek),
    overdueInvoiceCount,
    pendingInvoiceCount,
    aging,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function sumRemaining(
  rows: Array<{ total_amount: number; amount_paid: number }> | null
): number {
  return round2(
    (rows ?? []).reduce(
      (s, r) =>
        s + Math.max(0, (Number(r.total_amount) || 0) - (Number(r.amount_paid) || 0)),
      0
    )
  )
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function computeAging(
  rows: Array<{ total_amount: number; amount_paid: number; due_at: string }>,
  now: Date
) {
  const buckets = {
    current:   { count: 0, amount: 0 },
    due1to30:  { count: 0, amount: 0 },
    due31to60: { count: 0, amount: 0 },
    over60:    { count: 0, amount: 0 },
  }

  for (const row of rows) {
    const remaining = Math.max(
      0,
      (Number(row.total_amount) || 0) - (Number(row.amount_paid) || 0)
    )
    const daysOverdue = Math.floor(
      (now.getTime() - new Date(row.due_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysOverdue <= 0) {
      buckets.current.count  += 1; buckets.current.amount  += remaining
    } else if (daysOverdue <= 30) {
      buckets.due1to30.count  += 1; buckets.due1to30.amount  += remaining
    } else if (daysOverdue <= 60) {
      buckets.due31to60.count += 1; buckets.due31to60.amount += remaining
    } else {
      buckets.over60.count    += 1; buckets.over60.amount    += remaining
    }
  }

  return {
    current:   { count: buckets.current.count,   amount: round2(buckets.current.amount) },
    due1to30:  { count: buckets.due1to30.count,  amount: round2(buckets.due1to30.amount) },
    due31to60: { count: buckets.due31to60.count, amount: round2(buckets.due31to60.amount) },
    over60:    { count: buckets.over60.count,    amount: round2(buckets.over60.amount) },
  }
}
