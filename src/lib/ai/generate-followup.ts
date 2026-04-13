import Anthropic from "@anthropic-ai/sdk"
import type { Reservation } from "@/lib/types"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function generateFollowUp(reservation: Reservation): Promise<string> {
  const name = reservation.customer?.name ?? "there"
  const occasion = reservation.occasion
  const visitCount = reservation.customer?.visit_count ?? 1
  const date = new Date(reservation.starts_at).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `You are the manager of Ember Table, an upscale neighbourhood restaurant.
Write a short warm follow-up message to send to a guest after their visit. Max 3 sentences. Sound genuine.

Guest: ${name}
Date: ${date}
Party size: ${reservation.party_size}
${occasion ? `Occasion: ${occasion}` : ""}
Total visits: ${visitCount}
${visitCount === 1 ? "First visit — hope to see them again." : ""}
${visitCount >= 3 ? "Loyal regular — thank them warmly." : ""}
${occasion ? `Celebrated ${occasion} — acknowledge it.` : ""}

Write only the message. No subject line.`,
        },
      ],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    return text.trim()
  } catch {
    return `Hi ${name}, thank you so much for dining with us${occasion ? ` and celebrating your ${occasion}` : ""}. It was a pleasure having you at Ember Table${visitCount >= 3 ? " — as always" : ""}. We hope to see you again soon!`
  }
}