import "server-only"

import Stripe from "stripe"

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY?.trim() ?? ""

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" })
  : null

// ─── Types ─────────────────────────────────────────────────────────────────

export interface StripeInvoiceReminderOptions {
  invoiceId: string
  customMessage?: string
}

export interface StripeCustomerSyncOptions {
  email: string
  name: string
  metadata?: Record<string, string>
}

// ─── Send Invoice Reminder ─────────────────────────────────────────────────

export async function sendStripeInvoiceReminder(
  stripeInvoiceId: string,
  options: StripeInvoiceReminderOptions = { invoiceId: "" }
): Promise<{ success: boolean; reminderId: string; mode: "live" | "mock" }> {
  if (!stripe) {
    const mockId = `mock_reminder_${options.invoiceId.slice(0, 8)}_${Date.now()}`
    return { success: true, reminderId: mockId, mode: "mock" }
  }

  try {
    const result = await stripe.invoices.sendInvoice(stripeInvoiceId)
    return { success: true, reminderId: result.id, mode: "live" }
  } catch (error) {
    console.error(`[Stripe Error] Failed to send reminder:`, error)
    const mockId = `error_fallback_${options.invoiceId.slice(0, 8)}_${Date.now()}`
    return { success: false, reminderId: mockId, mode: "mock" }
  }
}

// ─── Create or Update Stripe Customer ──────────────────────────────────────

export async function syncStripeCustomer(
  options: StripeCustomerSyncOptions
): Promise<{ success: boolean; customerId: string; mode: "live" | "mock" }> {
  if (!stripe) {
    return { success: true, customerId: `cus_mock_${Date.now()}`, mode: "mock" }
  }

  try {
    const existingCustomers = await stripe.customers.list({ email: options.email, limit: 1 })

    let customer
    if (existingCustomers.data.length > 0) {
      customer = await stripe.customers.update(existingCustomers.data[0].id, {
        name: options.name,
        metadata: options.metadata,
      })
    } else {
      customer = await stripe.customers.create({
        email: options.email,
        name: options.name,
        metadata: options.metadata,
      })
    }

    return { success: true, customerId: customer.id, mode: "live" }
  } catch (error) {
    console.error(`[Stripe Error] Failed to sync customer:`, error)
    return { success: false, customerId: `cus_error_${Date.now()}`, mode: "mock" }
  }
}

// ─── Create Stripe Invoice ─────────────────────────────────────────────────

export async function createStripeInvoice(
  stripeCustomerId: string,
  amount: number,
  description: string,
  dueDate?: Date
): Promise<{ success: boolean; invoiceId: string; hostedUrl?: string; emailSent?: boolean; mode: "live" | "mock"; errorMessage?: string }> {
  if (!stripe) {
    return { success: true, invoiceId: `in_mock_${Date.now()}`, mode: "mock" }
  }

  try {
    await stripe.invoiceItems.create({
      customer: stripeCustomerId,
      amount: Math.round(amount * 100),
      currency: "usd",
      description,
    })

    const invoice = await stripe.invoices.create({
      customer: stripeCustomerId,
      auto_advance: true,
      collection_method: "send_invoice",
      days_until_due: dueDate
        ? Math.max(1, Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 30,
    })

    const finalized = await stripe.invoices.finalizeInvoice(invoice.id)

    let emailSent = false
    try {
      await stripe.invoices.sendInvoice(finalized.id)
      emailSent = true
    } catch (sendErr) {
      console.error(`[Stripe] sendInvoice failed:`, sendErr instanceof Error ? sendErr.message : sendErr)
    }

    return {
      success:   true,
      invoiceId: finalized.id,
      hostedUrl: finalized.hosted_invoice_url ?? undefined,
      emailSent,
      mode:      "live",
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[Stripe Error] Failed to create invoice:`, msg)
    return { success: false, invoiceId: `in_error_${Date.now()}`, mode: "mock", errorMessage: msg }
  }
}

// ─── Get Payment Method ────────────────────────────────────────────────────

export async function hasPaymentMethod(
  stripeCustomerId: string
): Promise<{ hasMethod: boolean; mode: "live" | "mock" }> {
  if (!stripe) {
    return { hasMethod: true, mode: "mock" }
  }

  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: "card",
      limit: 1,
    })
    return { hasMethod: paymentMethods.data.length > 0, mode: "live" }
  } catch (error) {
    console.error(`[Stripe Error] Failed to check payment method:`, error)
    return { hasMethod: false, mode: "mock" }
  }
}

// ─── Charge Customer ───────────────────────────────────────────────────────

export async function chargeCustomer(
  stripeCustomerId: string,
  amount: number,
  description: string
): Promise<{ success: boolean; chargeId: string; mode: "live" | "mock" }> {
  if (!stripe) {
    return { success: true, chargeId: `ch_mock_${Date.now()}`, mode: "mock" }
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      customer: stripeCustomerId,
      description,
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    })
    return { success: true, chargeId: paymentIntent.id, mode: "live" }
  } catch (error) {
    console.error(`[Stripe Error] Failed to charge customer:`, error)
    return { success: false, chargeId: `ch_error_${Date.now()}`, mode: "mock" }
  }
}

// ─── Utility Functions ─────────────────────────────────────────────────────

export function isStripeConfigured(): boolean {
  return !!STRIPE_SECRET_KEY
}

export function getStripeMode(): "live" | "mock" {
  return STRIPE_SECRET_KEY ? "live" : "mock"
}