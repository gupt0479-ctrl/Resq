import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { syncStripeCustomer, createStripeInvoice } from "@/lib/services/stripe-helper"
import { recordAiAction } from "@/lib/services/ai-actions"

// POST /api/receivables/send-reminder
// Body: { invoiceId, organizationId? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as {
      invoiceId:       string
      organizationId?: string
    }
    const orgId = body.organizationId ?? DEMO_ORG_ID

    if (!body.invoiceId) {
      return NextResponse.json({ ok: false, error: "invoiceId is required" }, { status: 400 })
    }

    const client = createServerSupabaseClient()

    // Load invoice + customer
    const { data: inv, error: invErr } = await client
      .from("invoices")
      .select("id, invoice_number, total_amount, amount_paid, due_at, reminder_count, customers ( full_name, email )")
      .eq("id", body.invoiceId)
      .eq("organization_id", orgId)
      .single()

    if (invErr || !inv) {
      return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 })
    }

    const cust          = inv.customers as unknown as { full_name: string; email: string | null } | null
    const customerName  = cust?.full_name ?? "Customer"
    const customerEmail = cust?.email ?? `noreply+${body.invoiceId}@opspilot.app`
    const balance       = Number(inv.total_amount) - Number(inv.amount_paid)

    // Sync Stripe customer
    const { customerId: stripeCustomerId } = await syncStripeCustomer({
      email:    customerEmail,
      name:     customerName,
      metadata: { organizationId: orgId, invoiceId: body.invoiceId },
    })

    // Create Stripe invoice
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

    await recordAiAction(client, {
      organizationId: orgId,
      entityType:     "invoice",
      entityId:       body.invoiceId,
      triggerType:    "manual",
      actionType:     "customer_followup_sent",
      inputSummary:   `${customerName} · $${balance.toFixed(2)} · ${inv.invoice_number}`,
      outputPayload:  { stripeInvoiceId, stripeCustomerId, mode },
      status:         "executed",
    })

    return NextResponse.json({ ok: true, stripeInvoiceId, hostedUrl, emailSent, stripeCustomerId, mode })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}