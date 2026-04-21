import { type NextRequest, NextResponse } from "next/server"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { listInvoicesQuery } from "@/lib/queries/invoices"
import { INVOICE_STATUS } from "@/lib/constants/enums"
import type { InvoiceStatus } from "@/lib/constants/enums"

export async function GET(request: NextRequest) {
  const ctx = await getUserOrg()
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = request.nextUrl
    const rawStatus = searchParams.get("status")
    const limit     = Number(searchParams.get("limit") ?? "50")
    const offset    = Number(searchParams.get("offset") ?? "0")

    const status: InvoiceStatus | undefined =
      rawStatus && INVOICE_STATUS.includes(rawStatus as InvoiceStatus)
        ? (rawStatus as InvoiceStatus)
        : undefined

    const invoices = await listInvoicesQuery(ctx.organizationId, { status, limit, offset })

    return Response.json({ data: invoices, count: invoices.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return Response.json({ error: message }, { status: 500 })
  }
}
