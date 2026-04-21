import "server-only"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { eq, and, desc, count, inArray, lt } from "drizzle-orm"
import Anthropic from "@anthropic-ai/sdk"
import {
  FinanceSummaryFactsSchema,
  type FinanceSummaryFacts,
} from "@/lib/schemas/finance"
import { ManagerSummarySchema, type ManagerSummary } from "@/lib/schemas/ai"
import { getFinanceSummary } from "@/lib/services/finance"
import { aiActions } from "@/lib/db/schema"

export async function buildFinanceSummaryFacts(
  organizationId: string
): Promise<FinanceSummaryFacts> {
  const summary = await getFinanceSummary(organizationId)

  const overdueRows = await db
    .select()
    .from(schema.invoices)
    .leftJoin(schema.customers, eq(schema.invoices.customerId, schema.customers.id))
    .where(
      and(
        eq(schema.invoices.organizationId, organizationId),
        eq(schema.invoices.status, "overdue"),
      ),
    )
    .orderBy(schema.invoices.dueAt)
    .limit(5)

  const largestOverdueInvoices = overdueRows.map((row) => {
    return {
      invoiceNumber: String(row.invoices.invoiceNumber ?? ""),
      amount: Math.max(
        0,
        (Number(row.invoices.totalAmount) || 0) - (Number(row.invoices.amountPaid) || 0)
      ),
      customerName: row.customers?.fullName ?? "Unknown",
    }
  })

  let criticalDelinquencyCount = 0
  let activeRescueCaseCount = 0
  try {
    const delinquencyCutoff = new Date()
    delinquencyCutoff.setDate(delinquencyCutoff.getDate() - 30)

    const [criticalResult] = await db
      .select({ count: count() })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.organizationId, organizationId),
          eq(schema.invoices.status, "overdue"),
          lt(schema.invoices.dueAt, delinquencyCutoff),
        ),
      )
    criticalDelinquencyCount = Number(criticalResult?.count ?? 0)

    const rescueRows = await db
      .select({ entityId: aiActions.entityId })
      .from(aiActions)
      .where(
        and(
          eq(aiActions.organizationId, organizationId),
          inArray(aiActions.actionType, [
            "receivable_risk_detected",
            "customer_followup_sent",
            "financing_options_scouted",
            "payment_plan_suggested",
          ]),
        ),
      )
    activeRescueCaseCount = new Set(rescueRows.map((row) => row.entityId)).size
  } catch {
    /* summary falls back cleanly when rescue tables are absent */
  }

  return FinanceSummaryFactsSchema.parse({
    revenueThisWeek:       summary.revenueThisWeek,
    pendingReceivables:    summary.pendingReceivables,
    overdueReceivables:    summary.overdueReceivables,
    overdueInvoiceCount:   summary.overdueInvoiceCount,
    expensesThisWeek:      summary.expensesThisWeek,
    netCashFlowEstimate:     summary.netCashFlowEstimate,
    largestOverdueInvoices,
    criticalDelinquencyCount,
    activeRescueCaseCount,
  })
}

export function buildFallbackManagerSummary(facts: FinanceSummaryFacts): ManagerSummary {
  const headline =
    facts.criticalDelinquencyCount > 0
      ? `${facts.criticalDelinquencyCount} invoice(s) are 30+ days overdue — collections escalation required`
      : facts.activeRescueCaseCount > 0
        ? `${facts.activeRescueCaseCount} rescue case(s) active — keep collections pressure consistent`
      : facts.overdueInvoiceCount > 0
        ? `${facts.overdueInvoiceCount} overdue invoice(s) — collections focus`
        : "Cash and receivables look healthy this week"

  const bullets: string[] = [
    `Revenue this week: ${facts.revenueThisWeek.toFixed(2)} (from ledger).`,
    `Pending receivables: ${facts.pendingReceivables.toFixed(2)}.`,
    `Overdue receivables: ${facts.overdueReceivables.toFixed(2)}.`,
    `Net cash flow (week): ${facts.netCashFlowEstimate.toFixed(2)}.`,
    `Collections pressure: ${facts.criticalDelinquencyCount} invoice(s) beyond 30 days overdue, ${facts.activeRescueCaseCount} active rescue case(s).`,
  ]
  if (facts.largestOverdueInvoices.length > 0) {
    const top = facts.largestOverdueInvoices[0]
    bullets.push(`Largest overdue: ${top.invoiceNumber} (${top.customerName}) — ${top.amount.toFixed(2)}.`)
  }

  return {
    headline,
    bullets: bullets.slice(0, 5),
    riskNote:
      facts.criticalDelinquencyCount > 0
        ? "Escalate the oldest balances first; severe delinquency now matters more than net-new reminders."
        : facts.activeRescueCaseCount > 0
          ? "Keep follow-up cadence tight across active rescue cases and avoid duplicate outreach."
        : facts.overdueInvoiceCount > 0
          ? "Prioritize outreach on overdue balances; amounts are read from Postgres, not inferred."
          : undefined,
  }
}

/**
 * Generates a manager summary from deterministic facts only, validates shape,
 * and persists to `ai_summaries` (non-authoritative).
 */
export async function generateAndPersistManagerSummary(
  organizationId: string
): Promise<{ summary: ManagerSummary; facts: FinanceSummaryFacts; source: "model" | "fallback" }> {
  const facts = await buildFinanceSummaryFacts(organizationId)

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
            content: `You are summarizing cashflow and collections KPIs for a finance operator. Use ONLY the numbers in the JSON facts. Do not invent totals or payment states. Output ONLY valid JSON matching:
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

  await db.insert(schema.aiSummaries).values({
    organizationId,
    scope:       "daily_manager",
    payloadJson: payload,
  })

  return { summary: parsed, facts, source }
}

export async function getLatestManagerSummary(
  organizationId: string
): Promise<{ summary: ManagerSummary; source: string; generatedAt: string } | null> {
  const [row] = await db
    .select({
      payloadJson: schema.aiSummaries.payloadJson,
      generatedAt: schema.aiSummaries.generatedAt,
    })
    .from(schema.aiSummaries)
    .where(
      and(
        eq(schema.aiSummaries.organizationId, organizationId),
        eq(schema.aiSummaries.scope, "daily_manager"),
      ),
    )
    .orderBy(desc(schema.aiSummaries.generatedAt))
    .limit(1)

  if (!row?.payloadJson) return null

  const payload = row.payloadJson as {
    summary?: unknown
    source?: string
  }
  const summary = ManagerSummarySchema.safeParse(payload.summary)
  if (!summary.success) return null

  return {
    summary:     summary.data,
    source:      typeof payload.source === "string" ? payload.source : "unknown",
    generatedAt: row.generatedAt.toISOString(),
  }
}

/** Dashboard read-model: latest persisted AI summary, or deterministic fallback from facts. */
export async function getManagerSummaryForDashboard(
  organizationId: string
): Promise<{
  source:      "ai" | "fallback"
  headline:    string
  bullets:     string[]
  riskNote?:   string
  generatedAt?: string
}> {
  const latest = await getLatestManagerSummary(organizationId)
  if (latest) {
    return {
      source:      "ai",
      headline:    latest.summary.headline,
      bullets:     latest.summary.bullets,
      riskNote:    latest.summary.riskNote,
      generatedAt: latest.generatedAt,
    }
  }

  const facts = await buildFinanceSummaryFacts(organizationId)
  const s = buildFallbackManagerSummary(facts)
  return {
    source:    "fallback",
    headline:  s.headline,
    bullets:   s.bullets,
    riskNote:  s.riskNote,
  }
}
