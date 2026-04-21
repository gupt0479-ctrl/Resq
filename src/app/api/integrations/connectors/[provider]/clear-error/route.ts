import { type NextRequest } from "next/server"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { clearConnectorError } from "@/lib/services/integrations"

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ provider: string }> }
) {
  const { provider } = await ctx.params

  if (!provider || typeof provider !== "string") {
    return Response.json({ error: "Missing provider" }, { status: 400 })
  }

  try {
    const ctx = await getUserOrg()
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const connector = await clearConnectorError(ctx.organizationId, provider)

    return Response.json({
      data: {
        id: connector.id,
        provider: connector.provider,
        status: connector.status,
        lastSyncAt: connector.lastSyncAt?.toISOString() ?? null,
        lastError: connector.lastError ?? null,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    const status = message.includes("not found") ? 404 : 500
    return Response.json({ error: message }, { status })
  }
}
