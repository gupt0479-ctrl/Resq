import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserOrg } from "@/lib/auth/get-user-org"
import * as schema from "@/lib/db/schema"
import { eq, and, inArray, asc } from "drizzle-orm"
import { runReceivablesInvestigation } from "@/lib/services/receivables-agent"
import { recordAiAction } from "@/lib/services/ai-actions"

// POST /api/receivables/investigate
// Body: { customerId?, invoiceId?, organizationId? }
export async function POST(req: NextRequest) {
  try {
    const ctx = await getUserOrg()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json().catch(() => ({})) as {
      customerId?:     string
      invoiceId?:      string
      organizationId?: string
    }
    const orgId = body.organizationId ?? ctx.organizationId

    let customerId = body.customerId
    let invoiceIds: string[] = body.invoiceId ? [body.invoiceId] : []

    // Resolve customerId from invoiceId when only an invoice is provided
    if (body.invoiceId && !customerId) {
      const [inv] = await db
        .select({ customerId: schema.invoices.customerId })
        .from(schema.invoices)
        .where(
          and(
            eq(schema.invoices.id, body.invoiceId),
            eq(schema.invoices.organizationId, orgId),
          ),
        )
        .limit(1)
      customerId = inv?.customerId
    }

    if (!customerId) {
      return NextResponse.json(
        { ok: false, error: "customerId or invoiceId is required" },
        { status: 400 },
      )
    }

    // Fall back to all open invoices for this customer
    if (invoiceIds.length === 0) {
      const rows = await db
        .select({ id: schema.invoices.id })
        .from(schema.invoices)
        .where(
          and(
            eq(schema.invoices.customerId, customerId),
            eq(schema.invoices.organizationId, orgId),
            inArray(schema.invoices.status, ["overdue", "sent", "pending"]),
          ),
        )
      invoiceIds = rows.map((i) => i.id)
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
    const ctx = await getUserOrg()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const orgId = ctx.organizationId

    const rows = await db
      .select()
      .from(schema.invoices)
      .leftJoin(schema.customers, eq(schema.invoices.customerId, schema.customers.id))
      .where(
        and(
          eq(schema.invoices.organizationId, orgId),
          inArray(schema.invoices.status, ["overdue", "sent", "pending"]),
        ),
      )
      .orderBy(asc(schema.invoices.dueAt))
      .limit(50)

    const invoices = rows.map((row) => {
      const inv = row.invoices
      const cust = row.customers

      const daysOverdue = inv.dueAt
        ? Math.max(
            0,
            Math.floor(
              (Date.now() - new Date(inv.dueAt.toISOString()).getTime()) / (1000 * 60 * 60 * 24),
            ),
          )
        : 0

      return {
        invoiceId:              inv.id,
        invoiceNumber:          inv.invoiceNumber,
        status:                 inv.status,
        balance:                Number(inv.totalAmount) - Number(inv.amountPaid),
        dueAt:                  inv.dueAt?.toISOString(),
        daysOverdue,
        reminderCount:          inv.reminderCount,
        customerId:             inv.customerId,
        customerName:           cust?.fullName ?? "Unknown",
        customerEmail:          cust?.email ?? null,
        customerRiskStatus:     cust?.riskStatus ?? "none",
        customerLifetimeValue:  Number(cust?.lifetimeValue ?? 0),
      }
    })

    return NextResponse.json({ ok: true, invoices })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
