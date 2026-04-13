import Anthropic from "@anthropic-ai/sdk"

/** Facts only — amounts come from the invoice row, never from model inference. */
export type InvoiceReminderFacts = {
  customerName:   string
  totalDue:       number
  dueAt:          string
  reminderCount:  number
  invoiceNumber:  string
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" })

export async function generateReminder(
  facts: InvoiceReminderFacts
): Promise<{ subject: string; message: string; reminder_number: number }> {
  const name = facts.customerName || "Guest"
  const reminderNumber = facts.reminderCount + 1
  const daysOverdue = Math.max(
    0,
    Math.floor((Date.now() - new Date(facts.dueAt).getTime()) / (1000 * 60 * 60 * 24))
  )
  const tone =
    reminderNumber === 1 ? "gentle and friendly" :
    reminderNumber === 2 ? "polite but firm" :
    "direct and urgent"

  const totalStr = facts.totalDue.toFixed(2)

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      subject: `Payment reminder — Invoice ${facts.invoiceNumber}`,
      message:
        `Dear ${name}, this is reminder #${reminderNumber} regarding invoice ${facts.invoiceNumber} for $${totalStr}.` +
        (daysOverdue > 0
          ? ` The balance was due ${daysOverdue} day(s) ago. Please arrange payment at your earliest convenience.`
          : " Please arrange payment by the due date. Thank you for dining with us at Ember Table."),
      reminder_number: reminderNumber,
    }
  }

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
Invoice: ${facts.invoiceNumber}
Amount due (do not change this number): $${totalStr}
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
    const parsed = JSON.parse(cleaned) as { subject?: string; message?: string }
    return {
      subject:         typeof parsed.subject === "string" ? parsed.subject : `Payment reminder — Ember Table`,
      message:         typeof parsed.message === "string" ? parsed.message : `Dear ${name}, please remit $${totalStr} for invoice ${facts.invoiceNumber}.`,
      reminder_number: reminderNumber,
    }
  } catch {
    return {
      subject: `Payment reminder — Ember Table`,
      message:
        `Dear ${name}, this is a reminder that invoice ${facts.invoiceNumber} for $${totalStr} is` +
        (daysOverdue > 0 ? ` overdue by ${daysOverdue} days` : " coming due") +
        ". Please arrange payment at your earliest convenience. Thank you for dining with us at Ember Table.",
      reminder_number: reminderNumber,
    }
  }
}
