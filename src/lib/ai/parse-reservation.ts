import { GoogleGenerativeAI } from "@google/generative-ai"
import type { ParsedReservationAction } from "@/lib/types"

// ─── Rule-based fallback parser ───────────────────────────────────────────────

const WORD_TO_NUM: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
}
const DAY_NAMES = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"]

function nextOccurrenceOf(dayIndex: number, from: Date, forceNextWeek = false): Date {
  const result = new Date(from)
  const currentDay = from.getDay()
  let daysUntil = dayIndex - currentDay
  if (daysUntil <= 0 || forceNextWeek) daysUntil += 7
  result.setDate(result.getDate() + daysUntil)
  return result
}

function parseRules(text: string): ParsedReservationAction {
  const lower = text.toLowerCase()
  const now = new Date()

  let intent: ParsedReservationAction["intent"] = "query"
  if (/\b(cancel|delete|remove|drop)\b/.test(lower)) {
    intent = "cancel"
  } else if (/\b(reschedule|move|change|shift|postpone|delay|update)\b/.test(lower)) {
    intent = "reschedule"
  } else if (
    /\b(book|reserve|make|create|schedule|add|set up)\b/.test(lower) ||
    (/\b(table|reservation|booking)\b/.test(lower) && /\bfor\b/.test(lower))
  ) {
    intent = "book"
  }

  let targetDate: Date | null = null
  if (/\btoday\b/.test(lower)) {
    targetDate = new Date(now)
  } else if (/\btomorrow\b/.test(lower)) {
    targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() + 1)
  } else {
    for (let i = 0; i < DAY_NAMES.length; i++) {
      if (lower.includes(DAY_NAMES[i])) {
        targetDate = nextOccurrenceOf(i, now, lower.includes("next " + DAY_NAMES[i]))
        break
      }
    }
  }

  let hours = 19, minutes = 0
  const ampmMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
  if (ampmMatch) {
    hours = parseInt(ampmMatch[1])
    minutes = ampmMatch[2] ? parseInt(ampmMatch[2]) : 0
    if (ampmMatch[3].toLowerCase() === "pm" && hours < 12) hours += 12
    if (ampmMatch[3].toLowerCase() === "am" && hours === 12) hours = 0
  } else {
    const atMatch = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/)
    if (atMatch) {
      hours = parseInt(atMatch[1])
      minutes = atMatch[2] ? parseInt(atMatch[2]) : 0
      if (hours >= 1 && hours <= 10) hours += 12
    }
  }

  if (targetDate) targetDate.setHours(hours, minutes, 0, 0)

  const starts_at = targetDate ? targetDate.toISOString() : null
  const ends_at = targetDate ? new Date(targetDate.getTime() + 2 * 3600 * 1000).toISOString() : null

  let partySize: number | null = null
  const np = text.match(/\bfor\s+(\d+)\b/i)
  if (np) {
    partySize = parseInt(np[1])
  } else {
    for (const [word, num] of Object.entries(WORD_TO_NUM)) {
      if (new RegExp(`\\bfor\\s+${word}\\b`, "i").test(lower)) { partySize = num; break }
    }
  }

  const confidence: "high" | "medium" | "low" =
    intent !== "query" && starts_at ? "high" :
    intent !== "query" ? "medium" : "low"

  const parts: string[] = []
  if (intent === "book")       parts.push("Book a table")
  if (intent === "cancel")     parts.push("Cancel reservation")
  if (intent === "reschedule") parts.push("Reschedule reservation")
  if (partySize) parts.push(`for ${partySize} guest${partySize !== 1 ? "s" : ""}`)
  if (targetDate) {
    parts.push(
      `on ${targetDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}` +
      ` at ${targetDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
    )
  }

  return {
    intent,
    confidence,
    starts_at,
    ends_at,
    clarification_needed:
      confidence === "low"
        ? "Could not determine the full details. Please include a date, time, and party size."
        : null,
    raw_interpretation: parts.length > 0 ? parts.join(" ") : text,
  }
}

// ─── Main exported function ───────────────────────────────────────────────────

export async function parseReservationRequest(
  natural_language: string,
  existing_reservation_id?: string
): Promise<ParsedReservationAction> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    console.warn("GEMINI_API_KEY not set — using rule-based parser")
    return parseRules(natural_language)
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
  const now = new Date().toISOString()

  const prompt = `You are a reservation assistant for Ember Table restaurant.
Current date/time: ${now}
${existing_reservation_id ? `Existing reservation ID: ${existing_reservation_id}` : ""}

Parse this customer request: "${natural_language}"

Respond with ONLY raw JSON, no markdown, no code blocks:
{
  "intent": "book",
  "starts_at": "2026-04-18T19:00:00.000Z",
  "ends_at": "2026-04-18T21:00:00.000Z",
  "confidence": "high",
  "clarification_needed": null,
  "raw_interpretation": "Book a table for 4 people on Saturday April 18 at 7pm"
}

intent must be one of: book, reschedule, cancel, query
confidence must be one of: high, medium, low
starts_at and ends_at must be ISO strings or null if unclear
clarification_needed is a string if confidence is low, otherwise null`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    console.log("Gemini response:", text)

    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim()

    const parsed = JSON.parse(cleaned) as ParsedReservationAction

    if (parsed.starts_at && !parsed.ends_at) {
      const start = new Date(parsed.starts_at)
      start.setHours(start.getHours() + 2)
      parsed.ends_at = start.toISOString()
    }

    return parsed
  } catch (error: unknown) {
    console.warn("Gemini API error, falling back to rule-based parser:", (error instanceof Error ? error.message : String(error)).slice(0, 120))
    return parseRules(natural_language)
  }
}
