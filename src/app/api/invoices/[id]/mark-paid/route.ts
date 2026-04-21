import { type NextRequest, NextResponse } from "next/server"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { markInvoicePaid } from "@/lib/services/invoices"
import { MarkPaidBodySchema } from "@/lib/schemas/invoice"

export async function POST(
  request: NextRequest,
  routeCtx: { params: Promise<{ id: string }> }
) {
  const ctx = await getUserOrg()
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await routeCtx.params

    let body: unknown = {}
    try {
      body = await request.json()
    } catch {
      // empty body is fine
    }

    const parsed = MarkPaidBodySchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 422 }
      )
    }

    await markInvoicePaid(id, ctx.organizationId, {
      paymentMethod: parsed.data.paymentMethod,
      amountPaid:    parsed.data.amountPaid,
      notes:         parsed.data.notes,
    })

    return Response.json({ data: { invoiceId: id, status: "paid" } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    const status  = message.includes("not found") ? 404 : 400
    return Response.json({ error: message }, { status })
  }
}
