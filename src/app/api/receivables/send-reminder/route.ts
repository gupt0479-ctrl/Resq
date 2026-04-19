import { NextRequest, NextResponse } from "next/server"
import { db, DEMO_ORG_ID } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { eq, and, gte, inArray } from "drizzle-orm"
import { syncStripeCustomer, createStripeInvoice } from "@/lib/services/stripe-helper"
import { recordAiAction } from "@/lib/services/ai-actions"
import { sendOutreachEmail } from "@/lib/services/email-sender"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as {
      invoiceId:        string
      organizationId?:  string
      bypassGuardrails?: boolean
      channel?:         string
      tone?:            string
      outreachDraft?:   string
      customerEmail?:   string
    }
    const orgId = body.organizationId ?? DEMO_ORG_ID

    if (!body.invoiceId) {
      return NextResponse.json({ ok: false, error: "invoiceId is required" }, { status: 400 })
    }

    // Load invoice + customer
    const [invRow] = await db
      .select({
        id:            schema.invoices.id,
        invoiceNumber: schema.invoices.invoiceNumber,
        totalAmount:   schema.invoices.totalAmount,
        amountPaid:    schema.invoices.amountPaid,
        dueAt:         schema.invoices.dueAt,
        reminderCount: schema.invoices.reminderCount,
        customerId:    schema.invoices.customerId,
        fullName:      schema.customers.fullName,
        email:         schema.customers.email,
        notes:         schema.customers.notes,
      })
      .from(schema.invoices)
      .leftJoin(schema.customers, eq(schema.invoices.customerId, schema.customers.id))
      .where(
        and(
          eq(schema.invoices.id, body.invoiceId),
          eq(schema.invoices.organizationId, orgId),
        )
      )
      .limit(1)

    if (!invRow) {
      return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 })
    }

    const customerName  = invRow.fullName ?? "Customer"
    const customerEmail = body.customerEmail ?? invRow.email ?? `noreply+${body.invoiceId}@resq.app`
    const balance       = Number(invRow.totalAmount) - Number(invRow.amountPaid)

    // Legal guardrails
    if (!body.bypassGuardrails) {
      const oneDayAgo  = new Date(Date.now() - 86_400_000)
      const oneWeekAgo = new Date(Date.now() - 7 * 86_400_000)

      const recentActions = await db
        .select({ createdAt: schema.aiActions.createdAt })
        .from(schema.aiActions)
        .where(
          and(
            eq(schema.aiActions.organizationId, orgId),
            eq(schema.aiActions.entityId, body.invoiceId),
            inArray(schema.aiActions.actionType, ["customer_followup_sent", "payment_plan_suggested", "dispute_clarification_sent"]),
            gte(schema.aiActions.createdAt, oneWeekAgo),
          )
        )

      const actionsToday    = recentActions.filter((a) => a.createdAt! >= oneDayAgo).length
      const actionsThisWeek = recentActions.length

      if (actionsToday >= 1) {
        return NextResponse.json({ ok: false, error: "Contact frequency limit: Already contacted this customer today (max 1/day)" }, { status: 429 })
      }
      if (actionsThisWeek >= 3) {
        return NextResponse.json({ ok: false, error: "Contact frequency limit: Already contacted 3 times this week (max 3/week)" }, { status: 429 })
      }

      const hour = new Date().getHours()
      if (hour < 8 || hour >= 21) {
        return NextResponse.json({ ok: false, error: `Time restriction: Cannot contact outside 8am-9pm (current hour: ${hour})` }, { status: 403 })
      }

      const notes = (invRow.notes ?? "").toLowerCase()
      if (notes.includes("do not contact") || notes.includes("dnc")) {
        return NextResponse.json({ ok: false, error: "Customer is on do-not-contact list" }, { status: 403 })
      }

      if (balance > 5000) {
        return NextResponse.json({ ok: false, error: `High-value invoice (${balance.toFixed(0)} > $5,000) requires human approval before sending`, requiresApproval: true }, { status: 403 })
      }
    }

    const channel = body.channel ?? "stripe"
    const tone    = body.tone    ?? "firm"

    // ── Phone ──────────────────────────────────────────────────────────────────
    if (channel === "phone") {
      await recordAiAction({
        organizationId: orgId,
        entityType:     "invoice",
        entityId:       body.invoiceId,
        triggerType:    "manual",
        actionType:     "customer_followup_sent",
        inputSummary:   `${customerName} · $${balance.toFixed(2)} · phone follow-up logged`,
        outputPayload:  { channel: "phone", tone, phoneFollowUpRequired: true },
        status:         "executed",
      })
      return NextResponse.json({ ok: true, channel: "phone", tone, phoneFollowUpRequired: true, mode: "mock" })
    }

    // ── Email / formal_notice ──────────────────────────────────────────────────
    if (channel === "email" || channel === "formal_notice") {
      const effectiveTone = channel === "formal_notice" ? "formal" : tone
      const draft = body.outreachDraft
        ?? `Hi ${customerName},\n\nThis is a reminder about your overdue invoice of $${balance.toFixed(2)} (${invRow.invoiceNumber}). Please contact us to arrange payment.\n\nBest regards,\nResq`

      const { sent, messageId, mode } = await sendOutreachEmail({
        toEmail: customerEmail,
        toName:  customerName,
        body:    draft,
        tone:    effectiveTone,
      })

      await db
        .update(schema.invoices)
        .set({ reminderCount: (Number(invRow.reminderCount) || 0) + 1 })
        .where(eq(schema.invoices.id, body.invoiceId))

      await recordAiAction({
        organizationId: orgId,
        entityType:     "invoice",
        entityId:       body.invoiceId,
        triggerType:    "manual",
        actionType:     "customer_followup_sent",
        inputSummary:   `${customerName} · $${balance.toFixed(2)} · ${channel} (${effectiveTone})`,
        outputPayload:  { channel, tone: effectiveTone, messageId, sent, mode },
        status:         "executed",
      })

      return NextResponse.json({ ok: true, channel, tone: effectiveTone, emailSent: sent, messageId, mode })
    }

    // ── Stripe (default) ───────────────────────────────────────────────────────
    const { customerId: stripeCustomerId } = await syncStripeCustomer({
      email:    customerEmail,
      name:     customerName,
      metadata: { organizationId: orgId, invoiceId: body.invoiceId },
    })

    const dueDate           = invRow.dueAt ?? undefined
    const stripeDescription = body.outreachDraft
      ? body.outreachDraft.slice(0, 500).replace(/\n+/g, " ")
      : `Payment reminder — Invoice ${invRow.invoiceNumber} ($${balance.toFixed(2)} overdue)`

    const { success, invoiceId: stripeInvoiceId, hostedUrl, emailSent, mode, errorMessage } = await createStripeInvoice(
      stripeCustomerId,
      balance,
      stripeDescription,
      dueDate,
    )

    if (!success) {
      return NextResponse.json({ ok: false, error: errorMessage ?? "Stripe invoice creation failed" }, { status: 500 })
    }

    await db
      .update(schema.invoices)
      .set({ reminderCount: (Number(invRow.reminderCount) || 0) + 1 })
      .where(eq(schema.invoices.id, body.invoiceId))

    await recordAiAction({
      organizationId: orgId,
      entityType:     "invoice",
      entityId:       body.invoiceId,
      triggerType:    "manual",
      actionType:     "customer_followup_sent",
      inputSummary:   `${customerName} · $${balance.toFixed(2)} · ${invRow.invoiceNumber}`,
      outputPayload:  { stripeInvoiceId, stripeCustomerId, mode, channel: "stripe", tone },
      status:         "executed",
    })

    return NextResponse.json({ ok: true, stripeInvoiceId, hostedUrl, emailSent, stripeCustomerId, mode, channel: "stripe", tone })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
