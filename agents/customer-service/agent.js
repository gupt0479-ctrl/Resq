/**
 * Ember Table — Customer Service Agent
 *
 * Analyzes guest reviews AND handles outbound messaging.
 * Auto-sends: thank-yous, reminders, nudges.
 * Queues for approval: recovery offers, public replies, callbacks.
 *
 * Usage:
 *   import { analyzeAndRespond } from './agent.js'
 *   const result = await analyzeAndRespond({ guestName, guestEmail, score, comment, source, guestHistory })
 */

import Anthropic from '@anthropic-ai/sdk'
import {
  sendThankYou,
  sendFeedbackRequest,
  queueRecoveryMessage,
} from './messageSender.js'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ─────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the customer service AI agent for Ember Table, an upscale neighborhood restaurant in Minneapolis.

Your job is to analyze incoming guest reviews and feedback and return a structured JSON action plan — including a fully written message ready to send or post.

About Ember Table:
- Signature dishes: Wagyu Ribeye, Chef Tasting Menu, Pan-Seared Duck Breast, Braised Short Rib, Crème Brûlée
- Values: personal service, food safety above all, guest recovery, building regulars
- VIP guests and repeat visitors always get a personal recovery action
- Any allergy, illness, or food safety mention is ALWAYS urgency 5 and safety_flag true, no exceptions

Message tone — for ALL message drafts you write:
- Warm and personal, never corporate or templated-sounding
- Never defensive — always own the experience fully
- Address the guest by first name
- For recovery messages: name something specific from their complaint, offer something concrete
- For thank-yous: mention something specific from their visit if guestHistory is available
- Keep all messages under 120 words
- Public replies (Google/Yelp) should be under 80 words and work for anyone reading, not just the guest

You MUST respond with ONLY valid JSON — no explanation, no markdown, no extra text.`

// ─────────────────────────────────────────────
// RESPONSE SCHEMA
// ─────────────────────────────────────────────
const RESPONSE_SCHEMA = `{
  "sentiment": "positive" | "neutral" | "negative",
  "score_label": "excellent" | "good" | "mixed" | "poor" | "critical",
  "topics": array from ["food_quality","service_speed","staff_attitude","noise_level","wait_time","allergy_safety","value","ambiance","cleanliness"],
  "urgency": integer 1-5,
  "safety_flag": boolean,
  "churn_risk": "low" | "medium" | "high",
  "risk_status_update": "healthy" | "at_risk" | "churned",
  "reply_draft": string (public reply for Google/Yelp — always populate if source is google or yelp, otherwise null),
  "internal_note": string (private manager context — specific, actionable),
  "recovery_action": {
    "type": "none" | "thank_you_email" | "personal_call" | "comp_offer" | "refund" | "urgent_escalation",
    "subject": string (email subject line for recovery messages),
    "message_draft": string (complete message ready to send — write this even for queued messages so manager can review),
    "channel": "email" | "sms" | "phone" | "none",
    "priority": "low" | "normal" | "high" | "urgent"
  },
  "auto_send_thank_you": boolean (true if score 4-5 and source is internal or opentable),
  "follow_up_status": "none" | "thankyou_sent" | "callback_needed" | "resolved",
  "manager_summary": string (one sentence — names the guest, the specific issue, and the action taken)
}`

// ─────────────────────────────────────────────
// CORE ANALYSIS FUNCTION
// ─────────────────────────────────────────────

/**
 * Analyzes a review — pure Claude API call, no side effects.
 * Call this if you want the analysis without sending anything.
 */
export async function analyzeReview({
  guestName,
  score,
  comment,
  source = 'internal',
  guestHistory = null,
}) {
  const historyContext = guestHistory
    ? `Guest history:
- Visits to date: ${guestHistory.visitCount ?? 'unknown'}
- Lifetime spend: $${guestHistory.lifetimeSpend ?? 'unknown'}
- Last visit: ${guestHistory.lastVisit ?? 'unknown'}
- VIP status: ${guestHistory.vip ? 'YES — treat with extra care' : 'no'}
- Dietary notes on file: ${guestHistory.dietaryNotes ?? 'none'}`
    : `Guest history: not available (external review source)`

  const userMessage = `Analyze this guest review and return a JSON action plan matching this exact schema:
${RESPONSE_SCHEMA}

