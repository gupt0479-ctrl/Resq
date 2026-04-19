import "server-only"
import Anthropic from "@anthropic-ai/sdk"
import type { SupabaseClient } from "@supabase/supabase-js"
import { search as tinyFishSearch } from "@/lib/tinyfish/client"
import { getCustomerProfile, type CustomerProfile } from "@/lib/services/recovery-agent"
import { investigate as portalReconInvestigate } from "@/lib/services/portal-reconnaissance"
import type { CollectionsDecision, CustomerClassification, Trajectory } from "@/lib/schemas/collections-decision"

const anthropic = new Anthropic()

// ── 1. Trajectory analysis ─────────────────────────────────────────────────

function analyzeTrajectory(profile: CustomerProfile): Trajectory {
  const rate = profile.paymentRatePct ?? 50
  const prior = profile.priorOverdueCount
  if (prior === 0 && rate >= 90) return "improving"
  if (prior >= 2 || rate < 50)   return "worsening"
  return "flat"
}

// ── 2. LTV-weighted aggression ─────────────────────────────────────────────

function computeLtvFactor(lifetimeValue: number): number {
  // Scales 0–0.3: a $10k+ customer gets the max softening
  return Math.min(0.3, lifetimeValue / 33_333)
}

function computeAggressionBudget(daysOverdue: number, ltvFactor: number): number {
  // Base aggression rises with days overdue (capped at 100), softened by LTV
  const base = Math.min(100, daysOverdue * 2.5)
  return Math.round(base * (1 - ltvFactor))
}

// ── 3. Rule filter ─────────────────────────────────────────────────────────

function applyRuleFilter(
  daysOverdue: number,
  reminderCount: number,
  status: string
): string[] {
  if (status === "disputed")   return ["clarification"]
  if (daysOverdue < 7)         return ["reminder"]
  if (reminderCount >= 3)      return ["escalation", "payment_plan"]
  return ["reminder", "payment_plan", "escalation", "clarification"]
}

// ── 4. External signals (TinyFish, mock-safe) ──────────────────────────────

async function fetchExternalSignals(customerName: string): Promise<CollectionsDecision["externalSignals"]> {
  try {
    const result = await tinyFishSearch(
      `"${customerName}" financial distress bankruptcy late payments 2025 2026`
    )
    const articles = result.results ?? []
    const rawSnippets = articles.slice(0, 3).map(a => a.snippet ?? a.title ?? "").filter(Boolean)
    const combinedText = rawSnippets.join(" ").toLowerCase()
    const distressFlag =
      combinedText.includes("bankrupt") ||
      combinedText.includes("insolvency") ||
      combinedText.includes("layoff") ||
      combinedText.includes("shutdown") ||
      combinedText.includes("closure")

    const dataSource = (result.mode === "mock" || result.mode === "misconfigured") ? "mock" : "live"

    if (rawSnippets.length === 0) {
      return { newsSummary: "No notable news found for this customer.", rawSnippets: [], distressFlag: false, dataSource }
    }

    let newsSummary = ""
    try {
      const msg = await anthropic.messages.create({
        model:      "claude-haiku-4-5",
        max_tokens: 150,
        messages:   [{
          role:    "user",
          content: `You are summarizing web search results for a collections agent. Given these snippets about "${customerName}", write 1-2 sentences summarizing what's in the news — focus on any financial risk, legal trouble, or business health signals. Be direct and factual.\n\n${rawSnippets.join("\n\n")}`,
        }],
      })
      newsSummary = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : ""
    } catch (err) {
      console.error("[fetchExternalSignals] synthesis failed:", err)
    }

    if (!newsSummary) {
      newsSummary = rawSnippets.length > 0
        ? `Found ${rawSnippets.length} result(s) for "${customerName}" — no clear financial risk signals detected.`
        : "No notable news found for this customer."
    }

    return { newsSummary, rawSnippets, distressFlag, dataSource }
  } catch {
    return {
      newsSummary:  "External signal search unavailable.",
      rawSnippets:  [],
      distressFlag: false,
      dataSource:   "mock",
    }
  }
}

