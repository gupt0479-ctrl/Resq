import { DEMO_ORG_ID } from "@/lib/db"
import { getFinanceSummaryQuery } from "@/lib/queries/finance"

export async function GET() {
  try {
    const summary = await getFinanceSummaryQuery(DEMO_ORG_ID)
    return Response.json({ data: summary })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return Response.json({ error: message }, { status: 500 })
  }
}
