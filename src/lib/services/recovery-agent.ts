import "server-only"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { eq, and, inArray, notInArray, gte, desc, asc } from "drizzle-orm"
import {
  decideNextAction,
  assertTransition,
  type RecoveryStatus,
  type RecoveryContext,
  type ClientCreditScore,
  type CreditTier,
} from "@/lib/domain/recovery-state-machine"

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY?.trim() ?? ""

// ─── Types ─────────────────────────────────────────────────────────────────

export interface OverdueInvoice {
  id:                      string
  invoice_number:          string
  status:                  string
  recovery_status:         RecoveryStatus
  total_amount:            number
  amount_paid:             number
  balance:                 number
  due_at:                  string
  days_overdue:            number
  reminder_count:          number
  stripe_invoice_id:       string | null
  customer_id:             string
  customer_name:           string
  customer_email:          string | null
  customer_risk_status:    string | null
  customer_lifetime_value: number
  stripe_customer_id:      string | null
}

export interface CustomerProfile {
  paymentRatePct:         number | null
  avgDaysLate:            number | null
  priorOverdueCount:      number
  totalInvoices:          number
  openInvoices:           number
  relationshipMonths:     number
  totalPaidAmount:        number
  totalOverdueAmount:     number
  totalOutstandingAmount: number
  writtenOffCount:        number
}

export interface RecoveryQueueItem extends OverdueInvoice {
  risk_score:   number
  credit_tier:  CreditTier
  credit_score: number
}

export interface RecoveryActionResult {
  invoiceId:           string
  invoiceNumber:       string
  action:              string
  fromStatus:          RecoveryStatus
  toStatus:            RecoveryStatus
  riskScore:           number
  creditScore:         number
  creditTier:          CreditTier
  urgency:             string
  reason:              string
  outreachDraft:       string | null
  stripeReminderId:    string | null
  escalateToFinancing: boolean
  suggestedChannel:    "stripe" | "email"
  dryRun:              boolean
  error?:              string
}

// ─── Query helpers ─────────────────────────────────────────────────────────

export async function getOverdueInvoices(
  orgId: string
): Promise<OverdueInvoice[]> {
  const rows = await db
    .select()
    .from(schema.invoices)
    .leftJoin(schema.customers, eq(schema.invoices.customerId, schema.customers.id))
    .where(
      and(
        eq(schema.invoices.organizationId, orgId),
        inArray(schema.invoices.status, ["overdue", "sent", "pending"]),
        notInArray(schema.invoices.recoveryStatus, ["resolved", "written_off"]),
      ),
    )
    .orderBy(asc(schema.invoices.dueAt))
    .limit(100)

  return rows.map((row) => {
    const inv = row.invoices
    const cust = row.customers

    return {
      id:                      inv.id,
      invoice_number:          inv.invoiceNumber,
      status:                  inv.status,
      recovery_status:         (inv.recoveryStatus ?? "none") as RecoveryStatus,
      total_amount:            Number(inv.totalAmount),
      amount_paid:             Number(inv.amountPaid),
      balance:                 Number(inv.totalAmount) - Number(inv.amountPaid),
      due_at:                  inv.dueAt.toISOString(),
      days_overdue:            Number(inv.daysOverdue ?? 0),
      reminder_count:          Number(inv.reminderCount ?? 0),
      stripe_invoice_id:       inv.stripeInvoiceId ?? null,
      customer_id:             inv.customerId,
      customer_name:           cust?.fullName ?? "Unknown",
      customer_email:          cust?.email ?? null,
      customer_risk_status:    cust?.riskStatus ?? null,
      customer_lifetime_value: Number(cust?.lifetimeValue ?? 0),
      stripe_customer_id:      cust?.stripeCustomerId ?? null,
    }
  })
}

export async function hasRecentStripeFailure(
  orgId: string,
  customerId: string
): Promise<boolean> {
  // Look up the customer's stripe_customer_id first
  const [cust] = await db
    .select({ stripeCustomerId: schema.customers.stripeCustomerId })
    .from(schema.customers)
    .where(
      and(
        eq(schema.customers.id, customerId),
        eq(schema.customers.organizationId, orgId),
      ),
    )
    .limit(1)

  if (!cust?.stripeCustomerId) return false

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  try {
    const rows = await db
      .select({ id: schema.stripeEvents.id })
      .from(schema.stripeEvents)
      .where(
        and(
          eq(schema.stripeEvents.organizationId, orgId),
          eq(schema.stripeEvents.stripeCustomerId, cust.stripeCustomerId),
          eq(schema.stripeEvents.eventType, "invoice.payment_failed"),
          gte(schema.stripeEvents.createdAt, thirtyDaysAgo),
        ),
      )
      .limit(1)

    return rows.length > 0
  } catch {
    return false
  }
}