// ── 5. Helper functions for human-readable reasoning ──────────────────────

function getPaymentHistoryLabel(paymentRatePct: number | null): string {
  if (paymentRatePct === null) return "payment history"
  if (paymentRatePct >= 90) return "excellent payment history"
  if (paymentRatePct >= 70) return "generally reliable payment history"
  if (paymentRatePct >= 50) return "inconsistent payment history"
  return "poor payment history"
}

function getBehaviorPattern(profile: CustomerProfile, daysOverdue: number): string {
  const paymentRate = profile.paymentRatePct ?? 50
  const priorOverdueCount = profile.priorOverdueCount
  
  // First late payment
  if (priorOverdueCount === 0) {
    return "first late payment"
  }
  
  // Recurring pattern
  if (priorOverdueCount >= 2) {
    return "recurring late payment pattern"
  }
  
  // Good history but significantly overdue
  if (paymentRate >= 90 && daysOverdue > 30) {
    return "unusual for this customer"
  }
  
  // Poor history and overdue
  if (paymentRate < 50) {
    return "consistent with past behavior"
  }
  
  // Default: consistent with past behavior
  return "consistent with past behavior"
}

function getActionRationale(
  action: string,
  daysOverdue: number,
  profile: CustomerProfile
): string {
  const paymentRate = profile.paymentRatePct ?? 50
  
  switch (action) {
    case "payment_plan":
      return `Customer is ${daysOverdue} days overdue and may need flexible payment options`
    
    case "reminder":
      if (daysOverdue < 7) {
        return "Early overdue period suggests gentle reminder is appropriate"
      }
      if (paymentRate >= 90) {
        return "Good payment history suggests gentle reminder is appropriate"
      }
      return "Reminder sent to prompt payment"
    
    case "escalation":
      return "Multiple reminders sent without response, escalation warranted"
    
    case "clarification":
      return "Invoice status is disputed, clarification needed before collections"
    
    default:
      return `Recommended action: ${action}`
  }
}

function formatReasoningSentences(parts: string[]): string {
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0]
  
  // Join parts with natural connectors
  const result: string[] = []
  
  for (let i = 0; i < parts.length; i++) {
    if (i === 0) {
      result.push(parts[i])
    } else if (i === parts.length - 1) {
      // Last sentence - use period from previous, then add this one
      result.push(` ${parts[i]}`)
    } else {
      // Middle sentences
      result.push(` ${parts[i]}`)
    }
  }
  
  return result.join("")
}

function enforceCharacterLimit(explanation: string, maxLength: number = 300): string {
  if (explanation.length <= maxLength) return explanation
  
  // Truncate at last complete sentence before limit
  const truncated = explanation.substring(0, maxLength)
  const lastPeriod = truncated.lastIndexOf('.')
  
  // If we found a period and it's not too early, truncate there
  if (lastPeriod > 100) {
    return truncated.substring(0, lastPeriod + 1)
  }
  
  // Otherwise, add ellipsis
  return truncated + "..."
}

