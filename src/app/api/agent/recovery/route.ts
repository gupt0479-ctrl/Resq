import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import {
  buildRecoveryQueue,
  runRecoveryAgent,
  runRecoveryActionOnInvoice,
  getRecoveryAuditTrail,
  getOverdueInvoices,
  getClientCreditScore,
  getAllClientCreditScores,
  getClientReminderHistory,
} from "@/lib/services/recovery-agent"
import { z } from "zod"

// ─── GET /api/agent/recovery ─────────────────────────────────────────────
//
// ?view=(default)              → prioritized queue with summary counts
// ?view=audit                  → agent action audit trail
// ?view=credits                → all client credit scores ranked by score
// ?view=credit&customerId=uuid → single client credit score (404 if not scored yet)
// ?view=reminders&customerId=uuid → outbound reminder history for a client

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orgId  = searchParams.get("orgId") ?? DEMO_ORG_ID
    const view   = searchParams.get("view")
    const client = createServerSupabaseClient()

    if (view === "audit") {
      const limit = Math.min(200, Number(searchParams.get("limit") ?? "50"))
      const trail = await getRecoveryAuditTrail(client, orgId, limit)
      return NextResponse.json({ ok: true, trail })
    }

    if (view === "credits") {
      const scores = await getAllClientCreditScores(client, orgId)
      return NextResponse.json({ ok: true, scores })
    }

    if (view === "credit") {
      const customerId = searchParams.get("customerId")
      if (!customerId) {
        return NextResponse.json({ ok: false, error: "customerId is required for view=credit" }, { status: 400 })
      }
      const score = await getClientCreditScore(client, orgId, customerId)
      if (!score) {
        return NextResponse.json(
          { ok: false, error: "No credit score found for this client. Run the recovery agent first to generate scores." },
          { status: 404 }
        )
      }
      return NextResponse.json({ ok: true, score })
    }

    if (view === "reminders") {
      const customerId = searchParams.get("customerId")
      if (!customerId) {
        return NextResponse.json({ ok: false, error: "customerId is required for view=reminders" }, { status: 400 })
      }
      const limit = Math.min(100, Number(searchParams.get("limit") ?? "25"))
      const reminders = await getClientReminderHistory(client, orgId, customerId, limit)
      return NextResponse.json({ ok: true, reminders })
    }

    // Default: prioritized queue
    const queue = await buildRecoveryQueue(client, orgId)

    const overdueCount        = queue.length
    const criticalCount       = queue.filter((i) => i.risk_score >= 80).length
    const totalAtRisk         = queue.reduce((s, i) => s + i.balance, 0)
    const financingEscalations = queue.filter((i) => i.risk_score >= 65).length
    const stripeRemindersReady = queue.filter((i) => !!i.stripe_customer_id).length

    return NextResponse.json({
      ok: true,
      overdueCount,
      criticalCount,
      totalAtRisk,
      financingEscalations,
      stripeRemindersReady,
      queue,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

// ─── POST /api/agent/recovery ────────────────────────────────────────────
// Body: { mode: "batch"|"single", invoiceId?, dryRun: bool, maxInvoices: number }

const PostBodySchema = z.object({
  mode:        z.enum(["batch", "single"]).default("batch"),
  invoiceId:   z.string().uuid().optional(),
  dryRun:      z.boolean().default(false),
  maxInvoices: z.number().int().min(1).max(100).default(20),
  orgId:       z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const raw    = await req.json().catch(() => ({}))
    const parsed = PostBodySchema.safeParse(raw)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid request body", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { mode, invoiceId, dryRun, maxInvoices, orgId: bodyOrgId } = parsed.data
    const orgId  = bodyOrgId ?? DEMO_ORG_ID
    const client = createServerSupabaseClient()

    if (mode === "single") {
      if (!invoiceId) {
        return NextResponse.json(
          { ok: false, error: "invoiceId is required for single mode" },
          { status: 400 }
        )
      }

      const invoices = await getOverdueInvoices(client, orgId)
      const invoice  = invoices.find((i) => i.id === invoiceId)

      if (!invoice) {
        return NextResponse.json(
          { ok: false, error: "Invoice not found or not eligible for recovery" },
          { status: 404 }
        )
      }

      const result = await runRecoveryActionOnInvoice(invoice, orgId, client, dryRun)
      return NextResponse.json({ ok: true, result, dryRun })
    }

    // batch
    const result = await runRecoveryAgent(client, orgId, { maxInvoices, dryRun })

    const summary =
      dryRun
        ? `Dry run complete. Scored ${result.processed + result.skipped} invoice(s), ${result.financingEscalations} flagged for financing. No mutations made.`
        : `Agent run complete. Processed ${result.processed} invoice(s), ${result.escalated} escalated, ${result.financingEscalations} flagged for financing, ${result.errors} error(s).`

    return NextResponse.json({
      ok: true,
      processed:            result.processed,
      results:              result.actions,
      financingEscalations: result.financingEscalations,
      summary,
      dryRun,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

/*
 * ─── Stripe webhook ingest handler ───────────────────────────────────────
 *
 * Move this block to: src/app/api/integrations/webhooks/stripe/route.ts
 *
 * import { NextRequest, NextResponse } from "next/server"
 * import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
 *
 * export const config = { api: { bodyParser: false } }
 *
 * export async function POST(req: NextRequest) {
 *   const rawBody = await req.text()
 *   let payload: Record<string, unknown>
 *   try {
 *     payload = JSON.parse(rawBody)
 *   } catch {
 *     return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
 *   }
 *
 *   const stripeEventId   = payload.id as string
 *   const eventType       = payload.type as string
 *   const stripeCustomerId = (payload.data as Record<string, unknown> | undefined)
 *     ?.object &&
 *     ((payload.data as { object: { customer?: string } }).object.customer ?? null)
 *
 *   if (!stripeEventId || !eventType) {
 *     return NextResponse.json({ error: "Missing event id or type" }, { status: 400 })
 *   }
 *
 *   const client = createServerSupabaseClient()
 *   const orgId  = DEMO_ORG_ID
 *
 *   await client.from("stripe_events").upsert(
 *     {
 *       organization_id:    orgId,
 *       stripe_event_id:    stripeEventId,
 *       stripe_customer_id: stripeCustomerId ?? null,
 *       event_type:         eventType,
 *       payload_json:       payload,
 *       processed_at:       new Date().toISOString(),
 *     },
 *     { onConflict: "stripe_event_id", ignoreDuplicates: true }
 *   )
 *
 *   return NextResponse.json({ received: true })
 * }
 */
