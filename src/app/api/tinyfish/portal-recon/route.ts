import { z } from "zod"
import { investigate } from "@/lib/services/portal-reconnaissance"
import type { PortalReconOptions } from "@/lib/tinyfish/portal-types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ─── Request Validation ────────────────────────────────────────────────────

const BodySchema = z.object({
  invoiceId:  z.string().min(1, "invoiceId is required"),
  customerId: z.string().optional(),
})

// ─── POST /api/tinyfish/portal-recon ───────────────────────────────────────

export async function POST(request: Request) {
  // 1. Parse JSON body
  let rawBody: unknown
  try {
    const text = await request.text()
    rawBody = text.length === 0 ? {} : JSON.parse(text)
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    )
  }

  // 2. Validate request parameters
  const parsed = BodySchema.safeParse(rawBody)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const field = first?.path.join(".") || "body"
    return Response.json(
      { error: `Invalid request: ${field} — ${first?.message ?? "invalid"}` },
      { status: 400 },
    )
  }

  const { invoiceId, customerId } = parsed.data

  // 3. Call Portal Reconnaissance Service
  try {
    const opts: PortalReconOptions = { invoiceId, customerId }
    const response = await investigate(opts)

    // 4. Return typed response — always 200 for successful reconnaissance
    return Response.json(response)
  } catch (err) {
    // 5. 500 only for truly unexpected server errors
    const message =
      err instanceof Error ? err.message : "Unexpected server error"
    console.error("[portal-recon] unexpected error:", message)
    return Response.json({ error: message }, { status: 500 })
  }
}
