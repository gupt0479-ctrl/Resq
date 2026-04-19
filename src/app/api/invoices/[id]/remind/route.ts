import { NextRequest, NextResponse } from "next/server"
import { generateReminder, type InvoiceReminderFacts } from "@/lib/ai/generate-reminder"
import { DEMO_ORG_ID } from "@/lib/db"
import { getInvoiceDetail, recordInvoiceReminderSent } from "@/lib/services/invoices"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic()
type InvoiceDetail = Awaited<ReturnType<typeof getInvoiceDetail>>

// ─── Thank-you generator (Claude with hardcoded fallback) ─────────────────────

async function generateThankYou(
  customerName: string,
  total: number,
  visitCount: number
): Promise<{ subject: string; message: string }> {
  const fallback = {
    subject: `Thank you for dining with us, ${customerName}!`,
    message: `Dear ${customerName}, thank you so much for dining at Ember Table and for settling your invoice. It was a genuine pleasure having you with us${visitCount >= 3 ? " — as always" : ""}. We look forward to welcoming you back soon!`,
  }

  try {
    const response = await anthropic.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{
        role: "user",
        content: `You are the manager of Ember Table, an upscale neighbourhood restaurant in Minneapolis.
Write a warm, personal thank-you email to a guest after they paid their invoice.
Guest: ${customerName}
Total paid: $${total.toFixed(2)}
${visitCount >= 3 ? `Loyal regular — ${visitCount} visits total. Thank them warmly.` : visitCount === 1 ? "First visit — express genuine hope to see them again." : `Returning guest — ${visitCount} visits total.`}

Return ONLY valid JSON, no markdown:
{"subject": "<email subject line>", "message": "<3-4 warm, personal sentences>"}`,
      }],
    })
    const text = (response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "").trim()
    const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim()
    const parsed = JSON.parse(cleaned)
    return { subject: parsed.subject, message: parsed.message }
  } catch {
    return fallback
  }
}

function getDbVisitCount(invoice: InvoiceDetail | null): number | undefined {
  const customer = invoice?.customers
  if (!customer || typeof customer !== "object") return undefined
  const visitCount = (customer as Record<string, unknown>).visit_count
  return typeof visitCount === "number" ? visitCount : undefined
}

function normalizeDueAt(invoice: InvoiceDetail | null, fallback?: string): string | null {
  if (invoice?.dueAt instanceof Date) return invoice.dueAt.toISOString()
  if (typeof invoice?.dueAt === "string") return invoice.dueAt
  return fallback ?? null
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Parse optional body — frontend sends followUpType and invoiceFallback for mock data
  let body: {
    followUpType?: string
    invoiceFallback?: {
      total?: number
      due_at?: string
      reminder_count?: number
      customer?: { name?: string; visit_count?: number }
      status?: string
    }
  } = {}
  try {
    body = await req.json()
  } catch {
    // no body is fine
  }

  // Try DB first; fall back to the client-provided invoice data for mock IDs
  const dbInvoice = await getInvoiceDetail(id, DEMO_ORG_ID).catch(() => null)
  if (!dbInvoice && !body.invoiceFallback) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 })
  }

  const customerName = dbInvoice?.customers?.full_name ?? body.invoiceFallback?.customer?.name ?? "Guest"
  const visitCount   =
    getDbVisitCount(dbInvoice) ??
    body.invoiceFallback?.customer?.visit_count ??
    1
  const totalDue     = Number(dbInvoice?.totalAmount ?? body.invoiceFallback?.total ?? 0)
  const currentStatus = dbInvoice?.status ?? body.invoiceFallback?.status ?? "pending"
  const dueAt = normalizeDueAt(dbInvoice, body.invoiceFallback?.due_at)
  if (!dueAt) {
    return NextResponse.json({ error: "Invoice due date is missing." }, { status: 400 })
  }

  const reminderFacts: InvoiceReminderFacts = {
    customerName,
    totalDue,
    dueAt,
    reminderCount: Number(dbInvoice?.reminderCount ?? body.invoiceFallback?.reminder_count ?? 0),
    invoiceNumber: dbInvoice?.invoiceNumber ?? id,
  }

  // ── Paid thank-you path ────────────────────────────────────────────────────
  if (body.followUpType === "paid") {
    const { subject, message } = await generateThankYou(customerName, totalDue, visitCount)
    return NextResponse.json({
      subject,
      message,
      reminder_number: 0,
      customer_name:   customerName,
      invoice_total:   totalDue,
    })
  }

  // ── Payment reminder path (overdue / pending) ─────────────────────────────

  // Guard: don't send payment reminders on already-paid invoices
  if (currentStatus === "paid") {
    return NextResponse.json({ error: "Invoice already paid." }, { status: 400 })
  }

  const reminder = await generateReminder(reminderFacts)
  const persistedReminderCount = dbInvoice
    ? await recordInvoiceReminderSent(id, DEMO_ORG_ID)
    : null

  return NextResponse.json({
    subject:          reminder.subject,
    message:          reminder.message,
    reminder_number:  persistedReminderCount ?? reminder.reminder_number,
    customer_name:    customerName,
    invoice_total:    totalDue,
  })
}
