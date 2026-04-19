import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

export interface RescueInvoice {
  id: string
  invoiceNumber: string
  customerName: string
  customerEmail?: string
  amount: number
  dueDate: string | null
  daysOverdue: number
  riskScore: number   // amount × daysOverdue — used for ranking
  rescueState: "detected" | "investigating" | "action_taken" | "resolved" | "escalated"
  lastActionType: string | null
  lastActionAt: string | null
  auditTrail: Array<{
    actionType: string
    inputSummary: string
    outputPayload: Record<string, unknown> | null
    createdAt: string
  }>
}

const RESCUE_ACTION_TYPES = [
  "receivable_risk_detected",
  "customer_followup_sent",
  "financing_options_scouted",
  "payment_plan_suggested",
  "escalation_triggered",
  "rescue_case_resolved",
  "dispute_clarification_sent",
]

function inferState(actions: string[]): RescueInvoice["rescueState"] {
  if (actions.includes("escalation_triggered")) return "escalated"
  if (actions.includes("payment_plan_suggested") || actions.includes("rescue_case_resolved")) return "resolved"
  if (actions.includes("customer_followup_sent") || actions.includes("financing_options_scouted") || actions.includes("dispute_clarification_sent")) return "action_taken"
  if (actions.includes("receivable_risk_detected")) return "investigating"
  return "detected"
}

export async function getRescueQueue(
  client: SupabaseClient,
  organizationId: string
): Promise<RescueInvoice[]> {
  // Fetch overdue + sent invoices
  const { data: invoices, error: invErr } = await client
    .from("invoices")
    .select(`
      id, invoice_number, total_amount, due_at, status,
      customers ( full_name, email )
    `)
    .eq("organization_id", organizationId)
    .in("status", ["overdue", "sent", "pending"])
    .order("due_at", { ascending: true })

  if (invErr || !invoices || invoices.length === 0) return []

  // Fetch all rescue ai_actions for these invoices
  const invoiceIds = invoices.map((i) => i.id as string)
  const { data: actions } = await client
    .from("ai_actions")
    .select("entity_id, action_type, input_summary, output_payload_json, created_at")
    .eq("organization_id", organizationId)
    .in("action_type", RESCUE_ACTION_TYPES)
    .in("entity_id", invoiceIds)
    .order("created_at", { ascending: true })

  const actionsByInvoice = new Map<string, typeof actions>()
  for (const a of actions ?? []) {
    const id = a.entity_id as string
    if (!actionsByInvoice.has(id)) actionsByInvoice.set(id, [])
    actionsByInvoice.get(id)!.push(a)
  }

  const now = Date.now()
  const result: RescueInvoice[] = []

  for (const inv of invoices) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customer = Array.isArray(inv.customers) ? inv.customers[0] : (inv.customers as any)
    const amount = Number(inv.total_amount ?? 0)
    const dueAt = inv.due_at as string | null
    const daysOverdue = dueAt
      ? Math.max(0, Math.floor((now - new Date(dueAt).getTime()) / 86_400_000))
      : 0

    // Only show invoices with meaningful overdue risk or existing rescue actions
    const invActions = actionsByInvoice.get(inv.id as string) ?? []
    const hasActions = invActions.length > 0
    if (daysOverdue === 0 && !hasActions && inv.status !== "overdue") continue

    const actionTypes = invActions.map((a) => a.action_type as string)
    const lastAction = invActions.at(-1)

    result.push({
      id: inv.id as string,
      invoiceNumber: (inv.invoice_number as string) ?? "—",
      customerName: (customer?.full_name as string) ?? "Unknown",
      customerEmail: customer?.email as string | undefined,
      amount,
      dueDate: dueAt,
      daysOverdue,
      riskScore: amount * Math.max(1, daysOverdue),
      rescueState: inferState(actionTypes),
      lastActionType: (lastAction?.action_type as string) ?? null,
      lastActionAt: (lastAction?.created_at as string) ?? null,
      auditTrail: invActions.map((a) => ({
        actionType: a.action_type as string,
        inputSummary: a.input_summary as string,
        outputPayload: (a.output_payload_json as Record<string, unknown>) ?? null,
        createdAt: a.created_at as string,
      })),
    })
  }

  // Sort by risk score descending
  return result.sort((a, b) => b.riskScore - a.riskScore)
}
