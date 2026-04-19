import "server-only"
import { Resend } from "resend"

const TONE_SUBJECTS: Record<string, string> = {
  friendly:      "A quick note about your invoice",
  firm:          "Invoice follow-up required",
  formal:        "Formal payment notice — action required",
  urgent:        "Urgent: overdue invoice — immediate action needed",
}

function buildHtml(body: string, tone: string): string {
  const borderColor = tone === "urgent" || tone === "formal" ? "#dc2626" : tone === "firm" ? "#d97706" : "#14b8a6"
  const lines = body.split("\n").map(l => l.trim() ? `<p style="margin:0 0 12px;line-height:1.6">${l}</p>` : "<br/>").join("")
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:600px;margin:40px auto;padding:0 24px;color:#1a1a1a">
<div style="border-left:4px solid ${borderColor};padding-left:20px;margin-bottom:24px">${lines}</div>
<p style="font-size:11px;color:#888;margin-top:32px">Sent by Resq · Powered by AI collections</p>
</body></html>`
}

export async function sendOutreachEmail(params: {
  toEmail:      string
  toName:       string
  body:         string
  tone:         string
  fromName?:    string
}): Promise<{ sent: boolean; messageId?: string; mode: "live" | "mock" }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { sent: true, mode: "mock" }
  }

  const resend  = new Resend(apiKey)
  const subject = TONE_SUBJECTS[params.tone] ?? TONE_SUBJECTS.firm
  const html    = buildHtml(params.body, params.tone)

  const { data, error } = await resend.emails.send({
    from:    `${params.fromName ?? "Resq Collections"} <collections@resq.app>`,
    to:      [params.toEmail],
    subject,
    html,
    text:    params.body,
  })

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Resend email failed")
  }

  return { sent: true, messageId: data.id, mode: "live" }
}
