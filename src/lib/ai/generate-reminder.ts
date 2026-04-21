import Anthropic from "@anthropic-ai/sdk"
import type { Invoice } from "@/lib/types"

/** Facts only - amounts come from persisted invoice data, never model inference. */
export type InvoiceReminderFacts = {
  customerName: string
  totalDue: number
  dueAt: string
  reminderCount: number
  invoiceNumber: string
}

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

function toReminderFacts(input: Invoice | InvoiceReminderFacts): InvoiceReminderFacts {
  if ("due_at" in input) {
    return {
      customerName: input.customer?.name ?? "Guest",
      totalDue: Number(input.total) || 0,
      dueAt: input.due_at,
      reminderCount: input.reminder_count ?? 0,
      invoiceNumber: input.id,
    }
  }

  return {
    customerName: input.customerName,
    totalDue: Number(input.totalDue) || 0,
    dueAt: input.dueAt,
    reminderCount: input.reminderCount ?? 0,
    invoiceNumber: input.invoiceNumber,
  }
}

export async function generateReminder(
  invoiceOrFacts: Invoice | InvoiceReminderFacts,
  followUpType: "overdue" | "paid" = "overdue"
): Promise<{
  subject: string
  message: string
  reminder_number: number
}> {
  const facts = toReminderFacts(invoiceOrFacts)
  const name = facts.customerName || "Guest"
  const reminderNumber = (facts.reminderCount ?? 0) + 1
  const totalStr = facts.totalDue.toFixed(2)

  if (followUpType === "paid") {
    const prompt = `You are writing a warm payment receipt follow-up for a small business using Resq.
Customer: ${name}
Invoice: $${totalStr} - just paid.

Write a short, professional thank-you email. Include:
- Genuine thanks for the prompt payment
- Confirmation that the payment was received
- An invitation to reply with any billing questions
Keep it to 3-4 sentences. Friendly and professional, not salesy.

Return ONLY valid JSON, no other text:
{
  "subject": "<warm subject line>",
  "message": "<3-4 sentence thank-you message>"
}`

    if (anthropic) {
      try {
        const response = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        })
        const text = response.content[0].type === "text" ? response.content[0].text : ""
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim())
        return { subject: parsed.subject, message: parsed.message, reminder_number: reminderNumber }
      } catch {
        // Fall through to deterministic copy below.
      }
    }

    return {
      subject: `Thank you for your payment, ${name}`,
      message: `Dear ${name}, thank you for settling your invoice promptly. We have recorded your payment successfully, and we appreciate the fast turnaround. If you need a copy of the invoice or have any billing questions, just reply to this email.`,
      reminder_number: reminderNumber,
    }
  }

  const daysOverdue = Math.max(
    0,
    Math.floor((Date.now() - new Date(facts.dueAt).getTime()) / (1000 * 60 * 60 * 24))
  )
  const tone =
    reminderNumber === 1 ? "gentle and friendly" :
    reminderNumber === 2 ? "polite but firm" :
    "direct and urgent"

  const prompt = `You are a finance operator sending a payment reminder for a small business.
Tone: ${tone}
Customer: ${name}
Amount due: $${totalStr}
Days overdue: ${daysOverdue}
Reminder number: ${reminderNumber}

Return ONLY valid JSON, no other text:
{
  "subject": "<email subject>",
  "message": "<3-4 sentence reminder message>"
}`

  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      })
      const text = response.content[0].type === "text" ? response.content[0].text : ""
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim())
      return { subject: parsed.subject, message: parsed.message, reminder_number: reminderNumber }
    } catch {
      // Fall through to deterministic copy below.
    }
  }

  return {
    subject: "Payment reminder",
    message:
      `Dear ${name}, this is a reminder that invoice ${facts.invoiceNumber} for $${totalStr} is` +
      (daysOverdue > 0 ? ` overdue by ${daysOverdue} days` : " coming due") +
      ". Please arrange payment at your earliest convenience. Reply if you need a copy of the invoice or help resolving the balance.",
    reminder_number: reminderNumber,
  }
}
