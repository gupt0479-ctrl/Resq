import { type NextRequest } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { markInvoicePaid } from "@/lib/services/invoices"
import { MarkPaidBodySchema } from "@/lib/schemas/invoice"

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params

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

    const client = createServerSupabaseClient()
    await markInvoicePaid(client, id, DEMO_ORG_ID, {
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