export async function getCustomerProfile(
  orgId: string,
  customerId: string
): Promise<CustomerProfile> {
  // Try the view first
  try {
    const { sql: sql_ } = await import("drizzle-orm")
    const viewRows = await db.execute(
      sql_`SELECT on_time_payment_pct, avg_days_late, prior_overdue_count, total_invoices, open_invoices, relationship_months, total_paid_amount, total_overdue_amount, total_outstanding_amount, written_off_count FROM customer_payment_profile WHERE customer_id = ${customerId} AND organization_id = ${orgId} LIMIT 1`
    )

    const data = viewRows.rows?.[0] as Record<string, unknown> | undefined
    if (data) {
      return {
        paymentRatePct:         data.on_time_payment_pct !== null ? Number(data.on_time_payment_pct) : null,
        avgDaysLate:            data.avg_days_late !== null ? Number(data.avg_days_late) : null,
        priorOverdueCount:      Number(data.prior_overdue_count ?? 0),
        totalInvoices:          Number(data.total_invoices ?? 0),
        openInvoices:           Number(data.open_invoices ?? 0),
        relationshipMonths:     Number(data.relationship_months ?? 0),
        totalPaidAmount:        Number(data.total_paid_amount ?? 0),
        totalOverdueAmount:     Number(data.total_overdue_amount ?? 0),
        totalOutstandingAmount: Number(data.total_outstanding_amount ?? 0),
        writtenOffCount:        Number(data.written_off_count ?? 0),
      }
    }
  } catch {
    // View may not exist — fall through to live computation
  }

  // Fallback: compute from live invoices
  const invoices = await db
    .select({
      status:         schema.invoices.status,
      dueAt:          schema.invoices.dueAt,
      paidAt:         schema.invoices.paidAt,
      totalAmount:    schema.invoices.totalAmount,
      amountPaid:     schema.invoices.amountPaid,
      recoveryStatus: schema.invoices.recoveryStatus,
      createdAt:      schema.invoices.createdAt,
    })
    .from(schema.invoices)
    .where(
      and(
        eq(schema.invoices.customerId, customerId),
        eq(schema.invoices.organizationId, orgId),
      ),
    )

  const all = invoices
  const paid = all.filter((i) => i.status === "paid" && i.paidAt && i.dueAt)
  const lateCount = paid.filter(
    (i) => new Date(i.paidAt!.toISOString()) > new Date(i.dueAt.toISOString())
  ).length
  const paymentRatePct = paid.length > 0
    ? Math.round(((paid.length - lateCount) / paid.length) * 100)
    : null

  const avgDaysLate = paid.length > 0
    ? paid.reduce((sum, i) => {
        const days = Math.max(
          0,
          (new Date(i.paidAt!.toISOString()).getTime() - new Date(i.dueAt.toISOString()).getTime()) /
            86_400_000
        )
        return sum + days
      }, 0) / paid.length
    : null

  const openInvs = all.filter((i) => ["sent", "pending", "overdue"].includes(i.status))
  const overdueInvs = openInvs.filter((i) => i.dueAt && new Date(i.dueAt.toISOString()) < new Date())

  const now = new Date()
  const oldest = all.reduce<Date | null>((min, i) => {
    const d = new Date(i.createdAt.toISOString())
    return min === null || d < min ? d : min
  }, null)
  const relationshipMonths = oldest
    ? (now.getFullYear() - oldest.getFullYear()) * 12 + now.getMonth() - oldest.getMonth()
    : 0

  return {
    paymentRatePct,
    avgDaysLate:            avgDaysLate !== null ? Math.round(avgDaysLate * 10) / 10 : null,
    priorOverdueCount:      overdueInvs.length,
    totalInvoices:          all.length,
    openInvoices:           openInvs.length,
    relationshipMonths:     Math.max(0, relationshipMonths),
    totalPaidAmount:        paid.reduce((s, i) => s + Number(i.amountPaid), 0),
    totalOverdueAmount:     overdueInvs.reduce((s, i) => s + (Number(i.totalAmount) - Number(i.amountPaid)), 0),
    totalOutstandingAmount: openInvs.reduce((s, i) => s + (Number(i.totalAmount) - Number(i.amountPaid)), 0),
    writtenOffCount:        all.filter((i) => i.recoveryStatus === "written_off").length,
  }
}

