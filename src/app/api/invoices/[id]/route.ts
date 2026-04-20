import { type NextRequest, NextResponse } from "next/server"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { getInvoiceDetailQuery } from "@/lib/queries/invoices"

export async function GET(
  _req: NextRequest,
  routeCtx: { params: Promise<{ id: string }> }
) {
  const ctx = await getUserOrg()
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await routeCtx.params
    const data    = await getInvoiceDetailQuery(id, ctx.organizationId)

    return Response.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    const status  = message.includes("not found") ? 404 : 500
    return Response.json({ error: message }, { status })
  }
}
