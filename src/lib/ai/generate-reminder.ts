import Anthropic from "@anthropic-ai/sdk"
import type { Invoice } from "@/lib/types"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function generateReminder(invoice: Invoice): Promise<{
  subject: string
  message: string
  reminder_number: number
}> {
  const name = invoice.customer?.name ?? "Guest"
  const reminderNumber = (invoice.reminder_count ?? 0) + 1
  const daysOverdue = Math.max(
    0,
    Math.floor((Date.now() - new Date(invoice.due_at).getTime()) / (1000 * 60 * 60 * 24))
  )
  const tone =
    reminderNumber === 1 ? "gentle and friendly" :
    reminderNumber === 2 ? "polite but firm" :
    "direct and urgent"

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are the manager of Ember Table restaurant sending a payment reminder.
Tone: ${tone}
Guest: ${name}
Amount due: $${invoice.total}
Days overdue: ${daysOverdue}
Reminder number: ${reminderNumber}

Return ONLY valid JSON, no other text:
{
  "subject": "<email subject>",
  "message": "<3-4 sentence reminder message>"
}`,
        },
      ],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const cleaned = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(cleaned)
    return { subject: parsed.subject, message: parsed.message, reminder_number: reminderNumber }
  } catch {
    return {
      subject: `Payment reminder — Ember Table`,
      message: `Dear ${name}, this is a reminder that your invoice of $${invoice.total} is overdue by ${daysOverdue} days. Please arrange payment at your earliest convenience. Thank you for dining with us at Ember Table.`,
      reminder_number: reminderNumber,
    }
  }
}