import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { listConnectors } from "@/lib/services/integrations"

export async function GET() {
  try {
    const client     = createServerSupabaseClient()
    const connectors = await listConnectors(client, DEMO_ORG_ID)

    const data = connectors.map((c: Record<string, unknown>) => ({
      id:          c.id,
      provider:    c.provider,
      displayName: c.display_name,
      status:      c.status,
      lastSyncAt:  c.last_sync_at ?? null,
      lastError:   c.last_error ?? null,
    }))

    return Response.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return Response.json({ error: message }, { status: 500 })
  }
}
