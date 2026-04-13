import type { SupabaseClient } from "@supabase/supabase-js"
import type { FinanceSummaryResponse } from "@/lib/schemas/finance"

// ─── Create revenue transaction (idempotent) ─────────────────────────────

export interface CreateRevenueTransactionInput {
  organizationId: string
  invoiceId:      string
  amount:         number
  paymentMethod?: string
  notes?:         string
}

/**
 * Creates a revenue finance_transaction for a paid invoice.
 * Guards against duplicates with a check-before-insert pattern,
 * enforced at the DB level by a partial unique index on (invoice_id)
 * WHERE type='revenue' AND direction='in'.
 */
export async function createRevenueTransaction(
  client: SupabaseClient,
  input: CreateRevenueTransactionInput
): Promise<void> {
  // Idempotency check: at most one revenue transaction per invoice
  const { count } = await client
    .from("finance_transactions")
    .select("*", { count: "exact", head: true })
    .eq("invoice_id",      input.invoiceId)
    .eq("type",            "revenue")
    .eq("direction",       "in")
    .eq("organization_id", input.organizationId)

  if (count && count > 0) return // Already recorded — idempotent

  const { error } = await client.from("finance_transactions").insert({
    organization_id: input.organizationId,
    invoice_id:      input.invoiceId,
    type:            "revenue",
    category:        "dining_revenue",
    amount:          input.amount,
    direction:       "in",
    occurred_at:     new Date().toISOString(),
    payment_method:  input.paymentMethod ?? "card",
    tax_relevant:    true,
    notes:           input.notes ?? null,
  })

  if (error) {
    // Partial unique index violation (23505) = race-condition duplicate; treat as success
    if (error.code !== "23505") {
      throw new Error(`Failed to create revenue transaction: ${error.message}`)
    }
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
  client: SupabaseClient,
  input: CreateTransactionInput
): Promise<string> {
  const { data, error } = await client
    .from("finance_transactions")
    .insert({
      organization_id:   input.organizationId,
      invoice_id:        input.invoiceId ?? null,
      type:              input.type,
      category:          input.category,
      amount:            input.amount,
      direction:         input.direction,
      occurred_at:       input.occurredAt ?? new Date().toISOString(),
      payment_method:    input.paymentMethod ?? null,
      tax_relevant:      input.taxRelevant ?? false,
      writeoff_eligible: input.writeoffEligible ?? false,
      notes:             input.notes ?? null,
      external_ref:      input.externalRef ?? null,
    })
    .select("id")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create transaction")
  }
  return data.id
}

// ─── List transactions ────────────────────────────────────────────────────

export async function listTransactions(
  client: SupabaseClient,
  organizationId: string,
  opts: {
    type?:         string
    taxRelevant?:  boolean
    limit?:        number
    offset?:       number
    since?:        string
  } = {}
) {
  let query = client
    .from("finance_transactions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("occurred_at", { ascending: false })

  if (opts.type)        query = query.eq("type", opts.type)
  if (opts.taxRelevant !== undefined) query = query.eq("tax_relevant", opts.taxRelevant)
  if (opts.since)       query = query.gte("occurred_at", opts.since)
  if (opts.limit)       query = query.limit(opts.limit)
  if (opts.offset) {
    query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

// ─── Finance summary (all deterministic — never from AI) ─────────────────

export async function getFinanceSummary(
  client: SupabaseClient,
  organizationId: string
): Promise<FinanceSummaryResponse> {
  const now      = new Date()
  const todayISO = startOfDay(now).toISOString()
  const weekISO  = startOfWeek(now).toISOString()
  const asOf     = now.toISOString()

  // Revenue today
  const { data: revToday } = await client
    .from("finance_transactions")
    .select("amount")
    .eq("organization_id", organizationId)
    .eq("type", "revenue")
    .eq("direction", "in")
    .gte("occurred_at", todayISO)

  const revenueToday = sumAmounts(revToday)

  // Revenue this week
  const { data: revWeek } = await client
    .from("finance_transactions")
    .select("amount")
    .eq("organization_id", organizationId)
    .eq("type", "revenue")
    .eq("direction", "in")
    .gte("occurred_at", weekISO)

  const revenueThisWeek = sumAmounts(revWeek)

  // Expenses this week (type != revenue, direction = out)
  const { data: expWeek } = await client
    .from("finance_transactions")
    .select("amount")
    .eq("organization_id", organizationId)
    .eq("direction", "out")
    .gte("occurred_at", weekISO)

  const expensesThisWeek = sumAmounts(expWeek)

  // Pending receivables (invoices: status sent or pending)
  const { data: pendingInvs } = await client
    .from("invoices")
    .select("total_amount, amount_paid")
    .eq("organization_id", organizationId)
    .in("status", ["sent", "pending"])

  const pendingReceivables = sumRemaining(pendingInvs)
  const pendingInvoiceCount = pendingInvs?.length ?? 0

  // Overdue receivables
  const { data: overdueInvs } = await client
    .from("invoices")
    .select("total_amount, amount_paid, due_at, invoice_number, customers(full_name)")
    .eq("organization_id", organizationId)
    .eq("status", "overdue")

  const overdueReceivables  = sumRemaining(overdueInvs)
  const overdueInvoiceCount = overdueInvs?.length ?? 0

  const netCashFlowEstimate = round2(revenueThisWeek - expensesThisWeek)

  // Invoice aging buckets (from all open invoices)
  const { data: openInvs } = await client
    .from("invoices")
    .select("total_amount, amount_paid, due_at")
    .eq("organization_id", organizationId)
    .not("status", "in", '("paid","void")')

  const aging = computeAging(openInvs ?? [], now)

  return {
    asOf,
    revenueToday,
    revenueThisWeek,
    pendingReceivables,
    overdueReceivables,
    expensesThisWeek,
    netCashFlowEstimate,
    overdueInvoiceCount,
    pendingInvoiceCount,
    aging,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function sumAmounts(rows: Array<{ amount: number }> | null): number {
  return round2((rows ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0))
}

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

function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

function startOfWeek(d: Date): Date {
  const out = new Date(d)
  const day = out.getDay()
  out.setDate(out.getDate() - day)
  out.setHours(0, 0, 0, 0)
  return out
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
      buckets.current.count  += 1
      buckets.current.amount += remaining
    } else if (daysOverdue <= 30) {
      buckets.due1to30.count  += 1
      buckets.due1to30.amount += remaining
    } else if (daysOverdue <= 60) {
      buckets.due31to60.count  += 1
      buckets.due31to60.amount += remaining
    } else {
      buckets.over60.count  += 1
      buckets.over60.amount += remaining
    }
  }

  return {
    current:   { count: buckets.current.count,   amount: round2(buckets.current.amount) },
    due1to30:  { count: buckets.due1to30.count,  amount: round2(buckets.due1to30.amount) },
    due31to60: { count: buckets.due31to60.count, amount: round2(buckets.due31to60.amount) },
    over60:    { count: buckets.over60.count,    amount: round2(buckets.over60.amount) },
  }
}
