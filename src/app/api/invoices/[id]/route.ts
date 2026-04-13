import { type NextRequest } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { getInvoiceDetailQuery } from "@/lib/queries/invoices"

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    const client  = createServerSupabaseClient()
    const data    = await getInvoiceDetailQuery(client, id, DEMO_ORG_ID)

    return Response.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    const status  = message.includes("not found") ? 404 : 500
    return Response.json({ error: message }, { status })
  }
}
