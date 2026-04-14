import type { SupabaseClient } from "@supabase/supabase-js"
import type { FinanceSummaryResponse } from "@/lib/schemas/finance"

// â”€â”€â”€ Create revenue transaction (idempotent) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface CreateRevenueTransactionInput {
  organizationId: string
  invoiceId:      string
  amount:         number
  paymentMethod?: string
  notes?:         string
}

export async function createRevenueTransaction(
  client: SupabaseClient,
  input: CreateRevenueTransactionInput
): Promise<void> {
  const { count } = await client
    .from("finance_transactions")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", input.organizationId)
    .eq("invoice_id",      input.invoiceId)
    .eq("type",            "revenue")
    .eq("direction",       "in")

  if (count && count > 0) return

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

  if (error && error.code !== "23505") {
    throw new Error(`Failed to create revenue transaction: ${error.message}`)
  }
}

// â”€â”€â”€ Create arbitrary transaction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ List transactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function listTransactions(
  client: SupabaseClient,
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
  if (!error && data && data.length > 0) return data

  // Ledger is empty â€” synthesize from shipments (expenses) + reservations (revenue)
  return buildSyntheticTransactions(client, opts.limit ?? 20)
}

async function buildSyntheticTransactions(client: SupabaseClient, limit: number) {
  const [shipmentsRes, reservationsRes, menuItemsRes] = await Promise.all([
    client
      .from("shipments")
      .select("id, vendor_name, total_cost, ordered_at, status")
      .neq("status", "cancelled")
      .order("ordered_at", { ascending: false })
      .limit(limit),
    client
      .from("reservations")
      .select("id, date, covers, menu_item_ids")
      .order("date", { ascending: false })
      .limit(limit),
    client.from("menu_items").select("id, price"),
  ])

  const priceMap = new Map(
    (menuItemsRes.data ?? []).map((m) => [m.id as string, Number(m.price)])
  )

  type SyntheticRow = {
    id: string
    organization_id: string
    invoice_id: null
    type: string
    category: string
    amount: number
    direction: "in" | "out"
    occurred_at: string
    payment_method: null
    tax_relevant: boolean
    writeoff_eligible: boolean
    notes: string | null
    external_ref: null
    created_at: string
  }

  const rows: SyntheticRow[] = []

  for (const s of shipmentsRes.data ?? []) {
    rows.push({
      id: s.id as string,
      organization_id: "",
      invoice_id: null,
      type: "inventory_purchase",
      category: "inventory_purchase",
      amount: Number(s.total_cost),
      direction: "out",
      occurred_at: s.ordered_at as string,
      payment_method: null,
      tax_relevant: true,
      writeoff_eligible: false,
      notes: `Shipment from ${s.vendor_name}`,
      external_ref: null,
      created_at: s.ordered_at as string,
    })
  }

  for (const r of reservationsRes.data ?? []) {
    const ids = (r.menu_item_ids as string[]) ?? []
    const total = Number(r.covers) * ids.reduce((s, id) => s + (priceMap.get(id) ?? 0), 0)
    if (total <= 0) continue
    rows.push({
      id: r.id as string,
      organization_id: "",
      invoice_id: null,
      type: "revenue",
      category: "dining_revenue",
      amount: round2(total),
      direction: "in",
      occurred_at: `${r.date}T19:00:00.000Z`,
      payment_method: null,
      tax_relevant: true,
      writeoff_eligible: false,
      notes: `Reservation · ${r.covers} covers`,
      external_ref: null,
      created_at: `${r.date}T19:00:00.000Z`,
    })
  }

  // Sort by date desc, cap at limit
  rows.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
  return rows.slice(0, limit)
}

// â”€â”€â”€ Finance summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getFinanceSummary(
  client: SupabaseClient,
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
  let usedLedgerForWeekly = false

  if (organizationId) {
    const { data: ledgerRows, error: ledgerErr } = await client
      .from("finance_transactions")
      .select("amount, direction, type, occurred_at")
      .eq("organization_id", organizationId)
      .gte("occurred_at", sinceIso)

    if (!ledgerErr && ledgerRows && ledgerRows.length > 0) {
      usedLedgerForWeekly = true
      const todayPrefix = `${todayStr}T`
      for (const r of ledgerRows) {
        const amt = Number(r.amount) || 0
        if (r.direction === "in" && r.type === "revenue") {
          revenueThisWeek += amt
          const oc = r.occurred_at as string
          if (oc.startsWith(todayPrefix) || oc.slice(0, 10) === todayStr) {
            revenueToday += amt
          }
        }
        if (r.direction === "out") {
          expensesThisWeek += amt
        }
      }
    }
  }

  if (!usedLedgerForWeekly) {
    // â”€â”€ Revenue from reservations Ã— menu prices (legacy / non-ledger demos) â”€
    const [reservationsRes, menuItemsRes] = await Promise.all([
      client
        .from("reservations")
        .select("id, date, covers, menu_item_ids")
        .gte("date", sevenDaysAgoStr)
        .lte("date", todayStr),
      client.from("menu_items").select("id, price"),
    ])

    const priceMap = new Map(
      (menuItemsRes.data ?? []).map((m) => [m.id as string, Number(m.price)])
    )

    for (const r of reservationsRes.data ?? []) {
      const ids = (r.menu_item_ids as string[]) ?? []
      const total = Number(r.covers) * ids.reduce((s, id) => s + (priceMap.get(id) ?? 0), 0)
      revenueThisWeek += total
      if (r.date === todayStr) revenueToday += total
    }

    // â”€â”€ Expenses from shipments (inventory purchases last 7 days) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const { data: shipments } = await client
      .from("shipments")
      .select("total_cost, ordered_at, status")
      .neq("status", "cancelled")
      .gte("ordered_at", sinceIso)

    expensesThisWeek = (shipments ?? []).reduce(
      (s, r) => s + Number(r.total_cost),
      0
    )
  }

  // â”€â”€ Receivables from invoices (graceful fallback if table is empty/missing) â”€
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
    const pendingQ = client
      .from("invoices")
      .select("total_amount, amount_paid")
      .in("status", ["sent", "pending"])
    const overdueQ = client.from("invoices").select("total_amount, amount_paid").eq("status", "overdue")
    const openQ = client
      .from("invoices")
      .select("total_amount, amount_paid, due_at")
      .not("status", "in", '("paid","void")')

    const [pendingRes, overdueRes, openRes] = await Promise.all([
      organizationId ? pendingQ.eq("organization_id", organizationId) : pendingQ,
      organizationId ? overdueQ.eq("organization_id", organizationId) : overdueQ,
      organizationId ? openQ.eq("organization_id", organizationId) : openQ,
    ])

    if (!pendingRes.error) {
      pendingReceivables  = sumRemaining(pendingRes.data)
      pendingInvoiceCount = pendingRes.data?.length ?? 0
    }
    if (!overdueRes.error) {
      overdueReceivables  = sumRemaining(overdueRes.data)
      overdueInvoiceCount = overdueRes.data?.length ?? 0
    }
    if (!openRes.error) {
      aging = computeAging(openRes.data ?? [], now)
    }
  } catch {
    // invoices table not seeded â€” receivables stay at 0
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

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
