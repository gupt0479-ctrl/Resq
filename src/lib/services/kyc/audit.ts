import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

export async function logKycEvent(
  supabase: SupabaseClient,
  requestId: string,
  eventType: string,
  eventData?: Record<string, unknown>,
  actor: "system" | "client" | "operator" = "system"
): Promise<void> {
  await supabase.from("kyc_audit_trail").insert({
    request_id: requestId,
    event_type: eventType,
    event_data: eventData ?? null,
    actor,
  })
}

export async function getAuditTrail(
  supabase: SupabaseClient,
  requestId: string
) {
  const { data } = await supabase
    .from("kyc_audit_trail")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true })
  return data ?? []
}
