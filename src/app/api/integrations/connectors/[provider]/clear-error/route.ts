import { type NextRequest } from "next/server"
import { DEMO_ORG_ID } from "@/lib/db"
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
    const connector = await clearConnectorError(DEMO_ORG_ID, provider)

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
