import { DEMO_ORG_ID } from "@/lib/db"
import { listConnectors } from "@/lib/services/integrations"

export async function GET() {
  try {
    const connectors = await listConnectors(DEMO_ORG_ID)

    const data = connectors.map((c) => ({
      id:          c.id,
      provider:    c.provider,
      displayName: c.displayName,
      status:      c.status,
      lastSyncAt:  c.lastSyncAt?.toISOString() ?? null,
      lastError:   c.lastError ?? null,
    }))

    return Response.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return Response.json({ error: message }, { status: 500 })
  }
}