function generateHumanReadableReasoning(params: {
  customerName: string
  daysOverdue: number
  amount: number
  trajectory: Trajectory
  aggressionBudget: number
  ltvFactor: number
  lifetimeValue: number
  selectedAction: string
  allowedActions: string[]
  profile: CustomerProfile
  externalSignals: CollectionsDecision["externalSignals"]
  portalReconnaissance?: CollectionsDecision["portalReconnaissance"]
}): string {
  try {
    const reasoningParts: string[] = []
    
    // Build payment history context
    const historyLabel = getPaymentHistoryLabel(params.profile.paymentRatePct)
    const behaviorPattern = getBehaviorPattern(params.profile, params.daysOverdue)
    
    // Build relationship context
    let relationshipContext = ""
    if (params.profile.relationshipMonths === 0) {
      relationshipContext = "new customer"
    } else if (params.lifetimeValue > 0) {
      relationshipContext = `${params.profile.relationshipMonths}-month relationship with $${params.lifetimeValue.toFixed(0)} lifetime value`
    } else {
      relationshipContext = `${params.profile.relationshipMonths}-month relationship`
    }
    
    // Check if external signals should be included
    const shouldIncludeExternalSignals = 
      params.externalSignals.dataSource === "live" && 
      (params.externalSignals.distressFlag || 
       params.externalSignals.newsSummary !== "No notable news found for this customer.")
    
    // Build customer situation sentence
    let situationSentence = ""
    if (params.profile.paymentRatePct !== null) {
      situationSentence = `Customer has ${historyLabel} (${params.profile.paymentRatePct}% on-time)`
      if (params.profile.relationshipMonths > 0) {
        situationSentence += ` over ${params.profile.relationshipMonths} months`
      }
      situationSentence += ` but is now ${params.daysOverdue} days overdue on $${params.amount.toFixed(0)}.`
    } else {
      situationSentence = `Customer is ${params.daysOverdue} days overdue on $${params.amount.toFixed(0)}.`
    }
    reasoningParts.push(situationSentence)
    
    // Add behavior pattern context if notable
    if (behaviorPattern === "first late payment" || behaviorPattern === "unusual for this customer") {
      reasoningParts.push(`This is ${behaviorPattern === "first late payment" ? "their first late payment" : "unusual for this customer"}.`)
    } else if (behaviorPattern === "recurring late payment pattern") {
      reasoningParts.push(`This is a recurring late payment pattern (${params.profile.priorOverdueCount} prior overdue invoices).`)
    } else if (behaviorPattern === "consistent with past behavior" && params.profile.paymentRatePct !== null && params.profile.paymentRatePct < 50) {
      reasoningParts.push(`This is consistent with their pattern.`)
    }
    
    // Add external signals if available
    if (shouldIncludeExternalSignals && params.externalSignals.distressFlag) {
      reasoningParts.push(`External signals indicate potential financial distress.`)
    }
    
    // Add portal reconnaissance context if available
    if (params.portalReconnaissance) {
      const pr = params.portalReconnaissance
      const portalParts: string[] = []

      // Visibility signal
      if (pr.visibility) {
        portalParts.push("invoice is visible")
      } else {
        portalParts.push("invoice NOT visible to customer — billing system issue likely")
      }

      // Payment status signal (only if notable)
      if (pr.paymentStatus === "processing") {
        portalParts.push("payment is processing")
      } else if (pr.paymentStatus === "paid") {
        portalParts.push("payment already completed")
      }

      // Engagement signal
      if (pr.engagementLevel === "high" && pr.hasRecentActivity) {
        portalParts.push("customer has high engagement")
      } else if (pr.engagementLevel === "low" || pr.engagementLevel === "none") {
        portalParts.push(`customer has ${pr.engagementLevel} engagement`)
      }

      // Message sent signal
      if (pr.messageSent) {
        portalParts.push("message already sent via portal")
      }

      if (portalParts.length > 0) {
        const confidence = pr.confidence > 0 ? ` (confidence: ${pr.confidence}%)` : ""
        reasoningParts.push(`Portal shows ${portalParts.join(", ")}${confidence}.`)
      }
    }
    
    // Add action rationale
    const actionRationale = getActionRationale(
      params.selectedAction,
      params.daysOverdue,
      params.profile
    )
    
    // Build final sentence with action rationale
    if (params.selectedAction === "payment_plan" && params.lifetimeValue > 0) {
      reasoningParts.push(`Given their ${relationshipContext}, offering a payment plan balances firmness with flexibility.`)
    } else if (params.selectedAction === "escalation") {
      reasoningParts.push(`${actionRationale}.`)
    } else {
      reasoningParts.push(`${actionRationale}.`)
    }
    
    // Format and enforce character limit
    const formatted = formatReasoningSentences(reasoningParts)
    return enforceCharacterLimit(formatted)
    
  } catch (error) {
    console.error("[generateHumanReadableReasoning] failed:", error)
    return `Customer is ${params.daysOverdue} days overdue on $${params.amount.toFixed(0)}. Recommended action: ${params.selectedAction}.`
  }
}

