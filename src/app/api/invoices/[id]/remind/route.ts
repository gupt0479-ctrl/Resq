import { NextRequest, NextResponse } from "next/server"
import { getInvoice, recordReminderSent } from "@/lib/services/invoice.service"
import { generateReminder } from "@/lib/ai/generate-reminder"
import { GoogleGenerativeAI } from "@google/generative-ai"
import type { Invoice } from "@/lib/types"

// ─── Thank-you generator (Gemini with hardcoded fallback) ─────────────────────

async function generateThankYou(
  customerName: string,
  total: number,
  visitCount: number
): Promise<{ subject: string; message: string }> {
  const fallback = {
    subject: `Thank you for dining with us, ${customerName}!`,
    message: `Dear ${customerName}, thank you so much for dining at Ember Table and for settling your invoice. It was a genuine pleasure having you with us${visitCount >= 3 ? " — as always" : ""}. We look forward to welcoming you back soon!`,
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return fallback

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    const result = await model.generateContent(
      `You are the manager of Ember Table, an upscale neighbourhood restaurant in Minneapolis.
Write a warm, personal thank-you email to a guest after they paid their invoice.
Guest: ${customerName}
Total paid: $${total.toFixed(2)}
${visitCount >= 3 ? `Loyal regular — ${visitCount} visits total. Thank them warmly.` : visitCount === 1 ? "First visit — express genuine hope to see them again." : `Returning guest — ${visitCount} visits total.`}

Return ONLY valid JSON, no markdown:
{"subject": "<email subject line>", "message": "<3-4 warm, personal sentences>"}`
    )
    const text = result.response.text().trim()
    const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim()
    const parsed = JSON.parse(cleaned)
    return { subject: parsed.subject, message: parsed.message }
  } catch {
    return fallback
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Parse optional body — frontend sends followUpType and invoiceFallback for mock data
  let body: { followUpType?: string; invoiceFallback?: Record<string, unknown> } = {}
  try {
    body = await req.json()
  } catch {
    // no body is fine
  }

  // Try DB first; fall back to the client-provided invoice data for mock IDs
  let invoice: Invoice
  const dbResult = await getInvoice(id)
  if (dbResult.error || !dbResult.data) {
    if (body.invoiceFallback) {
      invoice = body.invoiceFallback as unknown as Invoice
    } else {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 })
    }
  } else {
    invoice = dbResult.data
  }

  const customerName = invoice.customer?.name ?? "Guest"
  const visitCount   = invoice.customer?.visit_count ?? 1
  const total        = invoice.total ?? 0

  // ── Paid thank-you path ────────────────────────────────────────────────────
  if (body.followUpType === "paid") {
    const { subject, message } = await generateThankYou(customerName, total, visitCount)
    return NextResponse.json({
      subject,
      message,
      reminder_number: 0,
      customer_name:   customerName,
      invoice_total:   total,
    })
  }

  // ── Payment reminder path (overdue / pending) ─────────────────────────────

  // Guard: don't send payment reminders on already-paid invoices
  if (invoice.status === "paid") {
    return NextResponse.json({ error: "Invoice already paid." }, { status: 400 })
  }

  const reminder = await generateReminder(invoice)

  // Best-effort DB update — silently skip for mock IDs that don't exist in Supabase
  await recordReminderSent(id).catch(() => undefined)

  return NextResponse.json({
    subject:          reminder.subject,
    message:          reminder.message,
    reminder_number:  reminder.reminder_number,
    customer_name:    customerName,
    invoice_total:    total,
  })
}
