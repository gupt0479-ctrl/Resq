import { NextResponse } from "next/server"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { getFinanceSummaryQuery } from "@/lib/queries/finance"

export async function GET() {
  const ctx = await getUserOrg()
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const summary = await getFinanceSummaryQuery(ctx.organizationId)
    return Response.json({ data: summary })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return Response.json({ error: message }, { status: 500 })
  }
}
