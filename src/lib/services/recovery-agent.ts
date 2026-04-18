import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
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
  client: SupabaseClient,
  orgId: string
): Promise<OverdueInvoice[]> {
  const { data, error } = await client
    .from("invoices")
    .select(
      "id, invoice_number, status, recovery_status, total_amount, amount_paid, due_at, days_overdue, reminder_count, stripe_invoice_id, customer_id, customers ( full_name, email, risk_status, lifetime_value, stripe_customer_id )"
    )
    .eq("organization_id", orgId)
    .in("status", ["overdue", "sent", "pending"])
    .not("recovery_status", "in", '("resolved","written_off")')
    .order("due_at", { ascending: true })
    .limit(100)

  if (error) throw new Error(error.message)

  return (data ?? []).map((inv) => {
    const cust = (inv.customers as unknown) as {
      full_name:          string
      email:              string | null
      risk_status:        string | null
      lifetime_value:     number | null
      stripe_customer_id: string | null
    } | null

    return {
      id:                      inv.id as string,
      invoice_number:          inv.invoice_number as string,
      status:                  inv.status as string,
      recovery_status:         (inv.recovery_status ?? "none") as RecoveryStatus,
      total_amount:            Number(inv.total_amount),
      amount_paid:             Number(inv.amount_paid),
      balance:                 Number(inv.total_amount) - Number(inv.amount_paid),
      due_at:                  inv.due_at as string,
      days_overdue:            Number(inv.days_overdue ?? 0),
      reminder_count:          Number(inv.reminder_count ?? 0),
      stripe_invoice_id:       (inv.stripe_invoice_id as string | null) ?? null,
      customer_id:             inv.customer_id as string,
      customer_name:           cust?.full_name ?? "Unknown",
      customer_email:          cust?.email ?? null,
      customer_risk_status:    cust?.risk_status ?? null,
      customer_lifetime_value: Number(cust?.lifetime_value ?? 0),
      stripe_customer_id:      cust?.stripe_customer_id ?? null,
    }
  })
}

export async function hasRecentStripeFailure(
  client: SupabaseClient,
  orgId: string,
  customerId: string
): Promise<boolean> {
  // Look up the customer's stripe_customer_id first
  const { data: cust } = await client
    .from("customers")
    .select("stripe_customer_id")
    .eq("id", customerId)
    .eq("organization_id", orgId)
    .maybeSingle()

  if (!cust?.stripe_customer_id) return false

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await client
    .from("stripe_events")
    .select("id")
    .eq("organization_id", orgId)
    .eq("stripe_customer_id", cust.stripe_customer_id)
    .eq("event_type", "invoice.payment_failed")
    .gte("created_at", thirtyDaysAgo)
    .limit(1)

  if (error) return false
  return (data?.length ?? 0) > 0
}

