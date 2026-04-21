import { NextRequest, NextResponse } from "next/server"
import { createUserSupabaseServerClient } from "@/lib/auth/create-user-supabase-server-client"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { syncStripeCustomer, createStripeInvoice } from "@/lib/services/stripe-helper"
import { recordAiAction } from "@/lib/services/ai-actions"
import { sendOutreachEmail } from "@/lib/services/email-sender"

// POST /api/receivables/send-reminder
// Body: { invoiceId, organizationId?, channel?, tone?, outreachDraft?, customerEmail? }
export async function POST(req: NextRequest) {
  try {
    const ctx = await getUserOrg()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json().catch(() => ({})) as {
      invoiceId:        string
      organizationId?:  string
      bypassGuardrails?: boolean
      // Agent-driven fields — when present, use these instead of generic Stripe invoice
      channel?:         string   // "email" | "stripe" | "formal_notice" | "phone"
      tone?:            string   // "friendly" | "firm" | "formal" | "urgent"
      outreachDraft?:   string
      customerEmail?:   string
    }
    const orgId = body.organizationId ?? ctx.organizationId

    if (!body.invoiceId) {
      return NextResponse.json({ ok: false, error: "invoiceId is required" }, { status: 400 })
    }

    const client = await createUserSupabaseServerClient()

    // Load invoice + customer
    const { data: inv, error: invErr } = await client
      .from("invoices")
      .select("id, invoice_number, total_amount, amount_paid, due_at, reminder_count, customer_id, customers ( full_name, email, notes )")
      .eq("id", body.invoiceId)
      .eq("organization_id", orgId)
      .single()

    if (invErr || !inv) {
      return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 })
    }

    const cust          = inv.customers as unknown as { full_name: string; email: string | null; notes: string | null } | null
    const customerName  = cust?.full_name ?? "Customer"
    const customerEmail = cust?.email ?? `noreply+${body.invoiceId}@resq.app`
    const balance       = Number(inv.total_amount) - Number(inv.amount_paid)

    // Legal guardrails check (unless bypassed)
    if (!body.bypassGuardrails) {
      // Check 1: Contact frequency
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const { data: recentActions } = await client
        .from("ai_actions")
        .select("created_at")
        .eq("organization_id", orgId)
        .eq("entity_id", body.invoiceId)
        .in("action_type", ["customer_followup_sent", "payment_plan_suggested", "dispute_clarification_sent"])
        .gte("created_at", oneWeekAgo)

      const actionsToday = (recentActions ?? []).filter((a: Record<string, string>) => a.created_at >= oneDayAgo).length
      const actionsThisWeek = (recentActions ?? []).length

      if (actionsToday >= 1) {
        return NextResponse.json(
          { ok: false, error: "Contact frequency limit: Already contacted this customer today (max 1/day)" },
          { status: 429 }
        )
      }

      if (actionsThisWeek >= 3) {
        return NextResponse.json(
          { ok: false, error: "Contact frequency limit: Already contacted 3 times this week (max 3/week)" },
          { status: 429 }
        )
      }

      // Check 2: Time of day
      const hour = new Date().getHours()
      if (hour < 8 || hour >= 21) {
        return NextResponse.json(
          { ok: false, error: `Time restriction: Cannot contact outside 8am-9pm (current hour: ${hour})` },
          { status: 403 }
        )
      }

      // Check 3: Do-not-contact list
      const notes = (cust?.notes ?? "").toLowerCase()
      if (notes.includes("do not contact") || notes.includes("dnc")) {
        return NextResponse.json(
          { ok: false, error: "Customer is on do-not-contact list" },
          { status: 403 }
        )
      }

      // Check 4: High-stakes gate (>$5k requires approval)
      if (balance > 5000) {
        return NextResponse.json(
          { ok: false, error: `High-value invoice (${balance.toFixed(0)} > $5,000) requires human approval before sending`, requiresApproval: true },
          { status: 403 }
        )
      }
    }

    const channel = body.channel ?? "stripe"
    const tone    = body.tone    ?? "firm"

    // ── Phone channel: log only, no automated send ────────────────────────────
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

    // ── Email / formal_notice channel: send via Resend ────────────────────────
    if (channel === "email" || channel === "formal_notice") {
      const toEmail     = body.customerEmail ?? customerEmail
      const effectiveTone = channel === "formal_notice" ? "formal" : tone
      const draft       = body.outreachDraft ?? `Hi ${customerName},\n\nThis is a reminder about your overdue invoice of $${balance.toFixed(2)} (${inv.invoice_number as string}). Please contact us to arrange payment.\n\nBest regards,\nResq`

      const { sent, messageId, mode } = await sendOutreachEmail({
        toEmail,
        toName:  customerName,
        body:    draft,
        tone:    effectiveTone,
      })

      await client
        .from("invoices")
        .update({ reminder_count: (Number(inv.reminder_count) || 0) + 1 })
        .eq("id", body.invoiceId)

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

    // ── Stripe channel (default) ──────────────────────────────────────────────
    const { customerId: stripeCustomerId } = await syncStripeCustomer({
      email:    customerEmail,
      name:     customerName,
      metadata: { organizationId: orgId, invoiceId: body.invoiceId },
    })

    const dueDate = inv.due_at ? new Date(inv.due_at) : undefined
    const { success, invoiceId: stripeInvoiceId, hostedUrl, emailSent, mode, errorMessage } = await createStripeInvoice(
      stripeCustomerId,
      balance,
      `Payment reminder — Invoice ${inv.invoice_number} ($${balance.toFixed(2)} overdue)`,
      dueDate,
    )

    if (!success) {
      return NextResponse.json({ ok: false, error: errorMessage ?? "Stripe invoice creation failed" }, { status: 500 })
    }

    // Increment reminder_count
    await client
      .from("invoices")
      .update({ reminder_count: (Number(inv.reminder_count) || 0) + 1 })
      .eq("id", body.invoiceId)

    await recordAiAction({
      organizationId: orgId,
      entityType:     "invoice",
      entityId:       body.invoiceId,
      triggerType:    "manual",
      actionType:     "customer_followup_sent",
      inputSummary:   `${customerName} · $${balance.toFixed(2)} · ${inv.invoice_number}`,
      outputPayload:  { stripeInvoiceId, stripeCustomerId, mode, channel: "stripe", tone },
      status:         "executed",
    })

    return NextResponse.json({ ok: true, stripeInvoiceId, hostedUrl, emailSent, stripeCustomerId, mode, channel: "stripe", tone })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
