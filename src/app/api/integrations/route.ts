import { getUserOrg } from "@/lib/auth/get-user-org"
import { listConnectors } from "@/lib/services/integrations"

export async function GET() {
  try {
    const ctx = await getUserOrg()
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const connectors = await listConnectors(ctx.organizationId)

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