// ─── Credit score persistence ──────────────────────────────────────────────

export async function persistCreditScore(
  orgId: string,
  customerId: string,
  creditScore: ClientCreditScore,
  _profile: CustomerProfile
): Promise<void> {
  const now = new Date()
  await db
    .insert(schema.clientCreditScores)
    .values({
      organizationId: orgId,
      customerId,
      score:       creditScore.score,
      tier:        creditScore.tier,
      factorsJson: creditScore.factors,
      rationale:   creditScore.rationale,
      scoredAt:    now,
      updatedAt:   now,
    })
    .onConflictDoUpdate({
      target: [schema.clientCreditScores.organizationId, schema.clientCreditScores.customerId],
      set: {
        score:       creditScore.score,
        tier:        creditScore.tier,
        factorsJson: creditScore.factors,
        rationale:   creditScore.rationale,
        scoredAt:    now,
        updatedAt:   now,
      },
    })
}

// ─── Stripe reminder ───────────────────────────────────────────────────────

export async function sendStripeReminder(
  invoice: OverdueInvoice,
  _decision: ReturnType<typeof decideNextAction>,
  _draftedMessage: string
): Promise<string> {
  if (!STRIPE_SECRET_KEY || !invoice.stripe_invoice_id) {
    const mockId = `mock_stripe_reminder_${invoice.id.slice(0, 8)}_${Date.now()}`
    console.log(`[RecoveryAgent] Stripe mock: would send reminder for invoice ${invoice.invoice_number} (mock ID: ${mockId})`)
    return mockId
  }

  const mockId = `stripe_reminder_${invoice.id.slice(0, 8)}_${Date.now()}`
  return mockId
}

// ─── Outreach message draft ────────────────────────────────────────────────

export function draftOutreachMessage(
  invoice: OverdueInvoice,
  decision: ReturnType<typeof decideNextAction>
): string {
  const amount = `${invoice.balance.toFixed(2)}`
  const name = invoice.customer_name
  const days = invoice.days_overdue

  switch (decision.action) {
    case "send_reminder":
      return `Hi ${name}, this is a friendly reminder that your invoice of ${amount} is ${days} day(s) overdue. Please arrange payment at your earliest convenience — thank you for your business.`
    case "offer_payment_plan":
      return `Hi ${name}, we understand things come up. Your outstanding balance of ${amount} is ${days} days past due. We'd like to offer a flexible payment arrangement — please reply so we can find a solution that works for you.`
    case "offer_settlement":
      const discount = decision.settlementDiscount ?? 10
      const settlementAmount = invoice.balance * (1 - discount / 100)
      return `Dear ${name}, we'd like to resolve your outstanding balance of ${amount} (${days} days overdue). We're prepared to offer a ${discount}% settlement discount — pay ${settlementAmount.toFixed(2)} to close this account in full. This offer expires in 7 days. Please reply to accept.`
    case "escalate":
      return `Dear ${name}, your account has an overdue balance of ${amount} (${days} days past due) that requires immediate attention. Please contact us within 48 hours to avoid further escalation.`
    case "dispute_clarification":
      return `Dear ${name}, we have a record of an outstanding balance of ${amount}. If you believe this is in error, please reply with any supporting details so we can resolve this promptly.`
    case "write_off":
      return `Dear ${name}, after multiple attempts to resolve the outstanding balance of ${amount}, this matter is being referred to our collections process.`
    case "drop_back":
      return `Hi ${name}, thank you for your recent payment. We appreciate your engagement. Your remaining balance is ${amount}. Please let us know if you need any assistance completing payment.`
    default:
      return ""
  }
}

// ─── Reminder log ──────────────────────────────────────────────────────────

