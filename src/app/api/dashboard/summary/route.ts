import { NextResponse } from "next/server"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { getDashboardSummary } from "@/lib/queries/dashboard"

export async function GET() {
  try {
    const ctx = await getUserOrg()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const summary = await getDashboardSummary(ctx.organizationId)
    return NextResponse.json({ data: summary })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
