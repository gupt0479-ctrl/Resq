import { type NextRequest } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { ingestWebhookPayload } from "@/lib/services/integrations"
import { normalizeWebhookPayload } from "@/lib/schemas/integrations"

/**
 * MCP bridge ingress endpoint.
 * Validates the payload, stores raw + normalised data, deduplicates by
 * external_event_id, and returns 202 Accepted so n8n can move on.
 *
 * POST /api/integrations/webhooks/:provider
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ provider: string }> }
) {
  const { provider } = await ctx.params

  if (!provider || typeof provider !== "string") {
    return Response.json({ error: "Missing provider" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  let payload
  try {
    payload = normalizeWebhookPayload(body)
  } catch (error) {
    const details = error instanceof Error ? error.message : "Payload validation failed"
    return Response.json(
      { error: "Payload validation failed", details },
      { status: 422 }
    )
  }

  try {
    const client = createServerSupabaseClient()
    const result = await ingestWebhookPayload(
      client,
      DEMO_ORG_ID,
      provider,
      payload,
      body as Record<string, unknown>
    )

    return Response.json(
      {
        accepted: true,
        skipped:  result.skipped,
        syncEventId: result.syncEventId || null,
        normalizedEvent: result.normalized_domain_event,
      },
      { status: 202 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return Response.json({ error: message }, { status: 500 })
  }
}