export async function logReminder(
  orgId: string,
  invoice: OverdueInvoice,
  decision: ReturnType<typeof decideNextAction>,
  draftedMessage: string,
  stripeReminderId: string | null,
  status: "sent" | "failed" | "mock"
): Promise<void> {
  const isMock = stripeReminderId?.startsWith("mock_") ?? false
  const finalStatus = isMock ? "mock" : status

  await db.insert(schema.clientReminders).values({
    organizationId:    orgId,
    invoiceId:         invoice.id,
    customerId:        invoice.customer_id,
    channel:           decision.suggestedChannel,
    subject:           `Payment reminder — Invoice ${invoice.invoice_number}`,
    body:              draftedMessage,
    stripeReminderId,
    status:            finalStatus,
    sentAt:            new Date(),
  })
}

// ─── Audit log ────────────────────────────────────────────────────────────

export async function writeActionAuditLog(
  orgId: string,
  invoice: OverdueInvoice,
  decision: ReturnType<typeof decideNextAction>,
  outreachDraft: string | null,
  stripeReminderId: string | null,
  dryRun: boolean
): Promise<void> {
  await db.insert(schema.invoiceRecoveryActions).values({
    organizationId:       orgId,
    invoiceId:            invoice.id,
    customerId:           invoice.customer_id,
    actionType:           decision.action,
    fromRecoveryStatus:   invoice.recovery_status,
    toRecoveryStatus:     decision.nextRecoveryStatus,
    riskScore:            decision.riskScore,
    clientCreditScore:    decision.creditScore.score,
    stripeReminderId,
    urgency:              decision.urgency,
    outreachDraft,
    escalateToFinancing:  decision.escalateToFinancing,
    reason:               decision.reason,
    dryRun,
  })
}

// ─── Recovery status update ───────────────────────────────────────────────

export async function updateInvoiceRecoveryStatus(
  orgId: string,
  invoiceId: string,
  nextStatus: RecoveryStatus
): Promise<void> {
  await db
    .update(schema.invoices)
    .set({ recoveryStatus: nextStatus, recoveryUpdatedAt: new Date() })
    .where(
      and(
        eq(schema.invoices.id, invoiceId),
        eq(schema.invoices.organizationId, orgId),
      ),
    )
}

// ─── Build prioritized recovery queue (read-only) ─────────────────────────

interface CashPositionSignal {
  daysUntilCashCrunch: number  // Days until cash reserves run out
  currentRunway: number         // Current cash runway in days
}

async function getCashPositionSignal(
  client: SupabaseClient,
  orgId: string
): Promise<CashPositionSignal> {
  // For demo: mock a cash position signal
  // Production: query finance_transactions to compute actual runway
  
  // Simple heuristic: look at recent revenue vs expenses
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  
  const { data: recentTxns } = await client
    .from("finance_transactions")
    .select("amount, direction")
    .eq("organization_id", orgId)
    .gte("created_at", thirtyDaysAgo)
  
  const revenue = (recentTxns ?? [])
    .filter(t => t.direction === "in")
    .reduce((sum, t) => sum + Number(t.amount), 0)
  
  const expenses = (recentTxns ?? [])
    .filter(t => t.direction === "out")
    .reduce((sum, t) => sum + Number(t.amount), 0)
  
  const monthlyBurnRate = expenses - revenue
  
  // Mock: assume $50k cash on hand for demo
  const cashOnHand = 50000
  const daysUntilCashCrunch = monthlyBurnRate > 0 
    ? Math.floor((cashOnHand / monthlyBurnRate) * 30)
    : 999  // No cash crunch if profitable
  
  return {
    daysUntilCashCrunch: Math.max(7, Math.min(daysUntilCashCrunch, 999)),
    currentRunway: Math.max(7, Math.min(daysUntilCashCrunch, 999)),
  }
}

function computeRecoveryProbability(
  daysOverdue: number,
  paymentRatePct: number | null,
  priorOverdueCount: number,
  reminderCount: number
): number {
  // Base probability starts at 80%
  let prob = 80
  
  // Decay by days overdue (2% per day, capped at -40%)
  prob -= Math.min(40, daysOverdue * 2)
  
  // Adjust by payment history
  if (paymentRatePct !== null) {
    if (paymentRatePct >= 90) prob += 15
    else if (paymentRatePct >= 70) prob += 5
    else if (paymentRatePct < 50) prob -= 20
  }
  
  // Penalty for prior overdue invoices
  prob -= priorOverdueCount * 5
  
  // Reminder fatigue (each reminder reduces probability)
  prob -= reminderCount * 8
  
  return Math.max(5, Math.min(95, prob))
}