// ── 6. Legal guardrails ────────────────────────────────────────────────────

interface LegalGuardrailCheck {
  passed: boolean
  reason?: string
}

async function checkLegalGuardrails(
  client: SupabaseClient,
  orgId: string,
  customerId: string,
  invoiceId: string
): Promise<LegalGuardrailCheck> {
  // Check 1: Contact frequency limit (max 1 per day, 3 per week)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: recentActions } = await client
    .from("ai_actions")
    .select("created_at")
    .eq("organization_id", orgId)
    .eq("entity_id", invoiceId)
    .in("action_type", ["customer_followup_sent", "payment_plan_suggested", "dispute_clarification_sent"])
    .gte("created_at", oneWeekAgo)
    .order("created_at", { ascending: false })

  const actionsToday = (recentActions ?? []).filter(
    (a: Record<string, string>) => a.created_at >= oneDayAgo
  ).length

  const actionsThisWeek = (recentActions ?? []).length

  if (actionsToday >= 1) {
    return {
      passed: false,
      reason: "Contact frequency limit: Already contacted this customer today (max 1/day)",
    }
  }

  if (actionsThisWeek >= 3) {
    return {
      passed: false,
      reason: "Contact frequency limit: Already contacted 3 times this week (max 3/week)",
    }
  }

  // Check 2: Time of day (no contact before 8am or after 9pm local time)
  // For demo purposes, using system time. Production would use customer timezone.
  const hour = new Date().getHours()
  if (hour < 8 || hour >= 21) {
    return {
      passed: false,
      reason: `Time restriction: Cannot contact outside 8am-9pm (current hour: ${hour})`,
    }
  }

  // Check 3: Do-not-contact list (check customer notes for DNC flag)
  const { data: customer } = await client
    .from("customers")
    .select("notes")
    .eq("id", customerId)
    .eq("organization_id", orgId)
    .single()

  const notes = (customer?.notes ?? "").toLowerCase()
  if (notes.includes("do not contact") || notes.includes("dnc")) {
    return {
      passed: false,
      reason: "Customer is on do-not-contact list",
    }
  }

  return { passed: true }
}

// ── 7. High-stakes gate ────────────────────────────────────────────────────

interface HighStakesCheck {
  requiresApproval: boolean
  reason?: string
}

function checkHighStakesGate(
  amount: number,
  action: string,
  lifetimeValue: number,
  aggressionBudget: number
): HighStakesCheck {
  // Gate 1: Invoice > $5k
  if (amount > 5000) {
    return {
      requiresApproval: true,
      reason: `High-value invoice (${amount.toFixed(0)} > $5,000) requires human approval`,
    }
  }

  // Gate 2: Formal/legal notice
  if (action === "escalation" && aggressionBudget >= 80) {
    return {
      requiresApproval: true,
      reason: "Formal escalation notice requires human approval",
    }
  }

  // Gate 3: Settlement offer (not yet implemented in action types, but reserved)
  if (action === "settlement") {
    return {
      requiresApproval: true,
      reason: "Settlement offer requires human approval",
    }
  }

  // Gate 4: High-LTV customer at rung 4+
  if (lifetimeValue > 10000 && (action === "escalation" || action === "write_off")) {
    return {
      requiresApproval: true,
      reason: `High-value customer (${lifetimeValue.toFixed(0)} LTV) at escalation stage requires human approval`,
    }
  }

  return { requiresApproval: false }
}

// ── 8. Fallback deterministic decision ─────────────────────────────────────

