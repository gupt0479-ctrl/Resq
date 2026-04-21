import { type NextRequest, NextResponse } from "next/server"
import { getUserOrg } from "@/lib/auth/get-user-org"
import {
  generateAndPersistManagerSummary,
  getLatestManagerSummary,
} from "@/lib/services/ai-summaries"

/** GET — latest persisted manager summary (read-only). */
export async function GET() {
  try {
    const ctx = await getUserOrg()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const row = await getLatestManagerSummary(ctx.organizationId)
    if (!row) {
      return NextResponse.json({ data: null })
    }
    return NextResponse.json({
      data: {
        headline:    row.summary.headline,
        bullets:     row.summary.bullets,
        riskNote:    row.summary.riskNote ?? null,
        source:      row.source,
        generatedAt: row.generatedAt,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST — assemble facts from Postgres, generate summary (model or deterministic fallback),
 * persist to ai_summaries. Does not mutate invoices or ledger.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim()
  let authorizedBySecret = false

  // Always require a secret in production; reject when none is configured.
  if (!secret && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "CRON_SECRET must be set in production." },
      { status: 503 }
    )
  }

  if (secret) {
    const auth = request.headers.get("authorization")?.trim()
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    authorizedBySecret = true
  }

  try {
    const body = await request.json().catch(() => ({})) as { organizationId?: string }
    const ctx = authorizedBySecret ? null : await getUserOrg()
    const organizationId = body.organizationId ?? ctx?.organizationId
    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 })
    }

    const out = await generateAndPersistManagerSummary(organizationId)
    return NextResponse.json({
      data: {
        headline: out.summary.headline,
        bullets:  out.summary.bullets,
        riskNote: out.summary.riskNote ?? null,
        source:   out.source,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