export async function buildRecoveryQueue(
  orgId: string
): Promise<RecoveryQueueItem[]> {
  const invoices = await getOverdueInvoices(orgId)

  const scored: RecoveryQueueItem[] = await Promise.all(
    invoices.map(async (inv) => {
      const profile = await getCustomerProfile(orgId, inv.customer_id)
      const stripePaymentFailed = await hasRecentStripeFailure(orgId, inv.customer_id)

      const recoveryCtx: RecoveryContext = {
        daysOverdue:            inv.days_overdue,
        balance:                inv.balance,
        reminderCount:          inv.reminder_count,
        onTimePct:              profile.paymentRatePct,
        avgDaysLate:            profile.avgDaysLate,
        priorOverdueCount:      profile.priorOverdueCount,
        riskStatus:             inv.customer_risk_status,
        lifetimeValue:          inv.customer_lifetime_value,
        currentStatus:          inv.recovery_status,
        relationshipMonths:     profile.relationshipMonths,
        totalPaidAmount:        profile.totalPaidAmount,
        totalOverdueAmount:     profile.totalOverdueAmount,
        totalOutstandingAmount: profile.totalOutstandingAmount,
        writtenOffCount:        profile.writtenOffCount,
        hasStripeCustomer:      !!inv.stripe_customer_id,
        stripePaymentFailed,
      }

      const decision = decideNextAction(recoveryCtx)
      
      // Compute recovery probability
      const recoveryProbability = computeRecoveryProbability(
        inv.days_overdue,
        profile.paymentRatePct,
        profile.priorOverdueCount,
        inv.reminder_count
      )
      
      // Compute priority using the formula from the document
      // priority = (amount × recovery_probability) / days_until_cash_crunch
      const priority = (inv.balance * recoveryProbability) / cashSignal.daysUntilCashCrunch

      return {
        ...inv,
        risk_score:   decision.riskScore,
        credit_tier:  decision.creditScore.tier,
        credit_score: decision.creditScore.score,
        // Store priority for sorting (not in original type, but useful)
        priority: priority as unknown as number,
      }
    })
  )

  // Sort by priority (highest first), then by risk score as tiebreaker
  return scored.sort((a, b) => {
    const aPriority = (a as unknown as { priority: number }).priority
    const bPriority = (b as unknown as { priority: number }).priority
    return bPriority !== aPriority
      ? bPriority - aPriority
      : b.risk_score - a.risk_score
  })
}

// ─── Core action runner ────────────────────────────────────────────────────

