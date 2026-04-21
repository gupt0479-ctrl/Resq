import { type NextRequest, NextResponse } from "next/server"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { sendInvoice } from "@/lib/services/invoices"
import { SendInvoiceBodySchema } from "@/lib/schemas/invoice"

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

    const parsed = SendInvoiceBodySchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 422 }
      )
    }

    await sendInvoice(id, ctx.organizationId, parsed.data.notes)

    return Response.json({ data: { invoiceId: id, status: "sent" } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    const status  = message.includes("not found") ? 404 : 400
    return Response.json({ error: message }, { status })
  }
}
