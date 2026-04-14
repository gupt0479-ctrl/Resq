import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { markOverdueInvoices } from "@/lib/services/invoices"

async function runJob(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim()
  if (secret) {
    const auth = request.headers.get("authorization")?.trim()
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "CRON_SECRET must be set in production to run this job." },
      { status: 503 }
    )
  }

  try {
    const client = createServerSupabaseClient()
    const updated = await markOverdueInvoices(client, DEMO_ORG_ID)
    return NextResponse.json({ data: { invoicesMarkedOverdue: updated } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/cron/mark-overdue-invoices
 * Vercel Cron Jobs invoke this route via HTTP GET.
 * When CRON_SECRET is set, requires Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(request: NextRequest) {
  return runJob(request)
}

/**
 * POST /api/cron/mark-overdue-invoices
 * Kept for manual/curl invocations.
 */
export async function POST(request: NextRequest) {
  return runJob(request)
}
