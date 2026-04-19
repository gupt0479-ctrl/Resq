import { getTinyFishMode, TINYFISH_API_KEY } from "@/lib/env"
import { healthCheck } from "@/lib/tinyfish/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request): Promise<Response> {
  const mode = getTinyFishMode()

  // Body parsing and validation
  let url: string
  let goal: string
  try {
    const body = await request.json()
    url = body?.url
    goal = body?.goal
  } catch {
    return Response.json({ error: "url and goal are required" }, { status: 400 })
  }

  if (!url || typeof url !== "string" || !goal || typeof goal !== "string") {
    return Response.json({ error: "url and goal are required" }, { status: 400 })
  }

  // Mock mode
  if (mode === "mock") {
    return Response.json(
      { runId: "mock_run_001", status: "PENDING", mode: "mock" },
      { status: 202 }
    )
  }

  // Misconfigured mode
  if (mode === "misconfigured") {
    const health = await healthCheck()
    const msg = health.details || "TinyFish live mode misconfigured."
    return Response.json(
      { runId: "misconfigured_run_001", status: "FAILED", error: msg, mode: "misconfigured" },
      { status: 202 }
    )
  }

  // Live mode
  try {
    const upstream = await fetch("https://agent.tinyfish.ai/v1/automation/run-async", {
      method: "POST",
      headers: {
        "X-API-Key": TINYFISH_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, goal }),
    })

    if (!upstream.ok) {
      return Response.json(
        { runId: "error", status: "FAILED", error: `upstream HTTP ${upstream.status}`, mode: "live" },
        { status: 502 }
      )
    }

    const data = await upstream.json()
    const runId = typeof data?.run_id === "string" && data.run_id.trim().length > 0
      ? data.run_id
      : null

    if (!runId) {
      return Response.json(
        { runId: "error", status: "FAILED", error: "TinyFish upstream response missing run_id", mode: "live" },
        { status: 502 }
      )
    }

    return Response.json(
      { runId, status: "PENDING", mode: "live" },
      { status: 202 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json(
      { runId: "error", status: "FAILED", error: message, mode: "live" },
      { status: 502 }
    )
  }
}