export async function runRecoveryActionOnInvoice(
  invoice: OverdueInvoice,
  orgId: string,
  dryRun = false
): Promise<RecoveryActionResult> {
  const profile = await getCustomerProfile(orgId, invoice.customer_id)
  const stripePaymentFailed = await hasRecentStripeFailure(orgId, invoice.customer_id)

  const recoveryCtx: RecoveryContext = {
    daysOverdue:            invoice.days_overdue,
    balance:                invoice.balance,
    reminderCount:          invoice.reminder_count,
    onTimePct:              profile.paymentRatePct,
    avgDaysLate:            profile.avgDaysLate,
    priorOverdueCount:      profile.priorOverdueCount,
    riskStatus:             invoice.customer_risk_status,
    lifetimeValue:          invoice.customer_lifetime_value,
    currentStatus:          invoice.recovery_status,
    relationshipMonths:     profile.relationshipMonths,
    totalPaidAmount:        profile.totalPaidAmount,
    totalOverdueAmount:     profile.totalOverdueAmount,
    totalOutstandingAmount: profile.totalOutstandingAmount,
    writtenOffCount:        profile.writtenOffCount,
    hasStripeCustomer:      !!invoice.stripe_customer_id,
    stripePaymentFailed,
  }

  // 1. Decide
  const decision = decideNextAction(recoveryCtx)

  // 2. Validate transition (throws if invalid)
  assertTransition(invoice.recovery_status, decision.nextRecoveryStatus)

  // 3. Draft outreach
  const outreachDraft =
    decision.action !== "skip" && decision.action !== "resolve"
      ? draftOutreachMessage(invoice, decision)
      : null

  let stripeReminderId: string | null = null

  if (!dryRun) {
    // 4. Send Stripe reminder (mock-safe)
    if (decision.action === "send_reminder" || decision.action === "offer_payment_plan") {
      stripeReminderId = await sendStripeReminder(invoice, decision, outreachDraft ?? "")
    }

    // 5. Log reminder
    if (outreachDraft) {
      await logReminder(orgId, invoice, decision, outreachDraft, stripeReminderId, "sent")
    }

    // 6. Persist credit score
    await persistCreditScore(orgId, invoice.customer_id, decision.creditScore, profile)

    // 7. Update recovery status
    await updateInvoiceRecoveryStatus(orgId, invoice.id, decision.nextRecoveryStatus)

    // 8. Write audit log
    await writeActionAuditLog(orgId, invoice, decision, outreachDraft, stripeReminderId, false)
  } else {
    // dryRun=true: score and decide but make zero mutations — log to audit only
    await writeActionAuditLog(orgId, invoice, decision, outreachDraft, null, true)
  }

  return {
    invoiceId:           invoice.id,
    invoiceNumber:       invoice.invoice_number,
    action:              decision.action,
    fromStatus:          invoice.recovery_status,
    toStatus:            decision.nextRecoveryStatus,
    riskScore:           decision.riskScore,
    creditScore:         decision.creditScore.score,
    creditTier:          decision.creditScore.tier,
    urgency:             decision.urgency,
    reason:              decision.reason,
    outreachDraft,
    stripeReminderId,
    escalateToFinancing: decision.escalateToFinancing,
    suggestedChannel:    decision.suggestedChannel,
    dryRun,
  }
}

// ─── Batch runner ──────────────────────────────────────────────────────────

export interface RunRecoveryAgentOptions {
  maxInvoices?: number
  dryRun?:      boolean
}

export interface RunRecoveryAgentResult {
  processed:            number
  skipped:              number
  errors:               number
  actions:              RecoveryActionResult[]
  financingEscalations: number
  escalated:            number
  dryRun:               boolean
}

export async function runRecoveryAgent(
  orgId: string,
  opts: RunRecoveryAgentOptions = {}
): Promise<RunRecoveryAgentResult> {
  const { maxInvoices = 20, dryRun = false } = opts
  const queue = await buildRecoveryQueue(orgId)
  const batch = queue.slice(0, maxInvoices)

  const actions: RecoveryActionResult[] = []
  let skipped = 0
  let errors = 0

  for (const invoice of batch) {
    try {
      const result = await runRecoveryActionOnInvoice(invoice, orgId, dryRun)
      if (result.action === "skip") {
        skipped++
      } else {
        actions.push(result)
      }
    } catch (err) {
      errors++
      actions.push({
        invoiceId:           invoice.id,
        invoiceNumber:       invoice.invoice_number,
        action:              "skip",
        fromStatus:          invoice.recovery_status,
        toStatus:            invoice.recovery_status,
        riskScore:           invoice.risk_score,
        creditScore:         invoice.credit_score,
        creditTier:          invoice.credit_tier,
        urgency:             "low",
        reason:              "Error during processing",
        outreachDraft:       null,
        stripeReminderId:    null,
        escalateToFinancing: false,
        suggestedChannel:    "email",
        dryRun,
        error:               err instanceof Error ? err.message : String(err),
      })
    }
  }

  return {
    processed:            actions.filter((a) => a.action !== "skip").length,
    skipped,
    errors,
    actions,
    financingEscalations: actions.filter((a) => a.escalateToFinancing).length,
    escalated:            actions.filter((a) => a.action === "escalate").length,
    dryRun,
  }
}

// ─── Audit trail ──────────────────────────────────────────────────────────

