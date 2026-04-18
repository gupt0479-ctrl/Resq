import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
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
  client: SupabaseClient,
  input: RecordAiActionInput
): Promise<string> {
  // Prevent duplicate audit rows when a webhook is replayed after a partial failure.
  const { data: existingRows, error: existingErr } = await client
    .from("ai_actions")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("entity_type", input.entityType)
    .eq("entity_id", input.entityId)
    .eq("trigger_type", input.triggerType)
    .eq("action_type", input.actionType)
    .order("created_at", { ascending: false })
    .limit(1)

  if (existingErr) throw new Error(existingErr.message)
  const existingId = (existingRows ?? [])[0]?.id as string | undefined
  if (existingId) return existingId

  const { data, error } = await client
    .from("ai_actions")
    .insert({
      organization_id:       input.organizationId,
      entity_type:           input.entityType,
      entity_id:             input.entityId,
      trigger_type:          input.triggerType,
      action_type:           input.actionType,
      input_summary:         input.inputSummary,
      output_payload_json:   input.outputPayload,
      status:                input.status ?? "executed",
      executed_at:           input.status === "failed" ? null : new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error || !data) throw new Error(error?.message ?? "Failed to record ai_action")
  return data.id as string
}

export async function listRecentAiActions(
  client: SupabaseClient,
  organizationId: string,
  limit = 12
) {
  const { data, error } = await client
    .from("ai_actions")
    .select("id, entity_type, entity_id, trigger_type, action_type, input_summary, status, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data ?? []
}
