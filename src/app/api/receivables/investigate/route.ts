import { NextRequest, NextResponse } from "next/server"
import { DEMO_ORG_ID } from "@/lib/db"
import { createServerSupabaseClient } from "@/lib/db/supabase-server"
import { runReceivablesInvestigation } from "@/lib/services/receivables-agent"
import { recordAiAction } from "@/lib/services/ai-actions"

// POST /api/receivables/investigate
// Body: { customerId?, invoiceId?, organizationId? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as {
      customerId?:     string
      invoiceId?:      string
      organizationId?: string
    }
    const orgId  = body.organizationId ?? DEMO_ORG_ID
    const client = createServerSupabaseClient()

    let customerId = body.customerId
    let invoiceIds: string[] = body.invoiceId ? [body.invoiceId] : []

    // Resolve customerId from invoiceId when only an invoice is provided
    if (body.invoiceId && !customerId) {
      const { data: inv } = await client
        .from("invoices")
        .select("customer_id")
        .eq("id", body.invoiceId)
        .eq("organization_id", orgId)
        .single()
      customerId = inv?.customer_id as string | undefined
    }

    if (!customerId) {
      return NextResponse.json(
        { ok: false, error: "customerId or invoiceId is required" },
        { status: 400 },
      )
    }

    // Fall back to all open invoices for this customer
    if (invoiceIds.length === 0) {
      const { data: rows } = await client
        .from("invoices")
        .select("id")
        .eq("customer_id", customerId)
        .eq("organization_id", orgId)
        .in("status", ["overdue", "sent", "pending"])
      invoiceIds = (rows ?? []).map((r: { id: string }) => r.id)
    }

    if (invoiceIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No open invoices found for this customer" },
        { status: 404 },
      )
    }

    const result = await runReceivablesInvestigation({
      customerId,
      invoiceIds,
      organizationId: orgId,
    })

    await recordAiAction({
      organizationId: orgId,
      entityType:     "invoice",
      entityId:       invoiceIds[0],
      triggerType:    "invoice.overdue",
      actionType:     "receivable_risk_detected",
      inputSummary:   `${result.customerName} · ${result.totalOverdue.toFixed(2)} overdue · ${result.overdueDays}d`,
      outputPayload: {
        riskScore:          result.riskScore,
        riskLevel:          result.riskLevel,
        recommendedAction:  result.recommendedAction,
        verificationChecks: result.verificationChecks,
      },
      status: "executed",
    })

    return NextResponse.json({ ok: true, result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

// GET /api/receivables/investigate?orgId=...
// Returns all open invoices enriched with basic risk signals for the Rescue Queue UI
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orgId  = searchParams.get("orgId") ?? DEMO_ORG_ID
    const client = createServerSupabaseClient()

    const { data: rows, error } = await client
      .from("invoices")
      .select("id, invoice_number, status, total_amount, amount_paid, due_at, reminder_count, customer_id, customers ( full_name, email, risk_status, lifetime_value )")
      .eq("organization_id", orgId)
      .in("status", ["overdue", "sent", "pending"])
      .order("due_at", { ascending: true })
      .limit(50)

    if (error) throw new Error(error.message)

    const now = Date.now()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoices = (rows ?? []).map((row: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cust = (Array.isArray(row.customers) ? row.customers[0] : row.customers) as any
      const daysOverdue = row.due_at
        ? Math.max(0, Math.floor((now - new Date(row.due_at as string).getTime()) / 86_400_000))
        : 0
      return {
        invoiceId:             row.id,
        invoiceNumber:         row.invoice_number,
        status:                row.status,
        balance:               Number(row.total_amount) - Number(row.amount_paid),
        dueAt:                 row.due_at,
        daysOverdue,
        reminderCount:         row.reminder_count,
        customerId:            row.customer_id,
        customerName:          cust?.full_name ?? "Unknown",
        customerEmail:         cust?.email ?? null,
        customerRiskStatus:    cust?.risk_status ?? "none",
        customerLifetimeValue: Number(cust?.lifetime_value ?? 0),
      }
    })

    return NextResponse.json({ ok: true, invoices })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
