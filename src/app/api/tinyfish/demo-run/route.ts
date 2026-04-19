import { z } from "zod"
import { DEMO_ORG_ID, isDemoMode, isDatabaseConfigured } from "@/lib/env"
import { recordAiAction } from "@/lib/services/ai-actions"
import { runAgent, TinyFishError } from "@/lib/tinyfish/client"
import { TinyFishScenarioSchema } from "@/lib/tinyfish/schemas"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UuidSchema = z.string().uuid()

const BodySchema = z.object({
  scenario:       TinyFishScenarioSchema,
  organizationId: z.string().uuid().optional(),
  invoiceId:      z.string().uuid().optional(),
  customerName:   z.string().min(1).max(200).optional(),
  dryRun:         z.boolean().optional(),
})

const SCENARIO_ACTION: Record<z.infer<typeof TinyFishScenarioSchema>, string> = {
  collections:        "receivable_risk_detected",
  financing:          "financing_options_scouted",
  vendor:             "vendor_costs_compared",
  insurance:          "insurance_renewal_checked",
  full_survival_scan: "survival_scan_completed",
}

// Deterministic UUIDs per scenario so repeat demo runs collapse onto the same
// timeline rows instead of duplicating. Namespace: 0x...000A = "survival_agent".
const SCENARIO_DEMO_ENTITY_ID: Record<z.infer<typeof TinyFishScenarioSchema>, string> = {
  collections:        "00000000-0000-0000-000a-000000000005",
  financing:          "00000000-0000-0000-000a-000000000001",
  vendor:             "00000000-0000-0000-000a-000000000002",
  insurance:          "00000000-0000-0000-000a-000000000003",
  full_survival_scan: "00000000-0000-0000-000a-000000000004",
}

const SCENARIO_TASK: Record<z.infer<typeof TinyFishScenarioSchema>, string> = {
  collections:        "Investigate overdue receivables and assess customer payment risk.",
  financing:          "Scout SMB financing options to bridge near-term cashflow stress.",
  vendor:             "Compare supplier costs on top SKUs and flag price spikes.",
  insurance:          "Assess upcoming insurance renewal and recommend shopping action.",
  full_survival_scan: "Run full SMB survival scan: receivables, financing, vendors, insurance.",
}

export async function POST(request: Request) {
  let rawBody: unknown
  try {
    const text = await request.text()
    rawBody = text.length === 0 ? {} : JSON.parse(text)
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const parsedBody = BodySchema.safeParse(rawBody)
  if (!parsedBody.success) {
    const first = parsedBody.error.issues[0]
    const field = first?.path.join(".") || "body"
    return Response.json(
      { error: `Invalid body: ${field} ${first?.message ?? "invalid"}` },
      { status: 400 }
    )
  }

  const { scenario, invoiceId, customerName, dryRun } = parsedBody.data
  const organizationId = parsedBody.data.organizationId ?? DEMO_ORG_ID

  if (!UuidSchema.safeParse(organizationId).success) {
    return Response.json(
      { error: "organizationId must be a UUID" },
      { status: 400 }
    )
  }

  let runResult
  try {
    runResult = await runAgent(SCENARIO_TASK[scenario], {
      scenario,
      organizationId,
      invoiceId,
      customerName,
      dryRun,
    })
  } catch (err) {
    const message = err instanceof TinyFishError
      ? err.message
      : err instanceof Error
        ? err.message
        : "Unexpected TinyFish error"
    return Response.json({ error: message }, { status: 502 })
  }

  let aiActionId: string | null = null
  if (isDatabaseConfigured()) {
    try {
      const entityId = isDemoMode()
        ? SCENARIO_DEMO_ENTITY_ID[scenario]
        : crypto.randomUUID()

      aiActionId = await recordAiAction({
        organizationId,
        entityType:   "survival_agent",
        entityId,
        triggerType:  "tinyfish.demo_run",
        actionType:   SCENARIO_ACTION[scenario] as import("@/lib/constants/enums").AiActionType,
        inputSummary: summarizeInput({ scenario, customerName, invoiceId, dryRun }),
        outputPayload: {
          mode:             runResult.mode,
          summary:          runResult.summary,
          outputs:          runResult.outputs,
          degradedFromLive: runResult.degradedFromLive ?? false,
          warning:          runResult.warning ?? null,
        },
        status: "executed",
      })
    } catch (err) {
      // A logging failure must never 500 the demo route.
      console.warn("[tinyfish/demo-run] recordAiAction failed:",
        err instanceof Error ? err.message : err)
      aiActionId = null
    }
  }

  return Response.json({
    data: {
      scenario,
      mode:             runResult.mode,
      degradedFromLive: runResult.degradedFromLive ?? false,
      warning:          runResult.warning ?? null,
      result:           runResult,
      aiActionId,
    },
  })
}

function summarizeInput(input: {
  scenario: string
  customerName?: string
  invoiceId?: string
  dryRun?: boolean
}): string {
  const bits = [`scenario=${input.scenario}`]
  if (input.customerName) bits.push(`customer="${input.customerName}"`)
  if (input.invoiceId)    bits.push(`invoice=${input.invoiceId}`)
  if (input.dryRun)       bits.push("dryRun=true")
  return bits.join(" ")
}
