import Anthropic from "@anthropic-ai/sdk"
import type { ParsedReservationAction } from "@/lib/types"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function parseReservationRequest(
  natural_language: string,
  existing_reservation_id?: string
): Promise<ParsedReservationAction> {
  const now = new Date().toISOString()

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `You are a reservation assistant for Ember Table restaurant.
Current date/time: ${now}
${existing_reservation_id ? `Existing reservation ID: ${existing_reservation_id}` : ""}

Parse this request and return ONLY valid JSON, no other text:
"${natural_language}"

{
  "intent": "book" | "reschedule" | "cancel" | "query",
  "starts_at": "<ISO string or null>",
  "ends_at": "<ISO string or null — assume 2 hours after starts_at>",
  "confidence": "high" | "medium" | "low",
  "clarification_needed": "<string or null>",
  "raw_interpretation": "<one sentence summary>"
}`,
        },
      ],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const cleaned = text.replace(/```json|```/g, "").trim()
    return JSON.parse(cleaned) as ParsedReservationAction
  } catch {
    return {
      intent: "query",
      confidence: "low",
      clarification_needed: "I could not understand that request. Please try again.",
      raw_interpretation: natural_language,
    }
  }
}