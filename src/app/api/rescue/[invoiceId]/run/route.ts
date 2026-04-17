import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { recordAiAction } from "@/lib/services/ai-actions"

const anthropic = new Anthropic()

interface InvoiceContext {
  id: string
  invoiceNumber: string
  customerName: string
  customerEmail: string | null
  amount: number
  dueDate: string | null
  daysOverdue: number
  currentState: string
}

async function fetchInvoiceContext(
  client: ReturnType<typeof createServerSupabaseClient>,
  invoiceId: string
): Promise<InvoiceContext | null> {
  const { data, error } = await client
    .from("invoices")
    .select(`id, invoice_number, total_amount, due_at, status, customers ( full_name, email )`)
    .eq("id", invoiceId)
    .eq("organization_id", DEMO_ORG_ID)
    .single()

  if (error || !data) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customer = Array.isArray(data.customers) ? data.customers[0] : (data.customers as any)
  const dueAt = data.due_at as string | null
  const daysOverdue = dueAt
    ? Math.max(0, Math.floor((Date.now() - new Date(dueAt).getTime()) / 86_400_000))
    : 0

  return {
    id: data.id as string,
    invoiceNumber: (data.invoice_number as string) ?? "—",
    customerName: (customer?.full_name as string) ?? "Unknown",
    customerEmail: (customer?.email as string) ?? null,
    amount: Number(data.total_amount ?? 0),
    dueDate: dueAt,
    daysOverdue,
    currentState: data.status as string,
  }
}

async function getPreviousActions(
  client: ReturnType<typeof createServerSupabaseClient>,
  invoiceId: string
): Promise<string[]> {
  const { data } = await client
    .from("ai_actions")
    .select("action_type")
    .eq("entity_id", invoiceId)
    .eq("organization_id", DEMO_ORG_ID)
    .order("created_at", { ascending: true })

  return (data ?? []).map((r) => r.action_type as string)
}

