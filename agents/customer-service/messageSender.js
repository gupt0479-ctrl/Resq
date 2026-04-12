/**
 * Ember Table — Message Sender
 *
 * Handles all outbound customer messaging for the customer service agent.
 * Auto-sends safe messages (thank-yous, reminders, nudges).
 * Queues sensitive messages (recovery offers, public replies, callbacks).
 *
 * Uses Resend for email delivery.
 * Set RESEND_API_KEY in your .env to enable real sending.
 * Without it, messages are drafted and logged but not sent (demo-safe).
 */

import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM_EMAIL = 'Ember Table <hello@embertable.com>'
const RESTAURANT_NAME = 'Ember Table'

// ─────────────────────────────────────────────
// MESSAGE TYPES — determines auto vs approval
// ─────────────────────────────────────────────

const AUTO_SEND_TYPES = new Set([
  'thank_you_email',
  'reservation_reminder',
  'reservation_confirmation',
  'feedback_request',
  'return_visit_nudge',
])

const APPROVAL_REQUIRED_TYPES = new Set([
  'comp_offer',
  'personal_call',
  'refund',
  'urgent_escalation',
  'public_reply_google',
  'public_reply_yelp',
])

// ─────────────────────────────────────────────
// EMAIL TEMPLATES
// ─────────────────────────────────────────────

function buildEmailHtml({ subject, preheader, bodyHtml }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family:Georgia,serif;background:#faf9f6;margin:0;padding:32px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:40px;border:1px solid #e8e4dc;">
    <div style="font-size:13px;color:#9c8a6e;letter-spacing:2px;text-transform:uppercase;margin-bottom:24px;">
      ${RESTAURANT_NAME}
    </div>
    ${bodyHtml}
    <div style="margin-top:40px;padding-top:24px;border-top:1px solid #e8e4dc;font-size:12px;color:#b0a090;">
      ${RESTAURANT_NAME} · Minneapolis, MN<br>
      <a href="mailto:hello@embertable.com" style="color:#9c8a6e;">hello@embertable.com</a>
    </div>
  </div>
  <!-- preheader hidden: ${preheader} -->
</body>
</html>`
}

const templates = {
  thank_you_email: ({ guestName, visitDetail }) => ({
    subject: `Thank you for joining us, ${guestName.split(' ')[0]}`,
    preheader: 'It was a pleasure having you at Ember Table.',
    bodyHtml: `
      <p style="font-size:18px;color:#2c1810;margin:0 0 16px;">Thank you, ${guestName.split(' ')[0]}.</p>
      <p style="color:#5c4a3a;line-height:1.7;">
        It was a genuine pleasure having you at Ember Table${visitDetail ? ` — ${visitDetail}` : ''}.
        We hope to see you again soon.
      </p>
      <p style="color:#5c4a3a;line-height:1.7;">
        If there is anything we can do better next time, please don't hesitate to reach out.
      </p>
      <p style="color:#5c4a3a;margin-top:24px;">Warmly,<br>The Ember Table team</p>`,
  }),

  reservation_reminder: ({ guestName, date, time, partySize, tableNote }) => ({
    subject: `Your reservation at Ember Table — ${date}`,
    preheader: `We're looking forward to seeing you ${date} at ${time}.`,
    bodyHtml: `
      <p style="font-size:18px;color:#2c1810;margin:0 0 16px;">See you soon, ${guestName.split(' ')[0]}.</p>
      <div style="background:#faf9f6;border-radius:6px;padding:20px;margin:16px 0;">
        <div style="color:#9c8a6e;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Your reservation</div>
        <div style="color:#2c1810;font-size:16px;">${date} at ${time}</div>
        <div style="color:#5c4a3a;margin-top:4px;">Party of ${partySize}${tableNote ? ` · ${tableNote}` : ''}</div>
      </div>
      <p style="color:#5c4a3a;line-height:1.7;">
        Need to make a change? Reply to this email or call us and we'll take care of it.
      </p>`,
  }),

  reservation_confirmation: ({ guestName, date, time, partySize, occasion }) => ({
    subject: `Reservation confirmed — ${date} at ${time}`,
    preheader: `Your table at Ember Table is confirmed.`,
    bodyHtml: `
      <p style="font-size:18px;color:#2c1810;margin:0 0 16px;">You're confirmed, ${guestName.split(' ')[0]}.</p>
      <div style="background:#faf9f6;border-radius:6px;padding:20px;margin:16px 0;">
        <div style="color:#9c8a6e;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Reservation details</div>
        <div style="color:#2c1810;font-size:16px;">${date} at ${time}</div>
        <div style="color:#5c4a3a;margin-top:4px;">Party of ${partySize}${occasion ? ` · ${occasion}` : ''}</div>
      </div>
      <p style="color:#5c4a3a;line-height:1.7;">We look forward to welcoming you.</p>`,
  }),

  feedback_request: ({ guestName }) => ({
    subject: `How was your visit, ${guestName.split(' ')[0]}?`,
    preheader: 'We would love to hear from you.',
    bodyHtml: `
      <p style="font-size:18px;color:#2c1810;margin:0 0 16px;">How did we do, ${guestName.split(' ')[0]}?</p>
      <p style="color:#5c4a3a;line-height:1.7;">
        Thank you for joining us recently. We'd love to hear about your experience —
        it takes less than a minute and helps us serve you better.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/feedback"
           style="background:#2c1810;color:#fff;text-decoration:none;padding:14px 32px;border-radius:4px;font-size:14px;letter-spacing:1px;">
          Share your feedback
        </a>
      </div>`,
  }),

  return_visit_nudge: ({ guestName, daysSinceVisit, offerDetail }) => ({
    subject: `We've been thinking of you, ${guestName.split(' ')[0]}`,
    preheader: `It has been a while — we'd love to welcome you back.`,
    bodyHtml: `
      <p style="font-size:18px;color:#2c1810;margin:0 0 16px;">We miss you, ${guestName.split(' ')[0]}.</p>
      <p style="color:#5c4a3a;line-height:1.7;">
        It's been ${daysSinceVisit} days since your last visit and we'd love to
        welcome you back. ${offerDetail ?? 'Our seasonal menu has some new additions we think you\'d enjoy.'}
      </p>
      <p style="color:#5c4a3a;line-height:1.7;">
        Reply to this email to make a reservation or book online anytime.
      </p>
      <p style="color:#5c4a3a;margin-top:24px;">Hope to see you soon,<br>The Ember Table team</p>`,
  }),
}

