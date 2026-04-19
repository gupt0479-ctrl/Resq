import "server-only"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { eq, and, inArray, asc } from "drizzle-orm"

export interface RescueInvoice {
  id: string
  invoiceNumber: string
  customerName: string
  customerEmail?: string
  amount: number
  dueDate: string | null
  daysOverdue: number
  riskScore: number
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
] as const

function inferState(actions: string[]): RescueInvoice["rescueState"] {
  if (actions.includes("escalation_triggered")) return "escalated"
  if (actions.includes("payment_plan_suggested") || actions.includes("rescue_case_resolved")) return "resolved"
  if (actions.includes("customer_followup_sent") || actions.includes("financing_options_scouted") || actions.includes("dispute_clarification_sent")) return "action_taken"
  if (actions.includes("receivable_risk_detected")) return "investigating"
  return "detected"
}

export async function getRescueQueue(
  _clientIgnored: unknown,
  organizationId: string
): Promise<RescueInvoice[]> {
  const invoiceRows = await db
    .select({
      id:            schema.invoices.id,
      invoiceNumber: schema.invoices.invoiceNumber,
      totalAmount:   schema.invoices.totalAmount,
      amountPaid:    schema.invoices.amountPaid,
      dueAt:         schema.invoices.dueAt,
      status:        schema.invoices.status,
      customerId:    schema.invoices.customerId,
      fullName:      schema.customers.fullName,
      email:         schema.customers.email,
    })
    .from(schema.invoices)
    .leftJoin(schema.customers, eq(schema.invoices.customerId, schema.customers.id))
    .where(
      and(
        eq(schema.invoices.organizationId, organizationId),
        inArray(schema.invoices.status, ["overdue", "sent", "pending"]),
      )
    )
    .orderBy(asc(schema.invoices.dueAt))

  if (invoiceRows.length === 0) return []

  const invoiceIds = invoiceRows.map((r) => r.id)

  const actionRows = await db
    .select({
      entityId:          schema.aiActions.entityId,
      actionType:        schema.aiActions.actionType,
      inputSummary:      schema.aiActions.inputSummary,
      outputPayloadJson: schema.aiActions.outputPayloadJson,
      createdAt:         schema.aiActions.createdAt,
    })
    .from(schema.aiActions)
    .where(
      and(
        eq(schema.aiActions.organizationId, organizationId),
        inArray(schema.aiActions.actionType, [...RESCUE_ACTION_TYPES]),
        inArray(schema.aiActions.entityId, invoiceIds),
      )
    )
    .orderBy(asc(schema.aiActions.createdAt))

  const actionsByInvoice = new Map<string, typeof actionRows>()
  for (const a of actionRows) {
    if (!actionsByInvoice.has(a.entityId)) actionsByInvoice.set(a.entityId, [])
    actionsByInvoice.get(a.entityId)!.push(a)
  }

  const now = Date.now()
  const result: RescueInvoice[] = []

  for (const inv of invoiceRows) {
    const amount      = Number(inv.totalAmount ?? 0) - Number(inv.amountPaid ?? 0)
    const dueAt       = inv.dueAt ? inv.dueAt.toISOString() : null
    const daysOverdue = dueAt
      ? Math.max(0, Math.floor((now - new Date(dueAt).getTime()) / 86_400_000))
      : 0

    const invActions = actionsByInvoice.get(inv.id) ?? []
    if (daysOverdue === 0 && invActions.length === 0 && inv.status !== "overdue") continue

    const actionTypes = invActions.map((a) => a.actionType)
    const lastAction  = invActions.at(-1)

    result.push({
      id:             inv.id,
      invoiceNumber:  inv.invoiceNumber ?? "—",
      customerName:   inv.fullName ?? "Unknown",
      customerEmail:  inv.email ?? undefined,
      amount,
      dueDate:        dueAt,
      daysOverdue,
      riskScore:      amount * Math.max(1, daysOverdue),
      rescueState:    inferState(actionTypes),
      lastActionType: lastAction?.actionType ?? null,
      lastActionAt:   lastAction?.createdAt?.toISOString() ?? null,
      auditTrail:     invActions.map((a) => ({
        actionType:   a.actionType,
        inputSummary: a.inputSummary ?? "",
        outputPayload: (a.outputPayloadJson as Record<string, unknown>) ?? null,
        createdAt:    a.createdAt?.toISOString() ?? "",
      })),
    })
  }

  return result.sort((a, b) => b.riskScore - a.riskScore)
}
