import { getTinyFishMode, TINYFISH_API_KEY } from "@/lib/env"
import { healthCheck } from "@/lib/tinyfish/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _: Request,
  ctx: { params: Promise<{ runId: string }> }
): Promise<Response> {
  const { runId } = await ctx.params

  if (!runId || typeof runId !== "string") {
    return Response.json({ error: "runId is required" }, { status: 400 })
  }

  const mode = getTinyFishMode()

  // Mock mode
  if (mode === "mock") {
    const now = new Date().toISOString()
    return Response.json(
      {
        runId,
        status: "COMPLETED",
        startedAt: now,
        completedAt: now,
        result: {
          ok: true,
          fixture: true,
          summary: "Survival scan complete (mock). 3 financing offers surfaced — best fit is BlueVine (12% APR, same-day decision).",
          steps: [
            { index: 0, label: "search_financing_sources", observation: "Queried 3 financing searches, kept 3 candidate pages.", durationMs: 420 },
            { index: 1, label: "fetch_candidate_pages", observation: "Fetched 3 lender pages for content extraction.", durationMs: 610 },
            { index: 2, label: "normalize_financing_offers", observation: "Normalized 3 financing offers into stable output shape.", durationMs: 180 },
          ],
        },
        mode: "mock",
      },
      { status: 200 }
    )
  }

  // Misconfigured mode
  if (mode === "misconfigured") {
    const health = await healthCheck()
    const msg = health.details || "TinyFish live mode misconfigured."
    return Response.json(
      { runId, status: "FAILED", error: msg, mode: "misconfigured" },
      { status: 200 }
    )
  }

  // Live mode
  try {
    const upstream = await fetch(
      `https://agent.tinyfish.ai/v1/runs/${encodeURIComponent(runId)}`,
      {
        method: "GET",
        headers: { "X-API-Key": TINYFISH_API_KEY },
      }
    )

    if (!upstream.ok) {
      return Response.json(
        { runId, status: "FAILED", error: `upstream HTTP ${upstream.status}`, mode: "live" },
        { status: 502 }
      )
    }

    const raw = await upstream.json()
    const status = typeof raw?.status === "string" && raw.status.trim().length > 0
      ? raw.status
      : "UNKNOWN"
    const result = raw?.result
    const error = raw?.error
    return Response.json(
      { runId, status, result, error, mode: "live", raw },
      { status: 200 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json(
      { runId, status: "FAILED", error: message, mode: "live" },
      { status: 502 }
    )
  }
}