// ─────────────────────────────────────────────
// CORE SEND FUNCTION
// ─────────────────────────────────────────────

/**
 * Sends or queues a message based on its type.
 *
 * @param {Object} params
 * @param {string} params.type           - Message type (see AUTO_SEND_TYPES / APPROVAL_REQUIRED_TYPES)
 * @param {string} params.guestEmail     - Recipient email
 * @param {string} params.guestName      - Recipient name
 * @param {Object} params.templateVars   - Variables passed to the email template
 * @param {string} [params.customDraft]  - Override: use this text instead of a template (for AI-drafted messages)
 * @param {string} [params.guestId]      - Supabase guest ID (for DB write)
 * @param {string} [params.feedbackId]   - Supabase feedback ID to link message to
 *
 * @returns {Promise<MessageResult>}
 */
export async function sendOrQueueMessage({
  type,
  guestEmail,
  guestName,
  templateVars = {},
  customDraft = null,
  guestId = null,
  feedbackId = null,
}) {
  const requiresApproval = APPROVAL_REQUIRED_TYPES.has(type)
  const isAutoSend = AUTO_SEND_TYPES.has(type)

  // Build the email content
  let emailContent = null

  if (customDraft) {
    // AI-generated draft — wrap in base template
    emailContent = {
      subject: templateVars.subject ?? `A message from ${RESTAURANT_NAME}`,
      html: buildEmailHtml({
        subject: templateVars.subject ?? `A message from ${RESTAURANT_NAME}`,
        preheader: customDraft.slice(0, 80),
        bodyHtml: `<p style="color:#5c4a3a;line-height:1.7;white-space:pre-wrap;">${customDraft}</p>`,
      }),
    }
  } else if (templates[type]) {
    const built = templates[type]({ guestName, ...templateVars })
    emailContent = {
      subject: built.subject,
      html: buildEmailHtml(built),
    }
  } else {
    throw new Error(`Unknown message type: ${type}. Add it to templates or pass customDraft.`)
  }

  const result = {
    type,
    guestId,
    feedbackId,
    guestEmail,
    guestName,
    subject: emailContent.subject,
    status: null,       // 'sent' | 'queued' | 'draft_only'
    requiresApproval,
    sentAt: null,
    queuedAt: null,
    previewText: customDraft ?? templates[type]?.({ guestName, ...templateVars })?.preheader ?? '',
    error: null,
  }

  // ── APPROVAL REQUIRED — queue it, don't send ──
  if (requiresApproval) {
    result.status = 'queued'
    result.queuedAt = new Date().toISOString()
    console.log(`[QUEUED for approval] ${type} → ${guestEmail}`)
    return result
  }

  // ── AUTO-SEND — send it now ──
  if (isAutoSend) {
    if (!resend) {
      // No API key — demo-safe fallback: mark as sent, log the content
      console.log(`[DEMO MODE — no RESEND_API_KEY] Would have sent: ${type} → ${guestEmail}`)
      console.log(`Subject: ${emailContent.subject}`)
      result.status = 'sent'
      result.sentAt = new Date().toISOString()
      return result
    }

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: guestEmail,
        subject: emailContent.subject,
        html: emailContent.html,
      })
      result.status = 'sent'
      result.sentAt = new Date().toISOString()
      console.log(`[SENT] ${type} → ${guestEmail}`)
    } catch (err) {
      result.status = 'failed'
      result.error = err.message
      console.error(`[SEND FAILED] ${type} → ${guestEmail}: ${err.message}`)
    }

    return result
  }

  // Fallback — unknown type
  result.status = 'draft_only'
  return result
}

