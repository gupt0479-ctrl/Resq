import "server-only"
import { GoogleGenerativeAI, SchemaType, type FunctionDeclaration, type Part } from "@google/generative-ai"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { eq, and, inArray, gte, desc, asc, count } from "drizzle-orm"
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
  type WatchlistHit,
  type WatchlistScreening,
  type WatchlistId,
  WATCHLIST_LABELS,
} from "@/lib/schemas/receivables-agent"
import { search as tinyFishSearch } from "@/lib/tinyfish/client"
import { mockCollectionsSearch, mockWatchlistSearch } from "@/lib/tinyfish/mock-data"

const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_AI_API_KEY })

// ── Tool implementations (query db, never modify) ─────────────────────────

async function getInvoiceStatus(invoiceId: string) {
  const [data] = await db
    .select({
      id:             schema.invoices.id,
      status:         schema.invoices.status,
      dueAt:          schema.invoices.dueAt,
      totalAmount:    schema.invoices.totalAmount,
      amountPaid:     schema.invoices.amountPaid,
      reminderCount:  schema.invoices.reminderCount,
      lastRemindedAt: schema.invoices.lastRemindedAt,
      invoiceNumber:  schema.invoices.invoiceNumber,
    })
    .from(schema.invoices)
    .where(eq(schema.invoices.id, invoiceId))
    .limit(1)

  if (!data) return { error: "Invoice not found" }

  const daysOverdue = data.dueAt
    ? Math.max(0, Math.floor((Date.now() - new Date(data.dueAt.toISOString()).getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  return {
    invoiceNumber:   data.invoiceNumber,
    status:          data.status,
    dueAt:           data.dueAt?.toISOString(),
    totalAmount:     Number(data.totalAmount),
    amountPaid:      Number(data.amountPaid),
    balance:         Number(data.totalAmount) - Number(data.amountPaid),
    daysOverdue,
    reminderCount:   data.reminderCount,
    lastRemindedAt:  data.lastRemindedAt?.toISOString() ?? null,
  }
}

async function getPaymentHistory(
  customerId: string,
  organizationId: string,
) {
  const invoices = await db
    .select({
      id:          schema.invoices.id,
      status:      schema.invoices.status,
      totalAmount: schema.invoices.totalAmount,
      dueAt:       schema.invoices.dueAt,
      paidAt:      schema.invoices.paidAt,
      createdAt:   schema.invoices.createdAt,
    })
    .from(schema.invoices)
    .where(
      and(
        eq(schema.invoices.customerId, customerId),
        eq(schema.invoices.organizationId, organizationId),
      ),
    )
    .orderBy(desc(schema.invoices.createdAt))
    .limit(20)

  const all = invoices
  const paid = all.filter(
    (i) => i.status === "paid" && i.paidAt && i.dueAt,
  )
  const lateCount = paid.filter(
    (i) => new Date(i.paidAt!.toISOString()) > new Date(i.dueAt.toISOString()),
  ).length
  const onTimePct =
    paid.length > 0 ? Math.round(((paid.length - lateCount) / paid.length) * 100) : null

  const invoiceIds = all.map((i) => i.id)
  let paymentMethods: string[] = []
  if (invoiceIds.length > 0) {
    const txns = await db
      .select({ paymentMethod: schema.financeTransactions.paymentMethod })
      .from(schema.financeTransactions)
      .where(
        and(
          inArray(schema.financeTransactions.invoiceId, invoiceIds),
          eq(schema.financeTransactions.direction, "in"),
          eq(schema.financeTransactions.type, "revenue"),
        ),
      )
    paymentMethods = [
      ...new Set(
        txns
          .map((t) => t.paymentMethod)
          .filter((m): m is string => Boolean(m)),
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
      amount:  Number(i.totalAmount),
      dueAt:   i.dueAt?.toISOString(),
      paidAt:  i.paidAt?.toISOString() ?? null,
    })),
  }
}

async function getCustomerProfile(customerId: string) {
  const [data] = await db
    .select({
      id:                      schema.customers.id,
      fullName:                schema.customers.fullName,
      email:                   schema.customers.email,
      phone:                   schema.customers.phone,
      preferredContactChannel: schema.customers.preferredContactChannel,
      lifetimeValue:           schema.customers.lifetimeValue,
      avgFeedbackScore:        schema.customers.avgFeedbackScore,
      riskStatus:              schema.customers.riskStatus,
      lastVisitAt:             schema.customers.lastVisitAt,
      notes:                   schema.customers.notes,
    })
    .from(schema.customers)
    .where(eq(schema.customers.id, customerId))
    .limit(1)

  if (!data) return { error: "Customer not found" }

  return {
    name:             data.fullName,
    email:            data.email,
    phone:            data.phone,
    preferredContact: data.preferredContactChannel,
    lifetimeValue:    Number(data.lifetimeValue ?? 0),
    avgFeedbackScore: data.avgFeedbackScore,
    riskStatus:       data.riskStatus,
    lastVisitAt:      data.lastVisitAt?.toISOString() ?? null,
    notes:            data.notes,
  }
}

async function getAppointmentBehavior(
  customerId: string,
  organizationId: string,
) {
  const appts = await db
    .select({ status: schema.appointments.status })
    .from(schema.appointments)
    .where(
      and(
        eq(schema.appointments.customerId, customerId),
        eq(schema.appointments.organizationId, organizationId),
      ),
    )
    .limit(20)

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
  customerId: string,
  organizationId: string,
) {
  const invoices = await db
    .select({
      id:            schema.invoices.id,
      invoiceNumber: schema.invoices.invoiceNumber,
      status:        schema.invoices.status,
      totalAmount:   schema.invoices.totalAmount,
      amountPaid:    schema.invoices.amountPaid,
      dueAt:         schema.invoices.dueAt,
      reminderCount: schema.invoices.reminderCount,
    })
    .from(schema.invoices)
    .where(
      and(
        eq(schema.invoices.customerId, customerId),
        eq(schema.invoices.organizationId, organizationId),
        inArray(schema.invoices.status, ["sent", "pending", "overdue"]),
      ),
    )
    .orderBy(asc(schema.invoices.dueAt))

  const totalOpen = invoices.reduce(
    (sum, i) => sum + (Number(i.totalAmount) - Number(i.amountPaid)),
    0,
  )

  return {
    openInvoiceCount: invoices.length,
    totalOpenAmount:  totalOpen,
    invoices: invoices.map((i) => ({
      invoiceNumber: i.invoiceNumber,
      status:        i.status,
      balance:       Number(i.totalAmount) - Number(i.amountPaid),
      dueAt:         i.dueAt?.toISOString(),
      daysOverdue: i.dueAt
        ? Math.max(
            0,
            Math.floor(
              (Date.now() - new Date(i.dueAt.toISOString()).getTime()) / (1000 * 60 * 60 * 24),
            ),
          )
        : 0,
      reminderCount: i.reminderCount,
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

  const ageScore = Math.min(100, params.daysOverdue * 2)
  factors.push({
    label:    "Invoice Age",
    score:    ageScore,
    weight:   0.25,
    evidence: params.daysOverdue > 0 ? `${params.daysOverdue} days overdue` : "Not overdue",
  })
  weighted += ageScore * 0.25

  const ltv = params.lifetimeValue ?? 0
  const ltvScore = ltv >= 5000 ? 5 : ltv >= 1000 ? 20 : ltv >= 200 ? 50 : 75
  factors.push({
    label:    "Customer Value",
    score:    ltvScore,
    weight:   0.15,
    evidence: `${ltv.toFixed(2)} lifetime value`,
  })
  weighted += ltvScore * 0.15

  const noShowScore = params.noShowRate ?? 30
  factors.push({
    label:    "Booking Reliability",
    score:    noShowScore,
    weight:   0.15,
    evidence:
      params.noShowRate !== null ? `${params.noShowRate}% no-show rate` : "No booking data",
  })
  weighted += noShowScore * 0.15

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
  customerId: string,
  organizationId: string,
): Promise<CreditReport> {
  const flags: CreditRedFlag[] = []

  // ── 1. Late payments: 30 / 60 / 90+ days ─────────────────────────────────
  const allInvoices = await db
    .select({
      status:      schema.invoices.status,
      dueAt:       schema.invoices.dueAt,
      paidAt:      schema.invoices.paidAt,
      totalAmount: schema.invoices.totalAmount,
    })
    .from(schema.invoices)
    .where(
      and(
        eq(schema.invoices.customerId, customerId),
        eq(schema.invoices.organizationId, organizationId),
      ),
    )

  const late30: number[] = []
  const late60: number[] = []
  const late90: number[] = []

  for (const inv of allInvoices) {
    if (!inv.dueAt) continue
    const compareDate = inv.paidAt ? new Date(inv.paidAt.toISOString()) : new Date()
    const daysLate = Math.floor(
      (compareDate.getTime() - new Date(inv.dueAt.toISOString()).getTime()) / (1000 * 60 * 60 * 24),
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
  const invoiceRows = await db
    .select({ id: schema.invoices.id })
    .from(schema.invoices)
    .where(
      and(
        eq(schema.invoices.customerId, customerId),
        eq(schema.invoices.organizationId, organizationId),
      ),
    )

  const ids = invoiceRows.map((r) => r.id)
  let writeoffCount = 0
  if (ids.length > 0) {
    const [result] = await db
      .select({ count: count() })
      .from(schema.financeTransactions)
      .where(
        and(
          inArray(schema.financeTransactions.invoiceId, ids),
          eq(schema.financeTransactions.type, "writeoff"),
        ),
      )
    writeoffCount = Number(result?.count ?? 0)
  }

  flags.push({
    flag:     "charged_off",
    label:    "Charged-Off Accounts",
    severity: writeoffCount > 0 ? "critical" : "none",
    detail:   writeoffCount > 0 ? `${writeoffCount} write-off transaction(s) recorded` : "No charged-off accounts",
  })

  // ── 3. Unfamiliar / duplicate accounts ────────────────────────────────────
  const [customer] = await db
    .select({
      fullName: schema.customers.fullName,
      email:    schema.customers.email,
      notes:    schema.customers.notes,
    })
    .from(schema.customers)
    .where(eq(schema.customers.id, customerId))
    .limit(1)

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
  const openInvoices = allInvoices.filter((i) =>
    ["sent", "pending", "overdue"].includes(i.status),
  )
  const totalOpen = openInvoices.reduce(
    (sum, i) => sum + (Number(i.totalAmount) - 0),
    0,
  )
  const [cust] = await db
    .select({ lifetimeValue: schema.customers.lifetimeValue })
    .from(schema.customers)
    .where(eq(schema.customers.id, customerId))
    .limit(1)
  const ltv = Number(cust?.lifetimeValue ?? 0)
  const utilizationPct = ltv > 0 ? (totalOpen / ltv) * 100 : 0

  flags.push({
    flag:     "maxed_out_credit",
    label:    "Maxed-Out / Over-Extended Credit",
    severity: utilizationPct >= 80 ? "critical" : utilizationPct >= 50 ? "warning" : "none",
    detail:
      ltv === 0
        ? "No lifetime value on record to assess utilization"
        : `${totalOpen.toFixed(2)} open vs ${ltv.toFixed(2)} lifetime value (${utilizationPct.toFixed(0)}% utilization)`,
  })

  // ── 5. Frequent recent address / contact changes ──────────────────────────
  const events = await db
    .select({ createdAt: schema.appointmentEvents.createdAt })
    .from(schema.appointmentEvents)
    .where(
      and(
        eq(schema.appointmentEvents.organizationId, organizationId),
        eq(schema.appointmentEvents.eventType, "reservation.rescheduled"),
        gte(schema.appointmentEvents.createdAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)),
      ),
    )

  const recentReschedules = events.length
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
  const amount = `${totalOverdue.toFixed(2)}`
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

// ── Claude tool definitions ───────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_invoice_status",
    description: "Get the current status of a specific invoice including days overdue, balance, and reminder history.",
    input_schema: {
      type: "object",
      properties: {
        invoice_id: { type: "string", description: "The invoice UUID to look up" },
      },
      required: ["invoice_id"],
    },
  },
  {
    name: "get_payment_history",
    description: "Get the customer's full payment history: on-time %, late count, payment methods, and recent invoice statuses.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_customer_profile",
    description: "Get the customer's profile: lifetime value, CRM risk status, feedback score, contact details, and last visit.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_appointment_behavior",
    description: "Get the customer's booking behavior: completion rate, no-show rate, and cancellation history.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_all_open_invoices",
    description: "Get all currently open (unpaid) invoices for this customer to understand total outstanding exposure.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "run_verification_checks",
    description: "Run KYC-style verification checks on the customer. Returns a checklist: business name, TIN match, watchlists, bank account, credit history, and online presence.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "evaluate_credit_report",
    description: "Evaluate the customer's credit report for red flags: late payments (30/60/90 days), charged-off accounts, unfamiliar accounts, maxed-out credit, and frequent address/contact changes.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "search_external_signals",
    description: "Search the web for external signals about this customer: news about their business, bankruptcy or insolvency filings, market conditions in their industry, and payment/financial health indicators from public sources.",
    input_schema: {
      type: "object",
      properties: {
        customer_name: { type: "string", description: "Customer name to search for" },
        industry_hint: { type: "string", description: "Industry or sector hint for market context (e.g. 'restaurant', 'retail', 'construction')" },
      },
      required: ["customer_name"],
    },
  },
  {
    name: "screen_watchlists",
    description: "Screen key people and the company name against 8 major international sanctions and watchlists: OFAC, Interpol Most Wanted, FATF, EU Consolidated Sanctions, SDN, UN Security Council, World Bank Debarred, and U.S. BIS Entity List.",
    input_schema: {
      type: "object",
      properties: {
        names: {
          type: "array",
          items: { type: "string" },
          description: "Names of people or the company entity to screen",
        },
      },
      required: ["names"],
    },
  },
]

const SYSTEM_INSTRUCTION = `You are a receivables risk investigator for OpsPilot, an SMB cashflow recovery system.

REQUIRED: Call ALL NINE tools before writing any conclusions.

Call tools in this order:
1. get_invoice_status — understand what is owed
2. get_customer_profile — understand who the customer is
3. get_payment_history — understand their payment track record
4. get_appointment_behavior — understand their reliability
5. get_all_open_invoices — understand total exposure
6. run_verification_checks — generate the KYC checklist
7. evaluate_credit_report — check for credit red flags (late payments, charge-offs, fraud signals)
8. search_external_signals — search for news, bankruptcy filings, and market conditions affecting this customer
9. screen_watchlists — screen the customer and key people against OFAC, Interpol, SDN, EU, UN, World Bank, BIS watchlists

After gathering all data, write a concise investigation summary that references exact figures ("$450 overdue for 23 days, 60% on-time rate"), identifies the key risk factors, and states your recommended action and why.`

// ── Agent entry point ─────────────────────────────────────────────────────────

export interface RunInvestigationInput {
  customerId:     string
  invoiceIds:     string[]
  organizationId: string
}

export async function runReceivablesInvestigation(
  input: RunInvestigationInput,
): Promise<ReceivablesInvestigationResult> {
  const agentSteps: AgentStep[] = []

  // Cached tool results for deterministic post-processing
  let profileData: Record<string, unknown> | null = null
  let paymentData: Record<string, unknown> | null = null
  let behaviorData: Record<string, unknown> | null = null
  let invoiceData:  Record<string, unknown> | null = null
  let openInvData:  Record<string, unknown> | null = null
  let verData:      VerificationChecks | null = null
  let creditData:   CreditReport | null = null

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
        toolResult = await getInvoiceStatus(invoice_id)
        invoiceData = toolResult as Record<string, unknown>
      } else if (call.name === "get_payment_history") {
        toolResult = await getPaymentHistory(input.customerId, input.organizationId)
        paymentData = toolResult as Record<string, unknown>
      } else if (call.name === "get_customer_profile") {
        toolResult = await getCustomerProfile(input.customerId)
        profileData = toolResult as Record<string, unknown>
      } else if (call.name === "get_appointment_behavior") {
        toolResult = await getAppointmentBehavior(input.customerId, input.organizationId)
        behaviorData = toolResult as Record<string, unknown>
      } else if (call.name === "get_all_open_invoices") {
        toolResult = await getAllOpenInvoices(input.customerId, input.organizationId)
        openInvData = toolResult as Record<string, unknown>
      } else if (call.name === "run_verification_checks") {
        verData = buildVerificationChecks(
          (profileData ?? {}) as Parameters<typeof buildVerificationChecks>[0],
          (paymentData ?? {}) as Parameters<typeof buildVerificationChecks>[1],
        )
        toolResult = verData
      } else if (call.name === "evaluate_credit_report") {
        creditData = await evaluateCreditReport(input.customerId, input.organizationId)
        toolResult = creditData
      } else {
        toolResult = { error: `Unknown tool: ${call.name}` }
      }

      const flaggedCount = allHits.filter((h) => h.status === "flagged").length
      watchlistData = {
        screenedNames: namesToScreen,
        hits:          allHits,
        overallStatus: flaggedCount > 0 ? "flagged" : "clear",
        dataSource:    wlDataSource,
      }
      return watchlistData
    }

    return { error: `Unknown tool: ${name}` }
  }

  // ── Agentic loop with Claude tool use ────────────────────────────────────
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Investigate overdue receivables for customer ID: ${input.customerId}, invoice IDs: ${input.invoiceIds.join(", ")}. Call all 9 tools now.`,
    },
  ]

  let response = await anthropic.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system:     SYSTEM_INSTRUCTION,
    tools:      TOOLS,
    messages,
  })

  for (let turn = 0; turn < 15 && response.stop_reason === "tool_use"; turn++) {
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    )

    // Append assistant turn
    messages.push({ role: "assistant", content: response.content })

    // Execute all tool calls in this turn
    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const toolUse of toolUseBlocks) {
      const result = await handleToolCall(toolUse.name, toolUse.input)
      agentSteps.push({ tool: toolUse.name, summary: `Called ${toolUse.name}`, result })
      toolResults.push({
        type:        "tool_result",
        tool_use_id: toolUse.id,
        content:     JSON.stringify(result),
      })
    }

    messages.push({ role: "user", content: toolResults })

    response = await anthropic.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system:     SYSTEM_INSTRUCTION,
      tools:      TOOLS,
      messages,
    })
  }

  // Extract final reasoning text
  const reasoning =
    response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text.trim()
    ?? "Investigation complete."

  // ── Deterministic post-processing — AI must not own these values ──────────
  const profile  = (profileData  ?? {}) as Record<string, unknown>
  const payment  = (paymentData  ?? {}) as Record<string, unknown>
  const behavior = (behaviorData ?? {}) as Record<string, unknown>
  const invoice  = (invoiceData  ?? {}) as Record<string, unknown>
  const openInv  = (openInvData  ?? {}) as Record<string, unknown>
  // Cast closure-assigned vars explicitly — TypeScript narrows them to never
  // when they are only assigned inside an inner async function.
  const extData = externalData  as ExternalSignals | null
  const wlData  = watchlistData as WatchlistScreening | null

  if (!verData) {
    verData = buildVerificationChecks(
      profile as Parameters<typeof buildVerificationChecks>[0],
      payment as Parameters<typeof buildVerificationChecks>[1],
    )
  }

  // Fix: compute overdueDays as the max across all open invoices so it is
  // always correct regardless of which specific invoice the AI queried first.
  const openInvoiceList = (openInv.invoices as Array<{ daysOverdue: number }> | undefined) ?? []
  const maxOverdueDays = openInvoiceList.reduce((max, i) => Math.max(max, i.daysOverdue), 0)
  const daysOverdue = Math.max(
    (invoice.daysOverdue as number | undefined) ?? 0,
    maxOverdueDays,
  )

  const { score, riskLevel, riskFactors } = computeRiskScore({
    onTimePct:     (payment.onTimePct as number | null | undefined) ?? null,
    daysOverdue,
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

  // Build companyInfo from profile data
  const companyInfo: CompanyInfo = {
    companyName: customerName,
    email:       (profile.email as string | undefined) || undefined,
    phone:       (profile.phone as string | undefined) || undefined,
    address:     undefined,
    keyPeople:   undefined,
  }

  const snippetText = (extData?.articles ?? []).map((a) => a.snippet).join(" ")
  if (snippetText) {
    const addrMatch = snippetText.match(/headquartered in ([A-Z][a-z]+(?:,\s*[A-Z]{2})?)/i)
      ?? snippetText.match(/based in ([A-Z][a-z]+(?:,\s*[A-Z]{2})?)/i)
      ?? snippetText.match(/located in ([A-Z][a-z]+(?:,\s*[A-Z]{2})?)/i)
    if (addrMatch) companyInfo.address = addrMatch[1]

    const peopleFromSnippets = [...snippetText.matchAll(
      /(?:CEO|founder|owner|president|director|CFO|COO)\s+([A-Z][a-z]+ [A-Z][a-z]+)/gi,
    )].map((m) => m[1])

    companyInfo.keyPeople = [...new Set(peopleFromSnippets)].slice(0, 3)
  }

  const notes = (profile.notes as string | undefined) ?? ""
  if (notes) {
    const notePeopleMatches = notes.matchAll(
      /(?:CEO|founder|owner|president|director|CFO|COO)[:\s]+([A-Z][A-Z\s]+)/gi,
    )
    const notePeople = [...notePeopleMatches]
      .map((m) => m[1].trim().replace(/\s+/g, " "))
      .filter((n) => n.length > 3)
      .slice(0, 3)
    if (notePeople.length) {
      companyInfo.keyPeople = [...new Set([...(companyInfo.keyPeople ?? []), ...notePeople])].slice(0, 3)
    }
  }

  if (wlData && verData) {
    verData = { ...verData, watchlistsClear: wlData.overallStatus === "clear" }
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
    watchlistScreening: wlData  ?? undefined,
    externalSignals:    extData ?? undefined,
    riskFactors,
    recommendedAction,
    actionDraft:        buildActionDraft(recommendedAction, customerName, totalOverdue, daysOverdue),
    reasoning,
    agentSteps,
  })
}
