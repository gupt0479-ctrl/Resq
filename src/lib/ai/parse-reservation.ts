import Anthropic from "@anthropic-ai/sdk"
import type { ParsedReservationAction } from "@/lib/types"

export async function parseReservationRequest(
  natural_language: string,
  existing_reservation_id?: string
): Promise<ParsedReservationAction> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not set")
    return {
      intent: "query",
      confidence: "low",
      clarification_needed: "AI service is not configured.",
      raw_interpretation: natural_language,
    }
  }

  const anthropic = new Anthropic({ apiKey })
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

Parse this customer request: "${natural_language}"

Respond with ONLY a JSON object. No explanation, no markdown, no code blocks. Just raw JSON:
{
  "intent": "book",
  "starts_at": "2026-04-18T16:00:00.000Z",
  "ends_at": "2026-04-18T18:00:00.000Z",
  "confidence": "high",
  "clarification_needed": null,
  "raw_interpretation": "Book a table for 4 people on Friday April 18 at 4pm"
}

intent must be one of: book, reschedule, cancel, query
confidence must be one of: high, medium, low
starts_at and ends_at must be ISO strings or null if unclear
clarification_needed is a string if confidence is low, otherwise null`,
        },
      ],
    })

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : ""
    console.log("Claude response:", text)

    // Strip markdown code blocks if present
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim()

    return JSON.parse(cleaned) as ParsedReservationAction
  } catch (error) {
    console.error("parseReservationRequest error:", error)
    return {
      intent: "query",
      confidence: "low",
      clarification_needed: "I could not understand that request. Please try again.",
      raw_interpretation: natural_language,
    }
  }
}