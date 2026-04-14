import { type NextRequest } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
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
    const client = createServerSupabaseClient()
    const connector = await clearConnectorError(client, DEMO_ORG_ID, provider)

    return Response.json({
      data: {
        id: connector.id,
        provider: connector.provider,
        status: connector.status,
        lastSyncAt: connector.last_sync_at ?? null,
        lastError: connector.last_error ?? null,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    const status = message.includes("not found") ? 404 : 500
    return Response.json({ error: message }, { status })
  }
}