function deterministicDecision(
  customerName: string,
  amount: number,
  daysOverdue: number,
  trajectory: Trajectory,
  allowedActions: string[],
  aggressionBudget: number,
  ltvFactor: number,
  lifetimeValue: number,
  profile: CustomerProfile,
  externalSignals: CollectionsDecision["externalSignals"],
  portalReconnaissance?: CollectionsDecision["portalReconnaissance"]
): Omit<CollectionsDecision, "reevaluateAt"> {
  let classification: CustomerClassification = "forgot"
  if (daysOverdue > 60) classification = "bad_actor"
  else if (trajectory === "worsening" || externalSignals.distressFlag) classification = "cash_flow"
  else if (daysOverdue > 30) classification = "bad_actor"

  const action = allowedActions.includes("escalation") && portalReconnaissance?.visibility === false
    ? "escalation"  // Escalate faster if invoice not visible to customer (Req 7.4)
    : allowedActions.includes("payment_plan") && daysOverdue > 14
      ? "payment_plan"
      : allowedActions[0] ?? "reminder"

  const tone = aggressionBudget < 30 ? "friendly"
    : aggressionBudget < 60 ? "firm"
    : aggressionBudget < 80 ? "formal"
    : "urgent"

  const outreachDraft = `Hi ${customerName},\n\nThis is a ${tone} follow-up regarding invoice overdue by ${daysOverdue} days ($${amount.toFixed(0)}). We'd like to resolve this promptly.\n\nPlease contact us to arrange payment or a payment plan.\n\nBest regards,\nOpsPilot`

  return {
    classification,
    confidence:      55,
    trajectory,
    aggressionBudget,
    ltvFactor,
    allowedActions,
    chainOfThought:  generateHumanReadableReasoning({
      customerName,
      daysOverdue,
      amount,
      trajectory,
      aggressionBudget,
      ltvFactor,
      lifetimeValue,
      selectedAction: action,
      allowedActions,
      profile,
      externalSignals,
      portalReconnaissance
    }),
    selectedAction:  action,
    channel:         portalReconnaissance?.messageSent ? "stripe" : (ltvFactor > 0.15 ? "email" : "stripe"),  // Prefer portal/stripe channel when portal message sent (Req 7.5)
    tone,
    outreachDraft,
    responsePlan: {
      noReply:        `Escalate to ${action === "payment_plan" ? "formal notice" : "payment plan offer"} after 3 days of silence.`,
      dispute:        "Acknowledge dispute, request specifics in writing, pause collections pending review.",
      partialPayment: "Accept partial payment, issue updated invoice for remainder with new due date.",
    },
    humanReviewFlag: true,
    humanReviewReason: "Fallback decision — Claude unavailable. Manual review recommended.",
    externalSignals,
  }
}

// ── 9. Claude Sonnet chain-of-thought ──────────────────────────────────────

