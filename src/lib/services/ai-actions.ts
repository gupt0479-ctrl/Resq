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

export async function recordAiAction(
  input: RecordAiActionInput
): Promise<string> {
  // Prevent duplicate audit rows when a webhook is replayed after a partial failure.
  const existingRows = await db
    .select({ id: schema.aiActions.id })
    .from(schema.aiActions)
    .where(
      and(
        eq(schema.aiActions.organizationId, input.organizationId),
        eq(schema.aiActions.entityType, input.entityType),
        eq(schema.aiActions.entityId, input.entityId),
        eq(schema.aiActions.triggerType, input.triggerType),
        eq(schema.aiActions.actionType, input.actionType),
      ),
    )
    .orderBy(desc(schema.aiActions.createdAt))
    .limit(1)

  const existingId = existingRows[0]?.id
  if (existingId) return existingId

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

export async function listRecentAiActions(
  organizationId: string,
  limit = 12
) {
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
    .where(eq(schema.aiActions.organizationId, organizationId))
    .orderBy(desc(schema.aiActions.createdAt))
    .limit(limit)

  return data
}