// ─────────────────────────────────────────────
// CONVENIENCE WRAPPERS — called by agent.js
// ─────────────────────────────────────────────

/**
 * Called automatically after analyzeReview() when score is 4–5.
 */
export async function sendThankYou({ guestEmail, guestName, visitDetail, guestId, feedbackId }) {
  return sendOrQueueMessage({
    type: 'thank_you_email',
    guestEmail,
    guestName,
    templateVars: { visitDetail },
    guestId,
    feedbackId,
  })
}

/**
 * Called automatically 24h before a reservation.
 */
export async function sendReservationReminder({ guestEmail, guestName, date, time, partySize, tableNote, guestId }) {
  return sendOrQueueMessage({
    type: 'reservation_reminder',
    guestEmail,
    guestName,
    templateVars: { date, time, partySize, tableNote },
    guestId,
  })
}

/**
 * Called automatically when a new reservation is confirmed.
 */
export async function sendReservationConfirmation({ guestEmail, guestName, date, time, partySize, occasion, guestId }) {
  return sendOrQueueMessage({
    type: 'reservation_confirmation',
    guestEmail,
    guestName,
    templateVars: { date, time, partySize, occasion },
    guestId,
  })
}

/**
 * Called automatically after a completed visit.
 */
export async function sendFeedbackRequest({ guestEmail, guestName, guestId }) {
  return sendOrQueueMessage({
    type: 'feedback_request',
    guestEmail,
    guestName,
    guestId,
  })
}

/**
 * Called automatically for guests lapsed 30+ days.
 */
export async function sendReturnVisitNudge({ guestEmail, guestName, daysSinceVisit, offerDetail, guestId }) {
  return sendOrQueueMessage({
    type: 'return_visit_nudge',
    guestEmail,
    guestName,
    templateVars: { daysSinceVisit, offerDetail },
    guestId,
  })
}

/**
 * Queues a recovery message (comp offer, apology, callback request).
 * Uses the AI-drafted message_draft from analyzeReview() output.
 * Manager must approve in dashboard before it sends.
 */
export async function queueRecoveryMessage({ guestEmail, guestName, draft, subject, recoveryType, guestId, feedbackId }) {
  return sendOrQueueMessage({
    type: recoveryType ?? 'comp_offer',
    guestEmail,
    guestName,
    customDraft: draft,
    templateVars: { subject },
    guestId,
    feedbackId,
  })
}
