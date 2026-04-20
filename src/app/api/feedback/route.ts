import { NextResponse } from "next/server"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { getFeedbackPageData } from "@/lib/queries/feedback"

export async function GET() {
  try {
    const ctx = await getUserOrg()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const data = await getFeedbackPageData(ctx.organizationId)
    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
