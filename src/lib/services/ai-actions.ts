import "server-only"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { eq, and, desc } from "drizzle-orm"
import type { AiActionStatus, AiActionType } from "@/lib/constants/enums"

export interface RecordAiActionInput {
  organizationId:   string
  entityType:       string
  entityId:         string
  triggerType:      string
  actionType:       AiActionType
  inputSummary:     string
  outputPayload:    Record<string, unknown> | null
  status?:          AiActionStatus
}

async function insertAction(input: RecordAiActionInput): Promise<string> {
  const [row] = await db
    .insert(schema.aiActions)
    .values({
      organizationId:    input.organizationId,
      entityType:        input.entityType,
      entityId:          input.entityId,
      triggerType:       input.triggerType,
      actionType:        input.actionType,
      inputSummary:      input.inputSummary,
      outputPayloadJson: input.outputPayload,
      status:            input.status ?? "executed",
      executedAt:        input.status === "failed" ? null : new Date(),
    })
    .returning({ id: schema.aiActions.id })

  if (!row) throw new Error("Failed to record ai_action")
  return row.id
}

// Overload: (client, input) — legacy call sites that pass a Supabase client (ignored now)
export async function recordAiAction(client: unknown, input: RecordAiActionInput): Promise<string>
// Overload: (input) — direct call
export async function recordAiAction(input: RecordAiActionInput): Promise<string>
export async function recordAiAction(
  clientOrInput: unknown,
  input?: RecordAiActionInput
): Promise<string> {
  const actualInput = input ?? (clientOrInput as RecordAiActionInput)
  return insertAction(actualInput)
}

export async function listRecentAiActions(
  _clientOrOrgId: unknown,
  organizationIdOrLimit?: string | number,
  limit = 12
) {
  // Support both (orgId, limit) and (client, orgId, limit) call patterns
  const orgId  = typeof organizationIdOrLimit === "string" ? organizationIdOrLimit : (_clientOrOrgId as string)
  const lim    = typeof organizationIdOrLimit === "number" ? organizationIdOrLimit : limit

  const data = await db
    .select({
      id:           schema.aiActions.id,
      entityType:   schema.aiActions.entityType,
      entityId:     schema.aiActions.entityId,
      triggerType:  schema.aiActions.triggerType,
      actionType:   schema.aiActions.actionType,
      inputSummary: schema.aiActions.inputSummary,
      status:       schema.aiActions.status,
      createdAt:    schema.aiActions.createdAt,
    })
    .from(schema.aiActions)
    .where(eq(schema.aiActions.organizationId, orgId))
    .orderBy(desc(schema.aiActions.createdAt))
    .limit(lim)

  return data
}
