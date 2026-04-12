import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { getDashboardSummary } from "@/lib/queries/dashboard"

export async function GET() {
  try {
    const client = createServerSupabaseClient()
    const summary = await getDashboardSummary(client, DEMO_ORG_ID)
    return Response.json({ data: summary })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return Response.json({ error: message }, { status: 500 })
  }
}
