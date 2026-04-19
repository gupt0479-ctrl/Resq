import { getTinyFishMode, TINYFISH_API_KEY } from "@/lib/env"
import { healthCheck } from "@/lib/tinyfish/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  }
}

function encodeEvent(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`
}

function errorStream(mode: string, error: string): ReadableStream {
  return new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      controller.enqueue(enc.encode(encodeEvent({ type: "MODE", mode })))
      controller.enqueue(enc.encode(encodeEvent({ type: "ERROR", error })))
      controller.close()
    },
  })
}

function prependModeEvent(mode: string, upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder()
      controller.enqueue(enc.encode(encodeEvent({ type: "MODE", mode })))

      const reader = upstream.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (value) controller.enqueue(value)
        }
        controller.close()
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        controller.enqueue(enc.encode(encodeEvent({ type: "ERROR", error: message })))
        controller.close()
      } finally {
        reader.releaseLock()
      }
    },
  })
}

export async function POST(request: Request): Promise<Response> {
  const mode = getTinyFishMode()

  // Body parsing and validation — runs before mode check
  let url: string
  let goal: string
  try {
    const body = await request.json()
    url = body?.url
    goal = body?.goal
  } catch {
    return new Response(errorStream(mode, "Invalid JSON body"), { headers: sseHeaders() })
  }

  if (!url || typeof url !== "string" || !goal || typeof goal !== "string") {
    return new Response(errorStream(mode, "url and goal are required"), { headers: sseHeaders() })
  }

  // Mock mode
  if (mode === "mock") {
    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder()
        const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

        controller.enqueue(enc.encode(encodeEvent({ type: "MODE", mode: "mock" })))
        await delay(220)
        controller.enqueue(enc.encode(encodeEvent({ type: "STEP", index: 1, label: "mock_start" })))
        await delay(240)
        controller.enqueue(enc.encode(encodeEvent({ type: "STEP", index: 2, label: "mock_extract" })))
        await delay(240)
        controller.enqueue(enc.encode(encodeEvent({ type: "DONE" })))
        controller.close()
      },
    })
    return new Response(stream, { headers: sseHeaders() })
  }

  // Misconfigured mode
  if (mode === "misconfigured") {
    const health = await healthCheck()
    const msg = health.details || "TinyFish live mode misconfigured."
    return new Response(errorStream("misconfigured", msg), { headers: sseHeaders() })
  }

  // Live mode
  try {
    const upstream = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
      method: "POST",
      headers: {
        "X-API-Key": TINYFISH_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, goal }),
    })

    if (!upstream.ok) {
      const text = await upstream.text()
      return new Response(
        errorStream("live", `upstream HTTP ${upstream.status}: ${text}`),
        { headers: sseHeaders() }
      )
    }

    if (!upstream.body) {
      return new Response(
        errorStream("live", "TinyFish SSE upstream returned no body."),
        { headers: sseHeaders() }
      )
    }

    return new Response(prependModeEvent("live", upstream.body), { headers: sseHeaders() })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(errorStream("live", message), { headers: sseHeaders() })
  }
}
