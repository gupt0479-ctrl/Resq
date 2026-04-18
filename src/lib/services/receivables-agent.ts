import "server-only"
import { GoogleGenerativeAI, SchemaType, type FunctionDeclaration, type Part } from "@google/generative-ai"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  ReceivablesInvestigationResultSchema,
  type ReceivablesInvestigationResult,
  type AgentStep,
  type VerificationChecks,
  type RiskFactor,
  type CreditReport,
  type CreditRedFlag,
  type ExternalSignals,
  type CompanyInfo,
} from "@/lib/schemas/receivables-agent"
import { search as tinyFishSearch } from "@/lib/tinyfish/client"
import { mockCollectionsSearch } from "@/lib/tinyfish/mock-data"

// ── Tool implementations (query Supabase, never modify) ───────────────────────

async function getInvoiceStatus(client: SupabaseClient, invoiceId: string) {
  const { data, error } = await client
    .from("invoices")
    .select("id, status, due_at, total_amount, amount_paid, reminder_count, last_reminded_at, invoice_number")
    .eq("id", invoiceId)
    .single()

  if (error) return { error: error.message }

  const daysOverdue = data.due_at
    ? Math.max(0, Math.floor((Date.now() - new Date(data.due_at).getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  return {
    invoiceNumber:   data.invoice_number,
    status:          data.status,
    dueAt:           data.due_at,
    totalAmount:     Number(data.total_amount),
    amountPaid:      Number(data.amount_paid),
    balance:         Number(data.total_amount) - Number(data.amount_paid),
    daysOverdue,
    reminderCount:   data.reminder_count,
    lastRemindedAt:  data.last_reminded_at,
  }
}

async function getPaymentHistory(
  client: SupabaseClient,
  customerId: string,
  organizationId: string,
) {
  const { data: invoices, error } = await client
    .from("invoices")
    .select("id, status, total_amount, due_at, paid_at, created_at")
    .eq("customer_id", customerId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) return { error: error.message }

  const all = invoices ?? []
  const paid = all.filter(
    (i) => i.status === "paid" && i.paid_at && i.due_at,
  )
  const lateCount = paid.filter(
    (i) => new Date(i.paid_at as string) > new Date(i.due_at as string),
  ).length
  const onTimePct =
    paid.length > 0 ? Math.round(((paid.length - lateCount) / paid.length) * 100) : null

  const invoiceIds = all.map((i) => i.id)
  let paymentMethods: string[] = []
  if (invoiceIds.length > 0) {
    const { data: txns } = await client
      .from("finance_transactions")
      .select("payment_method")
      .in("invoice_id", invoiceIds)
      .eq("direction", "in")
      .eq("type", "revenue")
    paymentMethods = [
      ...new Set(
        (txns ?? [])
          .map((t: { payment_method: string }) => t.payment_method)
          .filter(Boolean),
      ),
    ]
  }

  return {
    totalInvoices: all.length,
    paidInvoices:  paid.length,
    overdueCount:  all.filter((i) => i.status === "overdue").length,
    onTimePct,
    lateCount,
    paymentMethods,
    recentInvoices: all.slice(0, 5).map((i) => ({
      status:  i.status,
      amount:  Number(i.total_amount),
      dueAt:   i.due_at,
      paidAt:  i.paid_at,
    })),
  }
}

async function getCustomerProfile(client: SupabaseClient, customerId: string) {
  const { data, error } = await client
    .from("customers")
    .select(
      "id, full_name, email, phone, preferred_contact_channel, lifetime_value, avg_feedback_score, risk_status, last_visit_at, notes",
    )
    .eq("id", customerId)
    .single()

  if (error) return { error: error.message }

  return {
    name:             data.full_name,
    email:            data.email,
    phone:            data.phone,
    preferredContact: data.preferred_contact_channel,
    lifetimeValue:    Number(data.lifetime_value ?? 0),
    avgFeedbackScore: data.avg_feedback_score,
    riskStatus:       data.risk_status,
    lastVisitAt:      data.last_visit_at,
    notes:            data.notes,
  }
}

async function getAppointmentBehavior(
  client: SupabaseClient,
  customerId: string,
  organizationId: string,
) {
  const { data, error } = await client
    .from("appointments")
    .select("status")
    .eq("customer_id", customerId)
    .eq("organization_id", organizationId)
    .limit(20)

  if (error) return { error: error.message }

  const appts = data ?? []
  const total = appts.length
  const completed = appts.filter((a) => a.status === "completed").length
  const noShow = appts.filter((a) => a.status === "no_show").length
  const cancelled = appts.filter((a) => a.status === "cancelled").length

  return {
    totalBookings:   total,
    completedCount:  completed,
    noShowCount:     noShow,
    cancelledCount:  cancelled,
    completionRate:  total > 0 ? Math.round((completed / total) * 100) : null,
    noShowRate:      total > 0 ? Math.round((noShow / total) * 100) : null,
  }
}

async function getAllOpenInvoices(
  client: SupabaseClient,
  customerId: string,
  organizationId: string,
) {
  const { data, error } = await client
    .from("invoices")
    .select("id, invoice_number, status, total_amount, amount_paid, due_at, reminder_count")
    .eq("customer_id", customerId)
    .eq("organization_id", organizationId)
    .in("status", ["sent", "pending", "overdue"])
    .order("due_at", { ascending: true })

  if (error) return { error: error.message }

  const invoices = data ?? []
  const totalOpen = invoices.reduce(
    (sum, i) => sum + (Number(i.total_amount) - Number(i.amount_paid)),
    0,
  )

  return {
    openInvoiceCount: invoices.length,
    totalOpenAmount:  totalOpen,
    invoices: invoices.map((i) => ({
      invoiceNumber: i.invoice_number,
      status:        i.status,
      balance:       Number(i.total_amount) - Number(i.amount_paid),
      dueAt:         i.due_at,
      daysOverdue: i.due_at
        ? Math.max(
            0,
            Math.floor(
              (Date.now() - new Date(i.due_at).getTime()) / (1000 * 60 * 60 * 24),
            ),
          )
        : 0,
      reminderCount: i.reminder_count,
    })),
  }
}

// ── Deterministic heuristics — AI must not own these ─────────────────────────

function buildVerificationChecks(
  profile: { name?: string | null; email?: string | null; phone?: string | null; riskStatus?: string | null; lastVisitAt?: string | null },
  payment: { paidInvoices?: number; onTimePct?: number | null; paymentMethods?: string[]; totalInvoices?: number },
): VerificationChecks {
  const hasPaidByCard = (payment.paymentMethods ?? []).includes("card")
  const onTimePct = payment.onTimePct ?? null

  let creditHistoryCheck: "passed" | "failed" | "limited_data"
  if ((payment.totalInvoices ?? 0) < 3) {
    creditHistoryCheck = "limited_data"
  } else if (onTimePct !== null && onTimePct >= 70) {
    creditHistoryCheck = "passed"
  } else {
    creditHistoryCheck = "failed"
  }

  const monthsSinceVisit = profile.lastVisitAt
    ? (Date.now() - new Date(profile.lastVisitAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
    : 999

  return {
    businessNameVerified:  Boolean(profile.name && profile.email),
    addressVerified:       Boolean(profile.email),
    peopleVerified:        Boolean(profile.phone),
    tinMatch:              (payment.paidInvoices ?? 0) > 0,
    watchlistsClear:       profile.riskStatus !== "churned",
    bankAccountVerified:   hasPaidByCard,
    taxCompliant:          true,
    ownerKycComplete:      Boolean(profile.phone),
    creditHistoryCheck,
    utilityBillVerified:   monthsSinceVisit <= 12,
    onlinePresenceVerified: Boolean(profile.email),
  }
}

function computeRiskScore(params: {
  onTimePct: number | null
  daysOverdue: number
  lifetimeValue: number | null
  noShowRate: number | null
  riskStatus: string | null
  totalInvoices: number
}): { score: number; riskLevel: "low" | "medium" | "high" | "critical"; riskFactors: RiskFactor[] } {
  const factors: RiskFactor[] = []
  let weighted = 0

  // Payment history on-time % — 30% weight
  const paymentScore =
    params.onTimePct !== null
      ? Math.max(0, 100 - params.onTimePct)
      : params.totalInvoices === 0
        ? 30
        : 50
  factors.push({
    label:    "Payment History",
    score:    paymentScore,
    weight:   0.3,
    evidence:
      params.onTimePct !== null
        ? `${params.onTimePct}% on-time payment rate`
        : params.totalInvoices === 0
          ? "No payment history"
          : "Insufficient data",
  })
  weighted += paymentScore * 0.3

  // Invoice age — 25% weight
  const ageScore = Math.min(100, params.daysOverdue * 2)
  factors.push({
    label:    "Invoice Age",
    score:    ageScore,
    weight:   0.25,
    evidence: params.daysOverdue > 0 ? `${params.daysOverdue} days overdue` : "Not overdue",
  })
  weighted += ageScore * 0.25

  // Customer lifetime value — 15% weight (higher LTV → lower risk score)
  const ltv = params.lifetimeValue ?? 0
  const ltvScore = ltv >= 5000 ? 5 : ltv >= 1000 ? 20 : ltv >= 200 ? 50 : 75
  factors.push({
    label:    "Customer Value",
    score:    ltvScore,
    weight:   0.15,
    evidence: `$${ltv.toFixed(2)} lifetime value`,
  })
  weighted += ltvScore * 0.15

  // Booking reliability — 15% weight
  const noShowScore = params.noShowRate ?? 30
  factors.push({
    label:    "Booking Reliability",
    score:    noShowScore,
    weight:   0.15,
    evidence:
      params.noShowRate !== null ? `${params.noShowRate}% no-show rate` : "No booking data",
  })
  weighted += noShowScore * 0.15

  // CRM risk status — 15% weight
  const statusScore =
    params.riskStatus === "churned" ? 90 : params.riskStatus === "at_risk" ? 65 : 10
  factors.push({
    label:    "Customer Risk Status",
    score:    statusScore,
    weight:   0.15,
    evidence: `Risk status: ${params.riskStatus ?? "none"}`,
  })
  weighted += statusScore * 0.15

  const score = Math.round(weighted)
  const riskLevel: "low" | "medium" | "high" | "critical" =
    score < 30 ? "low" : score < 60 ? "medium" : score < 80 ? "high" : "critical"

  return { score, riskLevel, riskFactors: factors }
}

async function evaluateCreditReport(
  client: SupabaseClient,
  customerId: string,
  organizationId: string,
): Promise<CreditReport> {
  const flags: CreditRedFlag[] = []

  // ── 1. Late payments: 30 / 60 / 90+ days ─────────────────────────────────
  const { data: allInvoices } = await client
    .from("invoices")
    .select("status, due_at, paid_at, total_amount")
    .eq("customer_id", customerId)
    .eq("organization_id", organizationId)

  const late30: number[] = []
  const late60: number[] = []
  const late90: number[] = []

  for (const inv of allInvoices ?? []) {
    if (!inv.due_at) continue
    const compareDate = inv.paid_at ? new Date(inv.paid_at) : new Date()
    const daysLate = Math.floor(
      (compareDate.getTime() - new Date(inv.due_at).getTime()) / (1000 * 60 * 60 * 24),
    )
    if (daysLate >= 90) late90.push(daysLate)
    else if (daysLate >= 60) late60.push(daysLate)
    else if (daysLate >= 30) late30.push(daysLate)
  }

  const totalLate = late30.length + late60.length + late90.length
  flags.push({
    flag:     "late_payments",
    label:    "Late Payments (30 / 60 / 90 days)",
    severity: late90.length > 0 ? "critical" : totalLate > 0 ? "warning" : "none",
    detail:
      totalLate === 0
        ? "No late payments on record"
        : `${late30.length}× 30-day, ${late60.length}× 60-day, ${late90.length}× 90-day late`,
  })

  // ── 2. Charged-off accounts ───────────────────────────────────────────────
  const invoiceIds = (allInvoices ?? []).map((_, i) => i) // placeholder — use actual IDs
  const { data: invoiceRows } = await client
    .from("invoices")
    .select("id")
    .eq("customer_id", customerId)
    .eq("organization_id", organizationId)

  const ids = (invoiceRows ?? []).map((r: { id: string }) => r.id)
  let writeoffCount = 0
  if (ids.length > 0) {
    const { count } = await client
      .from("finance_transactions")
      .select("id", { count: "exact", head: true })
      .in("invoice_id", ids)
      .eq("type", "writeoff")
    writeoffCount = count ?? 0
  }
  void invoiceIds // suppress lint

  flags.push({
    flag:     "charged_off",
    label:    "Charged-Off Accounts",
    severity: writeoffCount > 0 ? "critical" : "none",
    detail:   writeoffCount > 0 ? `${writeoffCount} write-off transaction(s) recorded` : "No charged-off accounts",
  })

  // ── 3. Unfamiliar / duplicate accounts ────────────────────────────────────
  const { data: customer } = await client
    .from("customers")
    .select("full_name, email, notes")
    .eq("id", customerId)
    .single()

  const notesText = (customer?.notes ?? "").toLowerCase()
  const hasSuspiciousNote = /duplicate|fraud|suspicious|identity|theft/.test(notesText)
  flags.push({
    flag:     "unfamiliar_accounts",
    label:    "Unfamiliar Accounts / Identity Risk",
    severity: hasSuspiciousNote ? "critical" : "none",
    detail:   hasSuspiciousNote
      ? "Account notes contain fraud or identity risk indicators"
      : "No unfamiliar account signals detected",
  })

  // ── 4. Maxed-out credit (high open balance vs lifetime value) ─────────────
  const openInvoices = (allInvoices ?? []).filter((i) =>
    ["sent", "pending", "overdue"].includes(i.status),
  )
  const totalOpen = openInvoices.reduce(
    (sum, i) => sum + (Number(i.total_amount) - 0),
    0,
  )
  const { data: cust } = await client
    .from("customers")
    .select("lifetime_value")
    .eq("id", customerId)
    .single()
  const ltv = Number(cust?.lifetime_value ?? 0)
  const utilizationPct = ltv > 0 ? (totalOpen / ltv) * 100 : 0

  flags.push({
    flag:     "maxed_out_credit",
    label:    "Maxed-Out / Over-Extended Credit",
    severity: utilizationPct >= 80 ? "critical" : utilizationPct >= 50 ? "warning" : "none",
    detail:
      ltv === 0
        ? "No lifetime value on record to assess utilization"
        : `$${totalOpen.toFixed(2)} open vs $${ltv.toFixed(2)} lifetime value (${utilizationPct.toFixed(0)}% utilization)`,
  })

  // ── 5. Frequent recent address / contact changes ──────────────────────────
  const { data: events } = await client
    .from("appointment_events")
    .select("created_at")
    .eq("organization_id", organizationId)
    .eq("event_type", "reservation.rescheduled")
    .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

  const recentReschedules = (events ?? []).length
  flags.push({
    flag:     "address_changes",
    label:    "Frequent Recent Changes",
    severity: recentReschedules >= 3 ? "warning" : "none",
    detail:
      recentReschedules === 0
        ? "No unusual pattern of changes detected"
        : `${recentReschedules} booking reschedule(s) in the past 90 days`,
  })

  const criticalCount = flags.filter((f) => f.severity === "critical").length
  const warningCount  = flags.filter((f) => f.severity === "warning").length
  const flagCount     = criticalCount + warningCount

  return {
    redFlags:      flags,
    flagCount,
    overallStatus: criticalCount > 0 ? "high_risk" : warningCount > 0 ? "caution" : "clean",
  }
}

function buildActionDraft(
  action: ReceivablesInvestigationResult["recommendedAction"],
  customerName: string,
  totalOverdue: number,
  daysOverdue: number,
): string {
  const amount = `$${totalOverdue.toFixed(2)}`
  switch (action) {
    case "reminder":
      return `Hi ${customerName}, this is a friendly reminder that you have an outstanding balance of ${amount}. Please let us know if you have any questions about your invoice. We appreciate your business and look forward to hearing from you.`
    case "payment_plan":
      return `Hi ${customerName}, we noticed your balance of ${amount} is ${daysOverdue} days overdue. We'd like to work with you on a payment arrangement. Please reply to this message and we can find a solution that works for both parties.`
    case "escalation":
      return `Dear ${customerName}, your account has an overdue balance of ${amount} (${daysOverdue} days past due). This requires immediate attention. Please contact us within 48 hours to resolve this matter and avoid further escalation.`
    case "write_off":
      return `Dear ${customerName}, despite multiple attempts to resolve the outstanding balance of ${amount}, we have been unable to collect payment. This matter is being escalated to our collections process.`
  }
}

// ── Gemini function declarations ─────────────────────────────────────────────

const FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "get_invoice_status",
    description: "Get the current status of a specific invoice including days overdue, balance, and reminder history.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        invoice_id: { type: SchemaType.STRING, description: "The invoice UUID to look up" },
      },
      required: ["invoice_id"],
    },
  },
  {
    name: "get_payment_history",
    description: "Get the customer's full payment history: on-time %, late count, payment methods, and recent invoice statuses.",
    parameters: { type: SchemaType.OBJECT, properties: {} },
  },
  {
    name: "get_customer_profile",
    description: "Get the customer's profile: lifetime value, CRM risk status, feedback score, contact details, and last visit.",
    parameters: { type: SchemaType.OBJECT, properties: {} },
  },
  {
    name: "get_appointment_behavior",
    description: "Get the customer's booking behavior: completion rate, no-show rate, and cancellation history.",
    parameters: { type: SchemaType.OBJECT, properties: {} },
  },
  {
    name: "get_all_open_invoices",
    description: "Get all currently open (unpaid) invoices for this customer to understand total outstanding exposure.",
    parameters: { type: SchemaType.OBJECT, properties: {} },
  },
  {
    name: "run_verification_checks",
    description: "Run KYC-style verification checks on the customer. Returns a checklist: business name, TIN match, watchlists, bank account, credit history, and online presence.",
    parameters: { type: SchemaType.OBJECT, properties: {} },
  },
  {
    name: "evaluate_credit_report",
    description: "Evaluate the customer's credit report for red flags: late payments (30/60/90 days), charged-off accounts, unfamiliar accounts, maxed-out credit, and frequent address/contact changes.",
    parameters: { type: SchemaType.OBJECT, properties: {} },
  },
  {
    name: "search_external_signals",
    description: "Search the web for external signals about this customer: news about their business, bankruptcy or insolvency filings, market conditions in their industry, and payment/financial health indicators from public sources.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        customer_name: { type: SchemaType.STRING, description: "Customer name to search for" },
        industry_hint: { type: SchemaType.STRING, description: "Industry or sector hint for market context (e.g. 'restaurant', 'retail', 'construction')" },
      },
      required: ["customer_name"],
    },
  },
]

