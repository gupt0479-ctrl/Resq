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
    const prompt = `You are the manager of Ember Table, an upscale restaurant in Minneapolis.
Guest: ${name}
Invoice: $${totalStr} - just paid.

Write a warm, personal thank-you follow-up email. Include:
- Genuine thanks for their visit and prompt payment
- A subtle invitation to return or mention an upcoming seasonal menu if relevant
- A gentle ask for feedback (Google review or direct reply)
Keep it to 3-4 sentences. Friendly, not salesy.

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
      subject: `Thank you for dining with us, ${name}!`,
      message: `Dear ${name}, thank you so much for your recent visit to Ember Table and for settling your invoice promptly - it means a great deal to us. We hope you enjoyed every bite and that we will have the pleasure of welcoming you back soon. If you have a moment, we'd love to hear your thoughts - a quick note or Google review goes a long way for our small team.`,
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

  const prompt = `You are the manager of Ember Table restaurant sending a payment reminder.
Tone: ${tone}
Guest: ${name}
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
    subject: "Payment reminder - Ember Table",
    message:
      `Dear ${name}, this is a reminder that invoice ${facts.invoiceNumber} for $${totalStr} is` +
      (daysOverdue > 0 ? ` overdue by ${daysOverdue} days` : " coming due") +
      ". Please arrange payment at your earliest convenience. Thank you for dining with us at Ember Table.",
    reminder_number: reminderNumber,
  }
}
