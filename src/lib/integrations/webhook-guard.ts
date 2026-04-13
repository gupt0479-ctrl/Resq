import { timingSafeEqual } from "node:crypto"
import { type NextRequest, NextResponse } from "next/server"

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8")
  const bb = Buffer.from(b, "utf8")
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

/**
 * Returns a NextResponse when the request must be rejected; otherwise null.
 * Production requires INTEGRATIONS_WEBHOOK_SECRET. Local dev may set
 * INTEGRATIONS_WEBHOOK_ALLOW_UNSIGNED=true when the secret is unset.
 */
export function integrationWebhookAuthError(request: NextRequest): NextResponse | null {
  const secret = process.env.INTEGRATIONS_WEBHOOK_SECRET?.trim()
  const hdr =
    request.headers.get("x-webhook-secret")?.trim() ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ??
    ""

  if (secret) {
    if (!hdr || !safeEqual(hdr, secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return null
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "INTEGRATIONS_WEBHOOK_SECRET is required in production." },
      { status: 503 }
    )
  }

  if (process.env.INTEGRATIONS_WEBHOOK_ALLOW_UNSIGNED !== "true") {
    return NextResponse.json(
      {
        error:
          "Set INTEGRATIONS_WEBHOOK_SECRET or INTEGRATIONS_WEBHOOK_ALLOW_UNSIGNED=true for unsigned local webhooks.",
      },
      { status: 401 }
    )
  }

  return null
}

const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 80
const hits = new Map<string, number[]>()

function prune(ip: string, now: number): number[] {
  const arr = hits.get(ip) ?? []
  return arr.filter((t) => now - t < WINDOW_MS)
}

export function integrationWebhookRateLimitError(
  request: NextRequest
): NextResponse | null {
  const forwarded = request.headers.get("x-forwarded-for")
  const ip =
    forwarded?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim() ??
    "unknown"
  const now = Date.now()
  const recent = prune(ip, now)
  recent.push(now)
  hits.set(ip, recent)
  if (recent.length > MAX_PER_WINDOW) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }
  return null
}
