#!/usr/bin/env node
// Seed cash forecast data via Supabase JS client (idempotent)
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ORG = "00000000-0000-0000-0000-000000000001"

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing env vars"); process.exit(1)
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

function d(daysAgo) { return new Date(Date.now() - daysAgo * 86400000).toISOString() }
function f(daysAhead) { return new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10) }

async function upsertMany(table, rows) {
  const { error } = await sb.from(table).upsert(rows, { onConflict: "id", ignoreDuplicates: true })
  if (error) console.error(`  ✗ ${table}: ${error.message}`)
  else console.log(`  ✓ ${table}: ${rows.length} rows`)
}

async function main() {
  console.log("Seeding cash forecast data...\n")

  // ── Historical finance_transactions ──
  const txns = []
  // Restaurant revenue — 12 weeks
  for (let w = 12; w >= 1; w--) {
    const amounts = [18200,19400,17800,20100,18900,21200,19600,20800,18500,19700,20400,19100]
    txns.push({
      id: `00000000-0000-0000-0050-0000000000${String(w).padStart(2,"0")}`,
      organization_id: ORG, type: "revenue", category: "restaurant_revenue",
      amount: amounts[12-w], direction: "in", occurred_at: d(w*7),
      payment_method: "bank_transfer", notes: `Week -${w} restaurant deposits`
    })
  }
  // Hotel revenue — biweekly (6)
  const hotelAmts = [32400,28900,34100,30200,33500,29800]
  const hotelDays = [80,66,52,38,24,10]
  for (let i = 0; i < 6; i++) {
    txns.push({
      id: `00000000-0000-0000-0050-00000000002${i}`,
      organization_id: ORG, type: "revenue", category: "hotel_revenue",
      amount: hotelAmts[i], direction: "in", occurred_at: d(hotelDays[i]),
      payment_method: "bank_transfer", notes: "Hotel revenue — biweekly"
    })
  }
  // Catering deposits (4)
  const catAmts = [8500,12000,6200,9800]
  const catDays = [75,55,40,18]
  const catNotes = ["Morrison wedding deposit","Apex Corp annual gala deposit","Hartley birthday event deposit","Grand Hotels quarterly dinner deposit"]
  for (let i = 0; i < 4; i++) {
    txns.push({
      id: `00000000-0000-0000-0050-0000000000${30+i}`,
      organization_id: ORG, type: "revenue", category: "catering_deposit",
      amount: catAmts[i], direction: "in", occurred_at: d(catDays[i]),
      payment_method: i%2===0?"card":"bank_transfer", notes: catNotes[i]
    })
  }
  // Payroll — 12 Fridays
  for (let w = 0; w < 12; w++) {
    txns.push({
      id: `00000000-0000-0000-0050-000000000${String(40+w).padStart(3,"0")}`,
      organization_id: ORG, type: "expense", category: "payroll",
      amount: 14000, direction: "out", occurred_at: d(82 - w*7),
      payment_method: "bank_transfer", notes: "Weekly payroll"
    })
  }
  // Rent — 3 months
  for (let i = 0; i < 3; i++) {
    txns.push({
      id: `00000000-0000-0000-0050-00000000006${i}`,
      organization_id: ORG, type: "expense", category: "rent",
      amount: 22000, direction: "out", occurred_at: d([85,55,25][i]),
      payment_method: "bank_transfer", notes: "Monthly rent — Nicollet Mall"
    })
  }
  // Vendor bills
  const vendorAmts = [8400,3200,9100,4800,7600,2900]
  const vendorDays = [78,65,50,35,20,8]
  const vendorNotes = ["Sysco food supply","Linen service","Sysco food supply","HVAC maintenance","Sysco food supply","Cleaning supplies"]
  for (let i = 0; i < 6; i++) {
    txns.push({
      id: `00000000-0000-0000-0050-00000000007${i}`,
      organization_id: ORG, type: "expense", category: "vendor",
      amount: vendorAmts[i], direction: "out", occurred_at: d(vendorDays[i]),
      payment_method: i%2===0?"bank_transfer":"card", notes: vendorNotes[i]
    })
  }
  // Software
  txns.push(
    { id: "00000000-0000-0000-0050-000000000080", organization_id: ORG, type: "expense", category: "software", amount: 1200, direction: "out", occurred_at: d(60), payment_method: "card", notes: "POS + reservation software" },
    { id: "00000000-0000-0000-0050-000000000081", organization_id: ORG, type: "expense", category: "software", amount: 1200, direction: "out", occurred_at: d(30), payment_method: "card", notes: "POS + reservation software" }
  )
  // Utilities
  txns.push(
    { id: "00000000-0000-0000-0050-000000000085", organization_id: ORG, type: "expense", category: "utilities", amount: 4200, direction: "out", occurred_at: d(58), payment_method: "bank_transfer", notes: "Electric + gas + water" },
    { id: "00000000-0000-0000-0050-000000000086", organization_id: ORG, type: "expense", category: "utilities", amount: 4500, direction: "out", occurred_at: d(28), payment_method: "bank_transfer", notes: "Electric + gas + water" }
  )
  // Refund paid
  txns.push({
    id: "00000000-0000-0000-0050-000000000090", organization_id: ORG, type: "refund", category: "catering_refund",
    amount: 6200, direction: "out", occurred_at: d(22), payment_method: "bank_transfer",
    notes: "Refund — cancelled Peterson anniversary event"
  })

  await upsertMany("finance_transactions", txns)

  // ── Cash Obligations ──
  const obligations = []
  // Payroll — 13 weeks
  for (let w = 1; w <= 13; w++) {
    obligations.push({
      id: `00000000-0000-0000-0060-0000000000${String(w).padStart(2,"0")}`,
      organization_id: ORG, category: "payroll", description: "Weekly payroll — all staff",
      amount: 14000, due_at: f(w*7-3), recurrence: "weekly", is_deferrable: false, status: "scheduled"
    })
  }
  // Rent — 3 months
  for (let i = 0; i < 3; i++) {
    obligations.push({
      id: `00000000-0000-0000-0060-0000000000${20+i}`,
      organization_id: ORG, category: "rent", description: "Monthly rent — Nicollet Mall properties",
      amount: 22000, due_at: f([5,35,65][i]), recurrence: "monthly", is_deferrable: false, status: "scheduled"
    })
  }
  // Vendor bills — weeks 3, 7, 11
  obligations.push(
    { id: "00000000-0000-0000-0060-000000000030", organization_id: ORG, category: "vendor", description: "Sysco food supply — monthly order", amount: 8800, due_at: f(18), recurrence: "once", is_deferrable: true, status: "scheduled" },
    { id: "00000000-0000-0000-0060-000000000031", organization_id: ORG, category: "vendor", description: "Sysco food supply — monthly order", amount: 9200, due_at: f(46), recurrence: "once", is_deferrable: true, status: "scheduled" },
    { id: "00000000-0000-0000-0060-000000000032", organization_id: ORG, category: "vendor", description: "Sysco food supply — monthly order", amount: 8500, due_at: f(74), recurrence: "once", is_deferrable: true, status: "scheduled" }
  )
  // Tax — week 9
  obligations.push({
    id: "00000000-0000-0000-0060-000000000040", organization_id: ORG, category: "tax",
    description: "Quarterly estimated tax payment — Q2 2026", amount: 18000, due_at: f(60),
    recurrence: "quarterly", is_deferrable: false, status: "scheduled"
  })
  // Insurance — week 6
  obligations.push({
    id: "00000000-0000-0000-0060-000000000050", organization_id: ORG, category: "insurance",
    description: "Annual property + liability insurance renewal", amount: 4500, due_at: f(39),
    recurrence: "annual", is_deferrable: true, status: "scheduled"
  })

  await upsertMany("cash_obligations", obligations)

  // ── Cash Receivables ──
  const receivables = [
    { id: "00000000-0000-0000-0070-000000000001", organization_id: ORG, description: "Grand Hotels Ltd — corporate event block booking", amount: 24000, expected_date: f(18), original_date: f(8), collection_lag_days: 10, confidence: 0.85, status: "expected", notes: "Originally due week 2, slipped 10 days to week 3." },
    { id: "00000000-0000-0000-0070-000000000002", organization_id: ORG, description: "Morrison wedding — final catering balance", amount: 12500, expected_date: f(10), original_date: f(10), collection_lag_days: 0, confidence: 0.95, status: "expected", notes: "Collecting on schedule." },
    { id: "00000000-0000-0000-0070-000000000003", organization_id: ORG, description: "Apex Corp — hotel group booking balance", amount: 8200, expected_date: f(25), original_date: f(25), collection_lag_days: 0, confidence: 0.90, status: "expected", notes: "Standard 30-day terms." },
    { id: "00000000-0000-0000-0070-000000000004", organization_id: ORG, description: "Blueprint Events — summer gala deposit", amount: 6800, expected_date: f(32), original_date: f(32), collection_lag_days: 0, confidence: 0.92, status: "expected", notes: "Deposit invoice sent." },
  ]
  await upsertMany("cash_receivables", receivables)

  // ── Refund Exposure ──
  const refunds = [
    { id: "00000000-0000-0000-0080-000000000001", organization_id: ORG, description: "Meridian Corp — cancelled corporate retreat deposit refund", amount: 6200, requested_at: f(-5), expected_pay_date: f(14), status: "pending", notes: "Client requested full refund." },
  ]
  await upsertMany("refund_exposure", refunds)

  // ── Row counts ──
  console.log("\n── Final Row Counts ──")
  for (const t of ["finance_transactions","cash_obligations","cash_receivables","refund_exposure","forecast_runs"]) {
    const { count } = await sb.from(t).select("*", { count: "exact", head: true })
    console.log(`  ${t}: ${count}`)
  }
  console.log("\n✓ Seed complete")
}

main().catch(e => { console.error(e); process.exit(1) })