export async function getCustomerProfile(
  client: SupabaseClient,
  orgId: string,
  customerId: string
): Promise<CustomerProfile> {
  const { data, error } = await client
    .from("customer_payment_profile")
    .select(
      "on_time_payment_pct, avg_days_late, prior_overdue_count, total_invoices, open_invoices, relationship_months, total_paid_amount, total_overdue_amount, total_outstanding_amount, written_off_count"
    )
    .eq("customer_id", customerId)
    .eq("organization_id", orgId)
    .maybeSingle()

  if (!error && data) {
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

  // Fallback: compute from live invoices
  const { data: invoices } = await client
    .from("invoices")
    .select("status, due_at, paid_at, total_amount, amount_paid, recovery_status, created_at")
    .eq("customer_id", customerId)
    .eq("organization_id", orgId)

  const all = invoices ?? []
  const paid = all.filter((i) => i.status === "paid" && i.paid_at && i.due_at)
  const lateCount = paid.filter(
    (i) => new Date(i.paid_at as string) > new Date(i.due_at as string)
  ).length
  const paymentRatePct = paid.length > 0
    ? Math.round(((paid.length - lateCount) / paid.length) * 100)
    : null

  const avgDaysLate = paid.length > 0
    ? paid.reduce((sum, i) => {
        const days = Math.max(
          0,
          (new Date(i.paid_at as string).getTime() - new Date(i.due_at as string).getTime()) /
            86_400_000
        )
        return sum + days
      }, 0) / paid.length
    : null

  const openInvs = all.filter((i) => ["sent", "pending", "overdue"].includes(i.status))
  const overdueInvs = openInvs.filter((i) => i.due_at && new Date(i.due_at as string) < new Date())

  const now = new Date()
  const oldest = all.reduce<Date | null>((min, i) => {
    const d = new Date(i.created_at as string)
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
    totalPaidAmount:        paid.reduce((s, i) => s + Number(i.amount_paid), 0),
    totalOverdueAmount:     overdueInvs.reduce((s, i) => s + (Number(i.total_amount) - Number(i.amount_paid)), 0),
    totalOutstandingAmount: openInvs.reduce((s, i) => s + (Number(i.total_amount) - Number(i.amount_paid)), 0),
    writtenOffCount:        all.filter((i) => i.recovery_status === "written_off").length,
  }
}

// ─── Credit score persistence ──────────────────────────────────────────────

export async function persistCreditScore(
  client: SupabaseClient,
  orgId: string,
  customerId: string,
  creditScore: ClientCreditScore,
  _profile: CustomerProfile
): Promise<void> {
  const now = new Date().toISOString()
  await client.from("client_credit_scores").upsert(
    {
      organization_id: orgId,
      customer_id:     customerId,
      score:           creditScore.score,
      tier:            creditScore.tier,
      factors_json:    creditScore.factors,
      rationale:       creditScore.rationale,
      scored_at:       now,
      updated_at:      now,
    },
    { onConflict: "organization_id,customer_id" }
  )
}

// ─── Stripe reminder ───────────────────────────────────────────────────────

export async function sendStripeReminder(
  invoice: OverdueInvoice,
  _decision: ReturnType<typeof decideNextAction>,
  _draftedMessage: string
): Promise<string> {
  if (!STRIPE_SECRET_KEY || !invoice.stripe_invoice_id) {
    // Mock path — no Stripe credentials or no linked Stripe invoice
    const mockId = `mock_stripe_reminder_${invoice.id.slice(0, 8)}_${Date.now()}`
    console.log(`[RecoveryAgent] Stripe mock: would send reminder for invoice ${invoice.invoice_number} (mock ID: ${mockId})`)
    return mockId
  }

  /*
   * Live Stripe implementation (Person 3 wires this up):
   *
   * // Stripe hook: Person 3 replaces this with live stripe.invoices.sendInvoice() call
   *
   * import Stripe from "stripe"
   * const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" })
   * const result = await stripe.invoices.sendInvoice(invoice.stripe_invoice_id)
   * return result.id
   */

  const mockId = `stripe_reminder_${invoice.id.slice(0, 8)}_${Date.now()}`
  return mockId
}

// ─── Outreach message draft ────────────────────────────────────────────────

export function draftOutreachMessage(
  invoice: OverdueInvoice,
  decision: ReturnType<typeof decideNextAction>
): string {
  // TinyFish hook: replace with TinyFish browser/email task.
  // Write returned tinyfishTaskId into audit log payload.
  const amount = `$${invoice.balance.toFixed(2)}`
  const name = invoice.customer_name
  const days = invoice.days_overdue

  switch (decision.action) {
    case "send_reminder":
      return `Hi ${name}, this is a friendly reminder that your invoice of ${amount} is ${days} day(s) overdue. Please arrange payment at your earliest convenience — thank you for your business.`
    case "offer_payment_plan":
      return `Hi ${name}, we understand things come up. Your outstanding balance of ${amount} is ${days} days past due. We'd like to offer a flexible payment arrangement — please reply so we can find a solution that works for you.`
    case "escalate":
      return `Dear ${name}, your account has an overdue balance of ${amount} (${days} days past due) that requires immediate attention. Please contact us within 48 hours to avoid further escalation.`
    case "dispute_clarification":
      return `Dear ${name}, we have a record of an outstanding balance of ${amount}. If you believe this is in error, please reply with any supporting details so we can resolve this promptly.`
    case "write_off":
      return `Dear ${name}, after multiple attempts to resolve the outstanding balance of ${amount}, this matter is being referred to our collections process.`
    default:
      return ""
  }
}

// ─── Reminder log ──────────────────────────────────────────────────────────

export async function logReminder(
  client: SupabaseClient,
  orgId: string,
  invoice: OverdueInvoice,
  decision: ReturnType<typeof decideNextAction>,
  draftedMessage: string,
  stripeReminderId: string | null,
  status: "sent" | "failed" | "mock"
): Promise<void> {
  const isMock = stripeReminderId?.startsWith("mock_") ?? false
  const finalStatus = isMock ? "mock" : status

  await client.from("client_reminders").insert({
    organization_id:    orgId,
    invoice_id:         invoice.id,
    customer_id:        invoice.customer_id,
    channel:            decision.suggestedChannel,
    subject:            `Payment reminder — Invoice ${invoice.invoice_number}`,
    body:               draftedMessage,
    stripe_reminder_id: stripeReminderId,
    status:             finalStatus,
    sent_at:            new Date().toISOString(),
  })
}

// ─── Audit log ────────────────────────────────────────────────────────────

export async function writeActionAuditLog(
  client: SupabaseClient,
  orgId: string,
  invoice: OverdueInvoice,
  decision: ReturnType<typeof decideNextAction>,
  outreachDraft: string | null,
  stripeReminderId: string | null,
  dryRun: boolean
): Promise<void> {
  await client.from("invoice_recovery_actions").insert({
    organization_id:       orgId,
    invoice_id:            invoice.id,
    customer_id:           invoice.customer_id,
    action_type:           decision.action,
    from_recovery_status:  invoice.recovery_status,
    to_recovery_status:    decision.nextRecoveryStatus,
    risk_score:            decision.riskScore,
    client_credit_score:   decision.creditScore.score,
    stripe_reminder_id:    stripeReminderId,
    urgency:               decision.urgency,
    outreach_draft:        outreachDraft,
    escalate_to_financing: decision.escalateToFinancing,
    reason:                decision.reason,
    dry_run:               dryRun,
  })
}

// ─── Recovery status update ───────────────────────────────────────────────
// Only ever writes recovery_status and recovery_updated_at. Never touches invoices.status.

export async function updateInvoiceRecoveryStatus(
  client: SupabaseClient,
  orgId: string,
  invoiceId: string,
  nextStatus: RecoveryStatus
): Promise<void> {
  const { error } = await client
    .from("invoices")
    .update({ recovery_status: nextStatus, recovery_updated_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .eq("organization_id", orgId)

  if (error) throw new Error(`Failed to update recovery status: ${error.message}`)
}

// ─── Build prioritized recovery queue (read-only) ─────────────────────────

export async function buildRecoveryQueue(
  client: SupabaseClient,
  orgId: string
): Promise<RecoveryQueueItem[]> {
  const invoices = await getOverdueInvoices(client, orgId)

  const scored: RecoveryQueueItem[] = await Promise.all(
    invoices.map(async (inv) => {
      const profile = await getCustomerProfile(client, orgId, inv.customer_id)
      const stripePaymentFailed = await hasRecentStripeFailure(client, orgId, inv.customer_id)

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

      return {
        ...inv,
        risk_score:   decision.riskScore,
        credit_tier:  decision.creditScore.tier,
        credit_score: decision.creditScore.score,
      }
    })
  )

  return scored.sort((a, b) =>
    b.risk_score !== a.risk_score
      ? b.risk_score - a.risk_score
      : b.days_overdue - a.days_overdue
  )
}

// ─── Core action runner ────────────────────────────────────────────────────

export async function runRecoveryActionOnInvoice(
  invoice: OverdueInvoice,
  orgId: string,
  client: SupabaseClient,
  dryRun = false
): Promise<RecoveryActionResult> {
  const profile = await getCustomerProfile(client, orgId, invoice.customer_id)
  const stripePaymentFailed = await hasRecentStripeFailure(client, orgId, invoice.customer_id)

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
      await logReminder(client, orgId, invoice, decision, outreachDraft, stripeReminderId, "sent")
    }

    // 6. Persist credit score
    await persistCreditScore(client, orgId, invoice.customer_id, decision.creditScore, profile)

    // 7. Update recovery status
    await updateInvoiceRecoveryStatus(client, orgId, invoice.id, decision.nextRecoveryStatus)

    // 8. Write audit log
    await writeActionAuditLog(client, orgId, invoice, decision, outreachDraft, stripeReminderId, false)
  } else {
    // dryRun=true: score and decide but make zero mutations — log to audit only
    await writeActionAuditLog(client, orgId, invoice, decision, outreachDraft, null, true)
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
  client: SupabaseClient,
  orgId: string,
  opts: RunRecoveryAgentOptions = {}
): Promise<RunRecoveryAgentResult> {
  const { maxInvoices = 20, dryRun = false } = opts
  const queue = await buildRecoveryQueue(client, orgId)
  const batch = queue.slice(0, maxInvoices)

  const actions: RecoveryActionResult[] = []
  let skipped = 0
  let errors = 0

  for (const invoice of batch) {
    try {
      const result = await runRecoveryActionOnInvoice(invoice, orgId, client, dryRun)
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
  client: SupabaseClient,
  orgId: string,
  limit = 50
) {
  const { data, error } = await client
    .from("invoice_recovery_actions")
    .select(
      "id, invoice_id, customer_id, action_type, from_recovery_status, to_recovery_status, risk_score, client_credit_score, stripe_reminder_id, urgency, reason, outreach_draft, escalate_to_financing, dry_run, created_at, invoices ( invoice_number ), customers ( full_name )"
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    id:                   row.id,
    invoiceId:            row.invoice_id,
    invoiceNumber:        (row.invoices as unknown as { invoice_number: string } | null)?.invoice_number ?? "",
    customerId:           row.customer_id,
    customerName:         (row.customers as unknown as { full_name: string } | null)?.full_name ?? "Unknown",
    actionType:           row.action_type,
    fromStatus:           row.from_recovery_status,
    toStatus:             row.to_recovery_status,
    riskScore:            row.risk_score,
    clientCreditScore:    row.client_credit_score,
    stripeReminderId:     row.stripe_reminder_id,
    urgency:              row.urgency,
    reason:               row.reason,
    outreachDraft:        row.outreach_draft,
    escalateToFinancing:  row.escalate_to_financing,
    dryRun:               row.dry_run,
    createdAt:            row.created_at,
  }))
}

// ─── Credit score lookups ──────────────────────────────────────────────────

export async function getClientCreditScore(
  client: SupabaseClient,
  orgId: string,
  customerId: string
) {
  const { data, error } = await client
    .from("client_credit_scores")
    .select("score, tier, factors_json, rationale, scored_at, customer_id, customers ( full_name, email )")
    .eq("organization_id", orgId)
    .eq("customer_id", customerId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ?? null
}

export async function getAllClientCreditScores(
  client: SupabaseClient,
  orgId: string
) {
  const { data, error } = await client
    .from("client_credit_scores")
    .select("score, tier, factors_json, rationale, scored_at, customer_id, customers ( full_name, email )")
    .eq("organization_id", orgId)
    .order("score", { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

// ─── Reminder history ──────────────────────────────────────────────────────

export async function getClientReminderHistory(
  client: SupabaseClient,
  orgId: string,
  customerId: string,
  limit = 25
) {
  const { data, error } = await client
    .from("client_reminders")
    .select("id, invoice_id, channel, subject, body, stripe_reminder_id, status, sent_at, invoices ( invoice_number )")
    .eq("organization_id", orgId)
    .eq("customer_id", customerId)
    .order("sent_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    id:                row.id,
    invoiceId:         row.invoice_id,
    invoiceNumber:     (row.invoices as unknown as { invoice_number: string } | null)?.invoice_number ?? "",
    channel:           row.channel,
    subject:           row.subject,
    body:              row.body,
    stripeReminderId:  row.stripe_reminder_id,
    status:            row.status,
    sentAt:            row.sent_at,
  }))
}