async function claudeDecision(params: {
  customerName:       string
  invoiceNumber:      string
  amount:             number
  daysOverdue:        number
  reminderCount:      number
  trajectory:         Trajectory
  aggressionBudget:   number
  ltvFactor:          number
  lifetimeValue:      number
  allowedActions:     string[]
  priorActions:       string[]
  paymentRatePct:     number | null
  avgDaysLate:        number | null
  totalInvoices:      number
  relationshipMonths: number
  priorOverdueCount:  number
  writtenOffCount:    number
  externalSignals:    CollectionsDecision["externalSignals"]
  portalReconnaissance?: CollectionsDecision["portalReconnaissance"]
}): Promise<Omit<CollectionsDecision, "reevaluateAt">> {
  // Build portal reconnaissance context for the prompt
  let portalSection = ""
  if (params.portalReconnaissance) {
    const pr = params.portalReconnaissance
    const lines: string[] = []
    lines.push(`\n## Portal Reconnaissance`)
    lines.push(`- Invoice visibility: ${pr.visibility ? "VISIBLE in customer portal" : "NOT VISIBLE in customer portal"}`)
    lines.push(`- Payment status: ${pr.paymentStatus}`)
    lines.push(`- Customer engagement level: ${pr.engagementLevel}`)
    lines.push(`- Recent portal activity: ${pr.hasRecentActivity ? "yes" : "no"}`)
    if (pr.messageSent) {
      lines.push(`- Portal message: ALREADY SENT via portal — prefer portal channel over email`)
    }
    lines.push(`- Portal data confidence: ${pr.confidence}/100`)
    if (!pr.visibility) {
      lines.push(`\nIMPORTANT: The invoice is NOT visible in the customer's portal. This likely means a billing system issue. Escalate faster and consider direct contact (phone or formal_notice) since the customer may not even know about this invoice.`)
    }
    if (pr.messageSent) {
      lines.push(`\nIMPORTANT: A message has already been sent via the customer's portal. Prefer portal-based follow-up over email since the customer is more likely to see portal messages.`)
    }
    if (pr.engagementLevel === "high") {
      lines.push(`\nNote: High portal engagement suggests the customer is aware of the invoice. Use a gentler tone.`)
    }
    portalSection = lines.join("\n")
  }

  const prompt = `You are OpsPilot's collections decision agent. Analyze this overdue invoice situation and produce a structured decision.

## Invoice Context
- Customer: ${params.customerName}
- Invoice: ${params.invoiceNumber}
- Amount: $${params.amount.toFixed(0)}
- Days overdue: ${params.daysOverdue}
- Reminders already sent: ${params.reminderCount}
- Customer lifetime value: $${params.lifetimeValue.toFixed(0)}

## Customer history
- Relationship length: ${params.relationshipMonths} months
- Total invoices: ${params.totalInvoices} (on-time rate: ${params.paymentRatePct !== null ? `${params.paymentRatePct}%` : "unknown"})
- Avg days late when late: ${params.avgDaysLate !== null ? `${params.avgDaysLate}d` : "unknown"}
- Prior overdue invoices: ${params.priorOverdueCount}
- Written-off invoices: ${params.writtenOffCount}
- Payment trajectory: ${params.trajectory}
  Compare this customer's current behavior to their history. A long-time on-time customer suddenly 60d late is a red flag. A historically slow payer now improving deserves patience.

## Signals
- Aggression budget: ${params.aggressionBudget}/100 (higher = more aggressive warranted; softened by LTV)
- LTV factor: ${params.ltvFactor.toFixed(2)} (0.3 = high-value, treat carefully)
- External signals: ${params.externalSignals.newsSummary}
- Financial distress flag: ${params.externalSignals.distressFlag ? "YES — customer may be in distress" : "none detected"}
${portalSection}

## Prior rescue actions taken
${params.priorActions.length > 0 ? params.priorActions.join(", ") : "none"}

## Allowed actions (from rule filter)
${params.allowedActions.join(", ")}

## Your task
Think step by step:
1. Classify the customer situation: "forgot" (good history, just slipped), "cash_flow" (struggling financially), "disputing" (quality/delivery issue), or "bad_actor" (chronic late, no engagement)
2. Score your confidence 0–100. Be honest — signal conflicts lower confidence.
3. Select the best action from the allowed list above
4. Choose channel: email, stripe, phone, or formal_notice
5. Choose tone: friendly, firm, formal, or urgent (respect the aggression budget)
6. Draft a concise outreach message (2-4 sentences)
7. Write a branching response plan covering all three scenarios:
   - noReply: what to do if no response in 3 days
   - dispute: what to do if customer disputes the invoice
   - partialPayment: what to do if customer offers partial payment

Respond ONLY with valid JSON matching this schema exactly:
{
  "classification": "forgot" | "cash_flow" | "disputing" | "bad_actor",
  "confidence": number,
  "chainOfThought": "your full reasoning here (2-4 sentences explaining the decision)",
  "selectedAction": "one of the allowed actions",
  "channel": "email" | "stripe" | "phone" | "formal_notice",
  "tone": "friendly" | "firm" | "formal" | "urgent",
  "outreachDraft": "the message to send",
  "responsePlan": {
    "noReply": "what to do if no response in 3 days",
    "dispute": "what to do if customer disputes the invoice",
    "partialPayment": "what to do if customer offers partial payment"
  },
  "humanReviewReason": "why this needs human review, or null if confident"
}`

  const message = await anthropic.messages.create({
    model:      "claude-haiku-4-5",
    max_tokens: 1000,
    messages:   [{ role: "user", content: prompt }],
  })

  const text = message.content[0]?.type === "text" ? message.content[0].text : ""
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("No JSON in Claude response")

  const parsed = JSON.parse(jsonMatch[0]) as {
    classification:    CustomerClassification
    confidence:        number
    chainOfThought:    string
    selectedAction:    string
    channel:           CollectionsDecision["channel"]
    tone:              CollectionsDecision["tone"]
    outreachDraft:     string
    responsePlan:      CollectionsDecision["responsePlan"]
    humanReviewReason: string | null
  }

  const humanReviewFlag = parsed.confidence < 75

  return {
    classification:    parsed.classification,
    confidence:        parsed.confidence,
    trajectory:        params.trajectory,
    aggressionBudget:  params.aggressionBudget,
    ltvFactor:         params.ltvFactor,
    allowedActions:    params.allowedActions,
    chainOfThought:    parsed.chainOfThought,
    selectedAction:    parsed.selectedAction,
    channel:           parsed.channel,
    tone:              parsed.tone,
    outreachDraft:     parsed.outreachDraft,
    responsePlan:      parsed.responsePlan,
    humanReviewFlag,
    humanReviewReason: humanReviewFlag ? (parsed.humanReviewReason ?? undefined) : undefined,
    externalSignals:   params.externalSignals,
  }
}

