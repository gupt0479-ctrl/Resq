import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import Anthropic from "@anthropic-ai/sdk"
import {
  FinanceSummaryFactsSchema,
  type FinanceSummaryFacts,
} from "@/lib/schemas/finance"
import { ManagerSummarySchema, type ManagerSummary } from "@/lib/schemas/ai"
import { getFinanceSummary } from "@/lib/services/finance"

export async function buildFinanceSummaryFacts(
  client: SupabaseClient,
  organizationId: string
): Promise<FinanceSummaryFacts> {
  const summary = await getFinanceSummary(client)

  const { data: overdueRows, error } = await client
    .from("invoices")
    .select("invoice_number, total_amount, amount_paid, customers ( full_name )")
    .eq("organization_id", organizationId)
    .eq("status", "overdue")
    .order("due_at", { ascending: true })
    .limit(5)

  if (error) throw new Error(error.message)

  const largestOverdueInvoices = (overdueRows ?? []).map((row: Record<string, unknown>) => {
    const cust = row.customers as { full_name?: string } | null
    return {
      invoiceNumber: String(row.invoice_number ?? ""),
      amount: Math.max(
        0,
        (Number(row.total_amount) || 0) - (Number(row.amount_paid) || 0)
      ),
      customerName: cust?.full_name ?? "Unknown",
    }
  })

  return FinanceSummaryFactsSchema.parse({
    revenueThisWeek:       summary.revenueThisWeek,
    pendingReceivables:    summary.pendingReceivables,
    overdueReceivables:    summary.overdueReceivables,
    overdueInvoiceCount:   summary.overdueInvoiceCount,
    expensesThisWeek:      summary.expensesThisWeek,
    netCashFlowEstimate:     summary.netCashFlowEstimate,
    largestOverdueInvoices,
  })
}

export function buildFallbackManagerSummary(facts: FinanceSummaryFacts): ManagerSummary {
  const headline =
    facts.overdueInvoiceCount > 0
      ? `${facts.overdueInvoiceCount} overdue invoice(s) — collections focus`
      : "Cash and receivables look healthy this week"

  const bullets: string[] = [
    `Revenue this week: $${facts.revenueThisWeek.toFixed(2)} (from ledger).`,
    `Pending receivables: $${facts.pendingReceivables.toFixed(2)}.`,
    `Overdue receivables: $${facts.overdueReceivables.toFixed(2)}.`,
    `Net cash flow (week): $${facts.netCashFlowEstimate.toFixed(2)}.`,
  ]
  if (facts.largestOverdueInvoices.length > 0) {
    const top = facts.largestOverdueInvoices[0]
    bullets.push(`Largest overdue: ${top.invoiceNumber} (${top.customerName}) — $${top.amount.toFixed(2)}.`)
  }

  return {
    headline,
    bullets: bullets.slice(0, 5),
    riskNote:
      facts.overdueInvoiceCount > 0
        ? "Prioritize outreach on overdue balances; amounts are read from Postgres, not inferred."
        : undefined,
  }
}

/**
 * Generates a manager summary from deterministic facts only, validates shape,
 * and persists to `ai_summaries` (non-authoritative).
 */
export async function generateAndPersistManagerSummary(
  client: SupabaseClient,
  organizationId: string
): Promise<{ summary: ManagerSummary; facts: FinanceSummaryFacts; source: "model" | "fallback" }> {
  const facts = await buildFinanceSummaryFacts(client, organizationId)

  let parsed: ManagerSummary
  let source: "model" | "fallback" = "fallback"

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const response = await anthropic.messages.create({
        model:       "claude-haiku-4-5-20251001",
        max_tokens:  500,
        messages: [
          {
            role:    "user",
            content: `You are summarizing finance KPIs for a restaurant GM. Use ONLY the numbers in the JSON facts. Do not invent totals or payment states. Output ONLY valid JSON matching:
{"headline": string, "bullets": string[], "riskNote"?: string}

Facts JSON:\n${JSON.stringify(facts)}`,
          },
        ],
      })
      const text =
        response.content[0].type === "text" ? response.content[0].text : ""
      const cleaned = text.replace(/```json|```/g, "").trim()
      const raw = JSON.parse(cleaned) as unknown
      parsed = ManagerSummarySchema.parse(raw)
      source = "model"
    } catch {
      parsed = buildFallbackManagerSummary(facts)
      source = "fallback"
    }
  } else {
    parsed = buildFallbackManagerSummary(facts)
  }

  const payload = {
    summary: parsed,
    facts,
    source,
    generatedAt: new Date().toISOString(),
  }

  const { error } = await client.from("ai_summaries").insert({
    organization_id: organizationId,
    scope:           "daily_manager",
    payload_json:    payload,
  })

  if (error) throw new Error(error.message)

  return { summary: parsed, facts, source }
}

export async function getLatestManagerSummary(
  client: SupabaseClient,
  organizationId: string
): Promise<{ summary: ManagerSummary; source: string; generatedAt: string } | null> {
  const { data, error } = await client
    .from("ai_summaries")
    .select("payload_json, generated_at")
    .eq("organization_id", organizationId)
    .eq("scope", "daily_manager")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data?.payload_json) return null

  const payload = data.payload_json as {
    summary?: unknown
    source?: string
  }
  const summary = ManagerSummarySchema.safeParse(payload.summary)
  if (!summary.success) return null

  return {
    summary:     summary.data,
    source:      typeof payload.source === "string" ? payload.source : "unknown",
    generatedAt: data.generated_at as string,
  }
}

/** Dashboard read-model: latest persisted AI summary, or deterministic fallback from facts. */
export async function getManagerSummaryForDashboard(
  client: SupabaseClient,
  organizationId: string
): Promise<{
  source:      "ai" | "fallback"
  headline:    string
  bullets:     string[]
  riskNote?:   string
  generatedAt?: string
}> {
  const latest = await getLatestManagerSummary(client, organizationId)
  if (latest) {
    return {
      source:      "ai",
      headline:    latest.summary.headline,
      bullets:     latest.summary.bullets,
      riskNote:    latest.summary.riskNote,
      generatedAt: latest.generatedAt,
    }
  }

  const facts = await buildFinanceSummaryFacts(client, organizationId)
  const s = buildFallbackManagerSummary(facts)
  return {
    source:    "fallback",
    headline:  s.headline,
    bullets:   s.bullets,
    riskNote:  s.riskNote,
  }
}