function decideNextAction(previousActions: string[]): string {
  if (previousActions.includes("escalation_triggered")) return "already_escalated"
  if (previousActions.includes("payment_plan_suggested")) return "payment_plan_suggested"
  if (previousActions.includes("financing_options_scouted")) return "payment_plan_suggested"
  if (previousActions.includes("customer_followup_sent")) return "financing_options_scouted"
  if (previousActions.includes("receivable_risk_detected")) return "customer_followup_sent"
  return "receivable_risk_detected"
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params

  const client = createServerSupabaseClient()
  const invoice = await fetchInvoiceContext(client, invoiceId)

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  }

  const previousActions = await getPreviousActions(client, invoiceId)
  const nextActionType = decideNextAction(previousActions)

  if (nextActionType === "already_escalated") {
    return NextResponse.json({
      actionType: "already_escalated",
      message: "This case has already been escalated. No further automated actions available.",
    })
  }

  if (nextActionType === "payment_plan_suggested" && previousActions.includes("payment_plan_suggested")) {
    return NextResponse.json({
      actionType: "resolved",
      message: "All automated recovery steps have been taken for this invoice.",
    })
  }

  // Build prompt for Claude
  const actionLabels: Record<string, string> = {
    receivable_risk_detected: "detect and summarize the receivable risk",
    customer_followup_sent: "draft a professional follow-up message to the customer",
    financing_options_scouted: "research and suggest financing or factoring options for this receivable",
    payment_plan_suggested: "propose a specific payment plan to resolve this overdue amount",
    escalation_triggered: "escalate this case with a summary for the collections team",
  }

  const prompt = `You are OpsPilot's cashflow recovery agent. Your task is to ${actionLabels[nextActionType] ?? "take the next recovery step"} for an overdue invoice.

Invoice details:
- Invoice #${invoice.invoiceNumber}
- Customer: ${invoice.customerName}${invoice.customerEmail ? ` <${invoice.customerEmail}>` : ""}
- Amount: $${invoice.amount.toFixed(2)}
- Due date: ${invoice.dueDate ?? "unknown"}
- Days overdue: ${invoice.daysOverdue}

Previous recovery actions taken: ${previousActions.length > 0 ? previousActions.join(", ") : "none"}

Respond with a JSON object with these fields:
{
  "summary": "1-2 sentence summary of what you did",
  "detail": "the full output (drafted message, options list, plan, etc.)",
  "nextRecommendedStep": "what should happen next if this doesn't resolve"
}`

  let aiOutput: { summary: string; detail: string; nextRecommendedStep: string }

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    })

    const text = message.content[0]?.type === "text" ? message.content[0].text : ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("No JSON in response")
    aiOutput = JSON.parse(jsonMatch[0])
  } catch {
    // Fallback deterministic output
    const fallbacks: Record<string, typeof aiOutput> = {
      receivable_risk_detected: {
        summary: `$${invoice.amount.toFixed(0)} receivable from ${invoice.customerName} is ${invoice.daysOverdue} days overdue — flagged for recovery.`,
        detail: `Invoice #${invoice.invoiceNumber} for $${invoice.amount.toFixed(2)} was due ${invoice.dueDate ?? "recently"} and remains unpaid after ${invoice.daysOverdue} days. Customer: ${invoice.customerName}.`,
        nextRecommendedStep: "Send a professional follow-up email to the customer.",
      },
      customer_followup_sent: {
        summary: `Follow-up message drafted for ${invoice.customerName} regarding $${invoice.amount.toFixed(0)} balance.`,
        detail: `Subject: Friendly reminder — Invoice #${invoice.invoiceNumber}\n\nHi ${invoice.customerName},\n\nThis is a friendly reminder that invoice #${invoice.invoiceNumber} for $${invoice.amount.toFixed(2)} is now ${invoice.daysOverdue} days past due. Please let us know if you have any questions or need to arrange a payment plan.\n\nBest regards,\nOpsPilot`,
        nextRecommendedStep: "If no response in 48h, scout financing options.",
      },
      financing_options_scouted: {
        summary: `Financing options identified for $${invoice.amount.toFixed(0)} receivable from ${invoice.customerName}.`,
        detail: `Options for recovering $${invoice.amount.toFixed(2)}:\n1. Invoice factoring (60-90% advance, 2-5% fee) — BlueVine, Fundbox\n2. Accounts receivable line of credit — local bank or online lender\n3. Payment plan: 3 monthly installments of $${(invoice.amount / 3).toFixed(0)}\n4. Early payment discount: 2% off if paid within 7 days`,
        nextRecommendedStep: "Propose a payment plan directly to the customer.",
      },
      payment_plan_suggested: {
        summary: `Payment plan proposed to ${invoice.customerName} for $${invoice.amount.toFixed(0)}.`,
        detail: `Proposed payment plan for Invoice #${invoice.invoiceNumber} ($${invoice.amount.toFixed(2)}):\n\n- Option A: 50% now ($${(invoice.amount * 0.5).toFixed(0)}), remainder in 30 days\n- Option B: 3 equal payments of $${(invoice.amount / 3).toFixed(0)} over 90 days\n- Option C: Full payment with 5% early-payment discount if settled this week\n\nAll options waive any late fees if accepted within 3 business days.`,
        nextRecommendedStep: "If no acceptance in 5 business days, escalate to collections.",
      },
      escalation_triggered: {
        summary: `Case escalated to collections for ${invoice.customerName} — $${invoice.amount.toFixed(0)} outstanding.`,
        detail: `ESCALATION NOTICE\nInvoice #${invoice.invoiceNumber} | Customer: ${invoice.customerName} | Amount: $${invoice.amount.toFixed(2)} | ${invoice.daysOverdue} days overdue\n\nAll automated recovery steps exhausted. Prior actions: ${previousActions.join(", ")}. Recommend external collections or legal review.`,
        nextRecommendedStep: "Assign to collections team or legal counsel.",
      },
    }
    aiOutput = fallbacks[nextActionType] ?? {
      summary: "Recovery step executed.",
      detail: "See invoice record for details.",
      nextRecommendedStep: "Review manually.",
    }
  }

  // Record the action
  const actionId = await recordAiAction(client, {
    organizationId: DEMO_ORG_ID,
    entityType: "invoice",
    entityId: invoiceId,
    triggerType: "manual_rescue",
    actionType: nextActionType,
    inputSummary: aiOutput.summary,
    outputPayload: { detail: aiOutput.detail, nextRecommendedStep: aiOutput.nextRecommendedStep },
    status: "executed",
  })

  return NextResponse.json({
    actionId,
    actionType: nextActionType,
    summary: aiOutput.summary,
    detail: aiOutput.detail,
    nextRecommendedStep: aiOutput.nextRecommendedStep,
  })
}