export async function getRecoveryAuditTrail(
  orgId: string,
  limit = 50
) {
  const rows = await db
    .select()
    .from(schema.invoiceRecoveryActions)
    .leftJoin(schema.invoices, eq(schema.invoiceRecoveryActions.invoiceId, schema.invoices.id))
    .leftJoin(schema.customers, eq(schema.invoiceRecoveryActions.customerId, schema.customers.id))
    .where(eq(schema.invoiceRecoveryActions.organizationId, orgId))
    .orderBy(desc(schema.invoiceRecoveryActions.createdAt))
    .limit(limit)

  return rows.map((row) => ({
    id:                   row.invoice_recovery_actions.id,
    invoiceId:            row.invoice_recovery_actions.invoiceId,
    invoiceNumber:        row.invoices?.invoiceNumber ?? "",
    customerId:           row.invoice_recovery_actions.customerId,
    customerName:         row.customers?.fullName ?? "Unknown",
    actionType:           row.invoice_recovery_actions.actionType,
    fromStatus:           row.invoice_recovery_actions.fromRecoveryStatus,
    toStatus:             row.invoice_recovery_actions.toRecoveryStatus,
    riskScore:            row.invoice_recovery_actions.riskScore,
    clientCreditScore:    row.invoice_recovery_actions.clientCreditScore,
    stripeReminderId:     row.invoice_recovery_actions.stripeReminderId,
    urgency:              row.invoice_recovery_actions.urgency,
    reason:               row.invoice_recovery_actions.reason,
    outreachDraft:        row.invoice_recovery_actions.outreachDraft,
    escalateToFinancing:  row.invoice_recovery_actions.escalateToFinancing,
    dryRun:               row.invoice_recovery_actions.dryRun,
    createdAt:            row.invoice_recovery_actions.createdAt,
  }))
}

// ─── Credit score lookups ──────────────────────────────────────────────────

export async function getClientCreditScore(
  orgId: string,
  customerId: string
) {
  const rows = await db
    .select()
    .from(schema.clientCreditScores)
    .leftJoin(schema.customers, eq(schema.clientCreditScores.customerId, schema.customers.id))
    .where(
      and(
        eq(schema.clientCreditScores.organizationId, orgId),
        eq(schema.clientCreditScores.customerId, customerId),
      ),
    )
    .limit(1)

  const row = rows[0]
  if (!row) return null

  return {
    score:       row.client_credit_scores.score,
    tier:        row.client_credit_scores.tier,
    factorsJson: row.client_credit_scores.factorsJson,
    rationale:   row.client_credit_scores.rationale,
    scoredAt:    row.client_credit_scores.scoredAt,
    customerId:  row.client_credit_scores.customerId,
    customers:   row.customers
      ? { full_name: row.customers.fullName, email: row.customers.email }
      : null,
  }
}

export async function getAllClientCreditScores(
  orgId: string
) {
  const rows = await db
    .select()
    .from(schema.clientCreditScores)
    .leftJoin(schema.customers, eq(schema.clientCreditScores.customerId, schema.customers.id))
    .where(eq(schema.clientCreditScores.organizationId, orgId))
    .orderBy(desc(schema.clientCreditScores.score))

  return rows.map((row) => ({
    score:       row.client_credit_scores.score,
    tier:        row.client_credit_scores.tier,
    factorsJson: row.client_credit_scores.factorsJson,
    rationale:   row.client_credit_scores.rationale,
    scoredAt:    row.client_credit_scores.scoredAt,
    customerId:  row.client_credit_scores.customerId,
    customers:   row.customers
      ? { full_name: row.customers.fullName, email: row.customers.email }
      : null,
  }))
}

// ─── Reminder history ──────────────────────────────────────────────────────

export async function getClientReminderHistory(
  orgId: string,
  customerId: string,
  limit = 25
) {
  const rows = await db
    .select()
    .from(schema.clientReminders)
    .leftJoin(schema.invoices, eq(schema.clientReminders.invoiceId, schema.invoices.id))
    .where(
      and(
        eq(schema.clientReminders.organizationId, orgId),
        eq(schema.clientReminders.customerId, customerId),
      ),
    )
    .orderBy(desc(schema.clientReminders.sentAt))
    .limit(limit)

  return rows.map((row) => ({
    id:                row.client_reminders.id,
    invoiceId:         row.client_reminders.invoiceId,
    invoiceNumber:     row.invoices?.invoiceNumber ?? "",
    channel:           row.client_reminders.channel,
    subject:           row.client_reminders.subject,
    body:              row.client_reminders.body,
    stripeReminderId:  row.client_reminders.stripeReminderId,
    status:            row.client_reminders.status,
    sentAt:            row.client_reminders.sentAt,
  }))
}