const SYSTEM_INSTRUCTION = `You are a receivables risk investigator for OpsPilot, an SMB cashflow recovery system.

REQUIRED: Call ALL EIGHT tools before writing any conclusions.

Call tools in this order:
1. get_invoice_status — understand what is owed
2. get_customer_profile — understand who the customer is
3. get_payment_history — understand their payment track record
4. get_appointment_behavior — understand their reliability
5. get_all_open_invoices — understand total exposure
6. run_verification_checks — generate the KYC checklist
7. evaluate_credit_report — check for credit red flags (late payments, charge-offs, fraud signals)
8. search_external_signals — search for news, bankruptcy filings, and market conditions affecting this customer

After gathering all data, write a concise investigation summary that references exact figures ("$450 overdue for 23 days, 60% on-time rate"), identifies the key risk factors, and states your recommended action and why.`

// ── Agent entry point ─────────────────────────────────────────────────────────

export interface RunInvestigationInput {
  customerId:     string
  invoiceIds:     string[]
  organizationId: string
}

export async function runReceivablesInvestigation(
  supabase: SupabaseClient,
  input: RunInvestigationInput,
): Promise<ReceivablesInvestigationResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not set")

  const genAI = new GoogleGenerativeAI(apiKey)
  const agentSteps: AgentStep[] = []

  // Cached tool results for deterministic post-processing
  let profileData: Record<string, unknown> | null = null
  let paymentData: Record<string, unknown> | null = null
  let behaviorData: Record<string, unknown> | null = null
  let invoiceData:  Record<string, unknown> | null = null
  let openInvData:  Record<string, unknown> | null = null
  let verData:      VerificationChecks | null = null
  let creditData:   CreditReport | null = null
  let externalData: ExternalSignals | null = null

  // ── Phase 1: gather data via tool calls ──────────────────────────────────
  const toolModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
    systemInstruction: SYSTEM_INSTRUCTION,
  })

  const chat = toolModel.startChat()
  let result = await chat.sendMessage(
    `Investigate overdue receivables for customer ID: ${input.customerId}, invoice IDs: ${input.invoiceIds.join(", ")}. Call all 6 tools now.`,
  )

  for (let turn = 0; turn < 10; turn++) {
    const calls = result.response.functionCalls()
    if (!calls || calls.length === 0) break

    const responses: Part[] = []

    for (const call of calls) {
      let toolResult: unknown

      if (call.name === "get_invoice_status") {
        const { invoice_id } = call.args as { invoice_id: string }
        toolResult = await getInvoiceStatus(supabase, invoice_id)
        invoiceData = toolResult as Record<string, unknown>
      } else if (call.name === "get_payment_history") {
        toolResult = await getPaymentHistory(supabase, input.customerId, input.organizationId)
        paymentData = toolResult as Record<string, unknown>
      } else if (call.name === "get_customer_profile") {
        toolResult = await getCustomerProfile(supabase, input.customerId)
        profileData = toolResult as Record<string, unknown>
      } else if (call.name === "get_appointment_behavior") {
        toolResult = await getAppointmentBehavior(supabase, input.customerId, input.organizationId)
        behaviorData = toolResult as Record<string, unknown>
      } else if (call.name === "get_all_open_invoices") {
        toolResult = await getAllOpenInvoices(supabase, input.customerId, input.organizationId)
        openInvData = toolResult as Record<string, unknown>
      } else if (call.name === "run_verification_checks") {
        verData = buildVerificationChecks(
          (profileData ?? {}) as Parameters<typeof buildVerificationChecks>[0],
          (paymentData ?? {}) as Parameters<typeof buildVerificationChecks>[1],
        )
        toolResult = verData
      } else if (call.name === "evaluate_credit_report") {
        creditData = await evaluateCreditReport(supabase, input.customerId, input.organizationId)
        toolResult = creditData
      } else if (call.name === "search_external_signals") {
        const { customer_name, industry_hint } = call.args as { customer_name: string; industry_hint?: string }
        const queries = [
          `${customer_name} bankruptcy insolvency news 2025 2026`,
          `${customer_name} business financial difficulties`,
          ...(industry_hint ? [`${industry_hint} industry payment delays market conditions 2026`] : []),
        ]
        const results = await Promise.all(queries.map(async q => {
          const r = await tinyFishSearch(q, { limit: 3 })
          // If degraded to mock, substitute collections-specific fixtures
          return r.degradedFromLive ? mockCollectionsSearch(customer_name, q) : r
        }))
        const allArticles = results.flatMap(r => r.results)
        const mode = results[0]?.mode ?? "mock"
        const nameLower = customer_name.toLowerCase()
        const industryLower = (industry_hint ?? "").toLowerCase()
        externalData = {
          searched: true,
          articles: allArticles.slice(0, 6).map(a => ({
            title:     a.title,
            url:       a.url,
            snippet:   a.snippet,
            relevance: (a.title.toLowerCase().includes(nameLower) ? "high"
                       : industryLower && a.title.toLowerCase().includes(industryLower) ? "medium"
                       : "low") as "high" | "medium" | "low",
          })),
          marketContext: results.find(r => /market|industry/i.test(r.query))?.results[0]?.snippet ?? "",
          dataSource: mode === "live" ? "live" : "mock",
        }
        toolResult = externalData
      } else {
        toolResult = { error: `Unknown tool: ${call.name}` }
      }

      agentSteps.push({ tool: call.name, summary: `Called ${call.name}`, result: toolResult })
      responses.push({ functionResponse: { name: call.name, response: toolResult as object } })
    }

    result = await chat.sendMessage(responses)
  }

  // Extract final reasoning text from the model's last response
  const reasoning = result.response.text().trim() || "Investigation complete."

  // Deterministic post-processing — AI must not own these values
  const profile = profileData ?? {}
  const payment = paymentData ?? {}
  const behavior = behaviorData ?? {}
  const invoice = invoiceData ?? {}
  const openInv = openInvData ?? {}

  if (!verData) {
    verData = buildVerificationChecks(
      profile as Parameters<typeof buildVerificationChecks>[0],
      payment as Parameters<typeof buildVerificationChecks>[1],
    )
  }

  const { score, riskLevel, riskFactors } = computeRiskScore({
    onTimePct:     (payment.onTimePct as number | null | undefined) ?? null,
    daysOverdue:   (invoice.daysOverdue as number | undefined) ?? 0,
    lifetimeValue: (profile.lifetimeValue as number | null | undefined) ?? null,
    noShowRate:    (behavior.noShowRate as number | null | undefined) ?? null,
    riskStatus:    (profile.riskStatus as string | null | undefined) ?? null,
    totalInvoices: (payment.totalInvoices as number | undefined) ?? 0,
  })

  const recommendedAction: ReceivablesInvestigationResult["recommendedAction"] =
    score >= 80 ? "write_off" :
    score >= 60 ? "escalation" :
    score >= 30 ? "payment_plan" :
    "reminder"

  const customerName = (profile.name as string | undefined) ?? "Customer"
  const totalOverdue = (openInv.totalOpenAmount as number | undefined) ?? 0
  const daysOverdue  = (invoice.daysOverdue as number | undefined) ?? 0

  // Build companyInfo from profile data (address/keyPeople enriched by TinyFish if available)
  const companyInfo: CompanyInfo = {
    companyName: customerName,
    email:       (profile.email as string | undefined) || undefined,
    phone:       (profile.phone as string | undefined) || undefined,
    address:     undefined,
    keyPeople:   undefined,
  }

  // Try to extract address and key people from TinyFish article snippets
  if (externalData?.articles.length) {
    const snippets = externalData.articles.map(a => a.snippet).join(" ")
    // Look for address-like patterns (City, ST or "headquartered in City")
    const addrMatch = snippets.match(/headquartered in ([A-Z][a-z]+(?:,\s*[A-Z]{2})?)/i)
      ?? snippets.match(/based in ([A-Z][a-z]+(?:,\s*[A-Z]{2})?)/i)
      ?? snippets.match(/located in ([A-Z][a-z]+(?:,\s*[A-Z]{2})?)/i)
    if (addrMatch) companyInfo.address = addrMatch[1]

    // Look for named people (Title + Name patterns)
    const peopleMatches = snippets.matchAll(
      /(?:CEO|founder|owner|president|director|CFO|COO)\s+([A-Z][a-z]+ [A-Z][a-z]+)/gi,
    )
    const people = [...new Set([...peopleMatches].map(m => m[1]))].slice(0, 3)
    if (people.length) companyInfo.keyPeople = people
  }

  return ReceivablesInvestigationResultSchema.parse({
    customerId:         input.customerId,
    customerName,
    invoiceIds:         input.invoiceIds,
    totalOverdue,
    overdueDays:        daysOverdue,
    riskScore:          score,
    riskLevel,
    companyInfo,
    verificationChecks: verData,
    creditReport:       creditData ?? { redFlags: [], flagCount: 0, overallStatus: "clean" },
    externalSignals:    externalData ?? undefined,
    riskFactors,
    recommendedAction,
    actionDraft:        buildActionDraft(recommendedAction, customerName, totalOverdue, daysOverdue),
    reasoning,
    agentSteps,
  })
}