Review:
- Guest name: ${guestName}
- Star rating: ${score}/5
- Source: ${source}
- Comment: "${comment}"

${historyContext}

Remember: write the message_draft as a complete, ready-to-send message. The manager should be able to approve and send it as-is.`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const rawText = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')

  try {
    const parsed = JSON.parse(rawText)
    return {
      ...parsed,
      _meta: {
        guestName,
        score,
        source,
        analyzedAt: new Date().toISOString(),
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    }
  } catch {
    throw new Error(`Failed to parse Claude response:\n${rawText}`)
  }
}

// ─────────────────────────────────────────────
// FULL AGENT FUNCTION — analyze + message
// ─────────────────────────────────────────────

/**
 * The main function. Analyzes a review AND handles all messaging.
 * This is what n8n calls, and what the API route wraps.
 *
 * @param {Object} params
 * @param {string} params.guestName
 * @param {string} params.guestEmail      - Required for messaging
 * @param {number} params.score
 * @param {string} params.comment
 * @param {string} params.source          - 'internal' | 'google' | 'yelp' | 'opentable'
 * @param {Object} [params.guestHistory]  - { visitCount, lifetimeSpend, lastVisit, vip, dietaryNotes }
 * @param {string} [params.guestId]       - Supabase guest UUID
 * @param {string} [params.feedbackId]    - Supabase feedback UUID (if already inserted)
 */
export async function analyzeAndRespond({
  guestName,
  guestEmail,
  score,
  comment,
  source = 'internal',
  guestHistory = null,
  guestId = null,
  feedbackId = null,
}) {
  // Step 1 — analyze
  const analysis = await analyzeReview({ guestName, score, comment, source, guestHistory })
  const messagingResults = []

  // Step 2 — auto-send thank-you if agent flagged it
  if (analysis.auto_send_thank_you && guestEmail) {
    const visitDetail = guestHistory?.visitCount > 1
      ? `your ${guestHistory.visitCount}th visit with us`
      : null

    const thankyouResult = await sendThankYou({
      guestEmail, guestName, visitDetail, guestId, feedbackId,
    })
    messagingResults.push(thankyouResult)
    analysis.follow_up_status = 'thankyou_sent'
  }

  // Step 3 — queue recovery message (manager approves before it sends)
  if (
    analysis.recovery_action.type !== 'none' &&
    analysis.recovery_action.type !== 'thank_you_email' &&
    analysis.recovery_action.message_draft &&
    guestEmail
  ) {
    const recoveryResult = await queueRecoveryMessage({
      guestEmail,
      guestName,
      draft: analysis.recovery_action.message_draft,
      subject: analysis.recovery_action.subject,
      recoveryType: analysis.recovery_action.type,
      guestId,
      feedbackId,
    })
    messagingResults.push(recoveryResult)
  }

  // Step 4 — auto-send feedback request for visits with no comment yet
  if (source === 'internal' && !comment?.trim() && guestEmail) {
    const feedbackResult = await sendFeedbackRequest({ guestEmail, guestName, guestId })
    messagingResults.push(feedbackResult)
  }

  return {
    ...analysis,
    messaging: messagingResults,
    _meta: {
      ...analysis._meta,
      guestEmail,
      guestId,
      feedbackId,
      messagesSent: messagingResults.filter(m => m.status === 'sent').length,
      messagesQueued: messagingResults.filter(m => m.status === 'queued').length,
    },
  }
}

// ─────────────────────────────────────────────
// STANDALONE TRIGGERS — called by n8n on schedule
// ─────────────────────────────────────────────
export {
  sendReservationReminder,
  sendReservationConfirmation,
  sendReturnVisitNudge,
} from './messageSender.js'

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
export function isUrgent(result) {
  return result.urgency >= 4 || result.safety_flag === true
}

export function needsPublicReply(result) {
  return ['google', 'yelp'].includes(result._meta?.source)
}

export function formatSummary(result) {
  const flag = result.safety_flag ? ' ⚠ SAFETY FLAG' : ''
  const sent = result._meta?.messagesSent ?? 0
  const queued = result._meta?.messagesQueued ?? 0
  return `[${result._meta?.source?.toUpperCase()}] ${result._meta?.guestName} — ${result._meta?.score}★ — ${result.sentiment} — urgency ${result.urgency}/5${flag} — ${sent} sent, ${queued} queued`
}
