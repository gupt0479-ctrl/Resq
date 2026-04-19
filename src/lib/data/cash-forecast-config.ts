// Resq · Cash Forecast Configuration
// Deterministic seed data for obligations, receivables, and refund exposure
// Stored as code (not DB) for hackathon speed — same data, same output every run

export const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CashObligation {
  id: string
  category: "payroll" | "rent" | "vendor" | "tax" | "insurance" | "software" | "utilities" | "other"
  description: string
  amount: number
  dueAt: string // ISO date
  recurrence: "once" | "weekly" | "biweekly" | "monthly" | "quarterly" | "annual"
  isDeferrable: boolean
  deferredTo?: string
  status: "scheduled" | "paid" | "deferred" | "cancelled"
}

export interface CashReceivable {
  id: string
  description: string
  amount: number
  expectedDate: string // ISO date
  originalDate: string // ISO date
  collectionLagDays: number
  confidence: number
  status: "expected" | "collected" | "slipped" | "written_off"
  notes: string
}

export interface RefundExposureItem {
  id: string
  description: string
  amount: number
  requestedAt: string
  expectedPayDate: string
  status: "pending" | "approved" | "paid" | "denied"
  notes: string
}

// ── Helper: date relative to today ────────────────────────────────────────────

function futureDate(daysAhead: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().slice(0, 10)
}

// ── Obligations (13 weeks of explicit future outflows) ────────────────────────

function buildObligations(): CashObligation[] {
  const obs: CashObligation[] = []

  // Weekly payroll $14K — 13 weeks (Friday = +4, +11, +18, ...)
  for (let w = 1; w <= 13; w++) {
    obs.push({
      id: `obl-payroll-w${w}`,
      category: "payroll",
      description: "Weekly payroll — all staff",
      amount: 14000,
      dueAt: futureDate(w * 7 - 3),
      recurrence: "weekly",
      isDeferrable: false,
      status: "scheduled",
    })
  }

  // Monthly rent $22K — months 1, 2, 3
  for (let m = 0; m < 3; m++) {
    obs.push({
      id: `obl-rent-m${m + 1}`,
      category: "rent",
      description: "Monthly rent — Nicollet Mall properties",
      amount: 22000,
      dueAt: futureDate([5, 35, 65][m]),
      recurrence: "monthly",
      isDeferrable: false,
      status: "scheduled",
    })
  }

  // Vendor bills — weeks 3, 7, 11
  obs.push(
    { id: "obl-vendor-w3", category: "vendor", description: "Sysco food supply — monthly order", amount: 8800, dueAt: futureDate(18), recurrence: "once", isDeferrable: true, status: "scheduled" },
    { id: "obl-vendor-w7", category: "vendor", description: "Sysco food supply — monthly order", amount: 9200, dueAt: futureDate(46), recurrence: "once", isDeferrable: true, status: "scheduled" },
    { id: "obl-vendor-w11", category: "vendor", description: "Sysco food supply — monthly order", amount: 8500, dueAt: futureDate(74), recurrence: "once", isDeferrable: true, status: "scheduled" },
  )

  // Quarterly tax $18K — week 9
  obs.push({
    id: "obl-tax-q2",
    category: "tax",
    description: "Quarterly estimated tax payment — Q2 2026",
    amount: 18000,
    dueAt: futureDate(60),
    recurrence: "quarterly",
    isDeferrable: false,
    status: "scheduled",
  })

  // Insurance renewal $4,500 — week 6
  obs.push({
    id: "obl-insurance-renewal",
    category: "insurance",
    description: "Annual property + liability insurance renewal",
    amount: 4500,
    dueAt: futureDate(39),
    recurrence: "annual",
    isDeferrable: true,
    status: "scheduled",
  })

  return obs
}

// ── Receivables (expected inflows) ────────────────────────────────────────────

function buildReceivables(): CashReceivable[] {
  return [
    {
      id: "rcv-grand-hotels",
      description: "Grand Hotels Ltd — corporate event block booking",
      amount: 24000,
      expectedDate: futureDate(18),
      originalDate: futureDate(8),
      collectionLagDays: 10,
      confidence: 0.85,
      status: "expected",
      notes: "Originally due week 2, slipped 10 days to week 3. AP contact confirmed payment in process.",
    },
    {
      id: "rcv-morrison-wedding",
      description: "Morrison wedding — final catering balance",
      amount: 12500,
      expectedDate: futureDate(10),
      originalDate: futureDate(10),
      collectionLagDays: 0,
      confidence: 0.95,
      status: "expected",
      notes: "Collecting on schedule. Client confirmed.",
    },
    {
      id: "rcv-apex-hotel",
      description: "Apex Corp — hotel group booking balance",
      amount: 8200,
      expectedDate: futureDate(25),
      originalDate: futureDate(25),
      collectionLagDays: 0,
      confidence: 0.90,
      status: "expected",
      notes: "Standard 30-day terms. No issues flagged.",
    },
    {
      id: "rcv-blueprint-gala",
      description: "Blueprint Events — summer gala deposit",
      amount: 6800,
      expectedDate: futureDate(32),
      originalDate: futureDate(32),
      collectionLagDays: 0,
      confidence: 0.92,
      status: "expected",
      notes: "Deposit invoice sent. Client acknowledged.",
    },
  ]
}

// ── Refund Exposure ───────────────────────────────────────────────────────────

function buildRefundExposure(): RefundExposureItem[] {
  return [
    {
      id: "ref-meridian-retreat",
      description: "Meridian Corp — cancelled corporate retreat deposit refund",
      amount: 6200,
      requestedAt: futureDate(-5),
      expectedPayDate: futureDate(14),
      status: "pending",
      notes: "Client requested full refund of $6,200 deposit. Under review.",
    },
  ]
}

// ── Exports (memoized for determinism within a single process) ────────────────

let _obligations: CashObligation[] | null = null
let _receivables: CashReceivable[] | null = null
let _refundExposure: RefundExposureItem[] | null = null

export function getObligations(): CashObligation[] {
  if (!_obligations) _obligations = buildObligations()
  return _obligations
}

export function getReceivables(): CashReceivable[] {
  if (!_receivables) _receivables = buildReceivables()
  return _receivables
}

export function getRefundExposure(): RefundExposureItem[] {
  if (!_refundExposure) _refundExposure = buildRefundExposure()
  return _refundExposure
}