// ── Main entry ─────────────────────────────────────────────────────────────

export async function runCollectionsDecision(
  client: SupabaseClient,
  invoiceId: string,
  orgId: string
): Promise<CollectionsDecision> {
  // 1. Fetch invoice + customer
  const { data: inv } = await client
    .from("invoices")
    .select("id, invoice_number, total_amount, amount_paid, due_at, status, reminder_count, customer_id, customers ( full_name, email, lifetime_value, risk_status )")
    .eq("id", invoiceId)
    .eq("organization_id", orgId)
    .single()

  if (!inv) throw new Error(`Invoice ${invoiceId} not found`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cust = (Array.isArray(inv.customers) ? inv.customers[0] : inv.customers) as any
  const daysOverdue = inv.due_at
    ? Math.max(0, Math.floor((Date.now() - new Date(inv.due_at as string).getTime()) / 86_400_000))
    : 0
  const amount         = Number(inv.total_amount) - Number(inv.amount_paid)
  const reminderCount  = Number(inv.reminder_count ?? 0)
  const lifetimeValue  = Number(cust?.lifetime_value ?? 0)
  const customerName   = (cust?.full_name as string) ?? "Unknown"
  const customerId     = inv.customer_id as string

  // 2. Payment history profile
  const profile = await getCustomerProfile(orgId, customerId)

  // 3. Trajectory + LTV aggression
  const trajectory      = analyzeTrajectory(profile)
  const ltvFactor       = computeLtvFactor(lifetimeValue)
  const aggressionBudget = computeAggressionBudget(daysOverdue, ltvFactor)

  // 4. External signals (non-blocking)
  const externalSignals = await fetchExternalSignals(customerName)

  // 4b. Portal reconnaissance (non-blocking — never blocks collections workflow)
  let portalReconnaissance: CollectionsDecision["portalReconnaissance"]
  try {
    const portalResult = await portalReconInvestigate({
      invoiceId,
      customerId,
    })
    portalReconnaissance = {
      visibility:          portalResult.result.visibility,
      paymentStatus:       portalResult.result.paymentStatus,
      shouldSkipCollection: portalResult.result.shouldSkipCollection,
      hasRecentActivity:   portalResult.result.hasRecentActivity,
      engagementLevel:     portalResult.result.engagementLevel,
      messageSent:         portalResult.result.messageSent,
      confidence:          Math.round(
        (portalResult.result.visibilityConfidence + portalResult.result.activityConfidence) / 2
      ),
    }
  } catch (err) {
    console.warn(
      "[CollectionsDecision] Portal reconnaissance failed, proceeding without portal data:",
      err instanceof Error ? err.message : err
    )
    portalReconnaissance = undefined
  }

  // 4c. Portal signal: skip collection if payment already processing (Req 7.2)
  if (portalReconnaissance?.shouldSkipCollection) {
    return {
      classification:    "forgot" as CustomerClassification,
      confidence:        95,
      trajectory,
      aggressionBudget:  0,
      ltvFactor,
      allowedActions:    ["skip"],
      chainOfThought:    "Payment already processing in customer portal. Skipping collection to avoid contacting a customer who has already paid.",
      selectedAction:    "skip",
      channel:           "email",
      tone:              "friendly",
      outreachDraft:     "",
      responsePlan: {
        noReply:        "No action needed — payment is processing.",
        dispute:        "No action needed — payment is processing.",
        partialPayment: "No action needed — payment is processing.",
      },
      humanReviewFlag:    false,
      externalSignals,
      portalReconnaissance,
      reevaluateAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    }
  }

  // 4d. Portal signal: adjust aggression budget based on engagement (Req 7.3)
  //     High engagement → gentler tone (reduce aggression budget by 10, floor 0)
  const adjustedAggressionBudget = portalReconnaissance?.engagementLevel === "high"
    ? Math.max(aggressionBudget - 10, 0)
    : aggressionBudget

  // 5. Rule filter
  const allowedActions = applyRuleFilter(daysOverdue, reminderCount, inv.status as string)

  // 6. Prior rescue actions
  const { data: priorData } = await client
    .from("ai_actions")
    .select("action_type")
    .eq("entity_id", invoiceId)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true })
  const priorActions = (priorData ?? []).map(r => r.action_type as string)

  // 7. Legal guardrails check (DISABLED FOR DEMO - just log warnings)
  const guardrailCheck = await checkLegalGuardrails(client, orgId, customerId, invoiceId)
  if (!guardrailCheck.passed) {
    // Log the warning but don't block - for demo purposes
    console.warn(`[CollectionsDecision] Guardrail warning for invoice ${invoiceId}: ${guardrailCheck.reason}`)
  }

  // 8. Claude chain-of-thought (with deterministic fallback)
  let decision: Omit<CollectionsDecision, "reevaluateAt">
  try {
    decision = await claudeDecision({
      customerName,
      invoiceNumber:      (inv.invoice_number as string) ?? "—",
      amount,
      daysOverdue,
      reminderCount,
      trajectory,
      aggressionBudget:   adjustedAggressionBudget,
      ltvFactor,
      lifetimeValue,
      allowedActions,
      priorActions,
      paymentRatePct:     profile.paymentRatePct,
      avgDaysLate:        profile.avgDaysLate,
      totalInvoices:      profile.totalInvoices,
      relationshipMonths: profile.relationshipMonths,
      priorOverdueCount:  profile.priorOverdueCount,
      writtenOffCount:    profile.writtenOffCount,
      externalSignals,
      portalReconnaissance,
    })
  } catch {
    decision = deterministicDecision(
      customerName, amount, daysOverdue, trajectory,
      allowedActions, adjustedAggressionBudget, ltvFactor, lifetimeValue, profile, externalSignals,
      portalReconnaissance
    )
  }

  // 9. High-stakes gate check
  const stakesCheck = checkHighStakesGate(amount, decision.selectedAction, lifetimeValue, adjustedAggressionBudget)
  if (stakesCheck.requiresApproval) {
    return {
      ...decision,
      humanReviewFlag: true,
      humanReviewReason: stakesCheck.reason,
      portalReconnaissance,
      reevaluateAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    }
  }

  return {
    ...decision,
    portalReconnaissance,
    reevaluateAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
  }
}
