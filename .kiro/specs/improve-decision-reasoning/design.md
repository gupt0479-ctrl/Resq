# Design Document: Improve Decision Reasoning

## Overview

This feature enhances the collections decision agent's fallback logic by replacing technical jargon with human-readable explanations. When Claude is unavailable, the system currently shows messages like "Fallback decision: 31d overdue, trajectory=flat, aggression=78" which are not user-friendly.

The solution introduces a `generateHumanReadableReasoning` function that transforms technical parameters (trajectory, aggression budget, LTV factor) into plain-language explanations. This function will be called within the existing `deterministicDecision` function, requiring minimal changes to the codebase.

**Key Design Principles:**
- Single-purpose function that takes decision parameters and returns a readable string
- No changes to decision logic, only to explanation generation
- Graceful handling of missing/null data
- Output fits existing UI constraints (100-300 characters)

## Architecture

### Component Structure

```
deterministicDecision()
  ├─> analyzeTrajectory() [existing]
  ├─> computeAggressionBudget() [existing]
  ├─> applyRuleFilter() [existing]
  └─> generateHumanReadableReasoning() [NEW]
       ├─> contextualizeCustomerBehavior()
       ├─> explainActionSelection()
       └─> formatReasoningOutput()
```

### Function Signature

```typescript
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
}): string
```

### Integration Point

The function will be called within `deterministicDecision` just before returning the decision object:

```typescript
// Current code:
chainOfThought: `Fallback decision: ${daysOverdue}d overdue, trajectory=${trajectory}, aggression=${aggressionBudget}. Selected "${action}" based on rule filter.`

// New code:
chainOfThought: generateHumanReadableReasoning({
  customerName,
  daysOverdue,
  amount,
  trajectory,
  aggressionBudget,
  ltvFactor,
  lifetimeValue,
  selectedAction: action,
  allowedActions,
  profile: { /* passed from caller */ },
  externalSignals
})
```

## Components and Interfaces

### 1. Reasoning Generator (Main Function)

**Purpose:** Orchestrates the generation of human-readable explanations by combining customer context, action rationale, and influencing factors.

**Input:**
- Decision parameters (days overdue, amount, selected action)
- Customer profile (payment rate, avg days late, prior overdue count, relationship months)
- Technical scores (trajectory, aggression budget, LTV factor)
- External signals (news summary, distress flag)

**Output:** A 2-4 sentence explanation string (100-300 characters)

**Logic Flow:**
1. Build customer situation context (payment history + current status)
2. Identify primary decision driver (distress > days overdue > payment history)
3. Explain action selection rationale
4. Format into cohesive narrative

### 2. Customer Behavior Contextualizer

**Purpose:** Translates payment history into plain language, highlighting unusual patterns.

**Key Transformations:**
- `paymentRatePct >= 90%` → "excellent payment history"
- `paymentRatePct 70-89%` → "generally reliable payment history"
- `paymentRatePct 50-69%` → "inconsistent payment history"
- `paymentRatePct < 50%` → "poor payment history"
- `priorOverdueCount === 0` → "first late payment"
- `priorOverdueCount >= 2` → "recurring late payment pattern"

**Anomaly Detection:**
- Good history (>=90%) + significantly overdue (>30d) → "unusual for this customer"
- Poor history (<50%) + overdue → "consistent with past behavior"

### 3. Action Selection Explainer

**Purpose:** Provides clear rationale for why a specific action was chosen.

**Action-Specific Templates:**

**payment_plan:**
- Condition: `daysOverdue > 14 && allowedActions.includes("payment_plan")`
- Explanation: "Customer is {days} days overdue and may need flexible payment options"
- Context: Include payment history to justify flexibility

**reminder:**
- Condition: `daysOverdue < 7 || (good payment history && first late payment)`
- Explanation: "Early overdue period" OR "Good payment history suggests gentle reminder appropriate"

**escalation:**
- Condition: `reminderCount >= 3`
- Explanation: "Multiple reminders sent without response, escalation warranted"

**clarification:**
- Condition: `status === "disputed"`
- Explanation: "Invoice status is disputed, clarification needed before collections"

### 4. Reasoning Formatter

**Purpose:** Structures explanation components into a cohesive, readable narrative.

**Format Pattern:**
```
[Customer Context]. [Primary Driver]. [Action Rationale].
```

**Example Outputs:**

**Scenario 1: High-value customer, first late payment**
```
"Customer has excellent payment history (95% on-time) over 18 months but is now 31 days overdue on $2,450. This is unusual behavior for this customer. Given their $12,000 lifetime value and clean history, offering a payment plan shows flexibility while addressing the overdue amount."
```

**Scenario 2: Chronic late payer**
```
"Customer has poor payment history (40% on-time) with 3 prior overdue invoices, now 45 days late on $890. This is consistent with their pattern. Multiple reminders have been sent without response, warranting escalation to formal collections."
```

**Scenario 3: Financial distress detected**
```
"Customer is 22 days overdue on $1,200. External signals indicate potential financial distress (bankruptcy filing detected). Given the distress indicators, a payment plan offers a path to recovery while preserving the relationship."
```

## Data Models

### Input Data Structure

```typescript
interface ReasoningParams {
  // Invoice context
  customerName: string
  daysOverdue: number
  amount: number
  
  // Decision outputs
  selectedAction: string
  allowedActions: string[]
  
  // Technical scores
  trajectory: Trajectory  // "improving" | "flat" | "worsening"
  aggressionBudget: number  // 0-100
  ltvFactor: number  // 0-0.3
  lifetimeValue: number
  
  // Customer profile
  profile: {
    paymentRatePct: number | null
    avgDaysLate: number | null
    priorOverdueCount: number
    totalInvoices: number
    relationshipMonths: number
    writtenOffCount: number
  }
  
  // External signals
  externalSignals: {
    newsSummary: string
    distressFlag: boolean
    dataSource: "mock" | "live"
  }
}
```

### Output Data Structure

```typescript
type ReasoningOutput = string  // 100-300 character explanation
```

### Internal Helper Types

```typescript
type PaymentHistoryLabel = 
  | "excellent payment history"
  | "generally reliable payment history"
  | "inconsistent payment history"
  | "poor payment history"
  | "new customer"

type BehaviorPattern =
  | "first late payment"
  | "recurring late payment pattern"
  | "consistent with past behavior"
  | "unusual for this customer"

type DecisionDriver =
  | "financial_distress"
  | "days_overdue"
  | "payment_history"
  | "relationship_value"
```

## Correctness Properties

*Property-based testing is not applicable to this feature. The reasoning generator produces natural language output based on business rules and contextual data. The correctness of the output is subjective and depends on human judgment of readability and appropriateness.*

*Instead, this feature will be validated through:*
- **Unit tests with example scenarios** covering different customer profiles and decision contexts
- **Snapshot tests** to detect unintended changes in output format
- **Manual review** of generated explanations against requirements

## Error Handling

### Null/Missing Data Handling

**Strategy:** Use fallback descriptions instead of crashing or showing "null/undefined"

**Implementation:**

```typescript
function getPaymentHistoryLabel(paymentRatePct: number | null): string {
  if (paymentRatePct === null) return "payment history"
  if (paymentRatePct >= 90) return "excellent payment history"
  if (paymentRatePct >= 70) return "generally reliable payment history"
  if (paymentRatePct >= 50) return "inconsistent payment history"
  return "poor payment history"
}

function getRelationshipContext(relationshipMonths: number, lifetimeValue: number): string {
  if (relationshipMonths === 0) return "new customer"
  if (lifetimeValue === 0) return `${relationshipMonths}-month relationship`
  return `${relationshipMonths}-month relationship with $${lifetimeValue.toFixed(0)} lifetime value`
}
```

### External Signals Unavailable

**Strategy:** Omit external signal references if unavailable or in mock mode

```typescript
function shouldIncludeExternalSignals(signals: CollectionsDecision["externalSignals"]): boolean {
  return signals.dataSource === "live" && 
         (signals.distressFlag || signals.newsSummary !== "No notable news found for this customer.")
}
```

### Exception Handling

**Strategy:** Never throw exceptions; return generic fallback explanation

```typescript
function generateHumanReadableReasoning(params: ReasoningParams): string {
  try {
    // Main reasoning generation logic
    return buildReasoning(params)
  } catch (error) {
    console.error("[generateHumanReadableReasoning] failed:", error)
    return `Customer is ${params.daysOverdue} days overdue on $${params.amount.toFixed(0)}. Recommended action: ${params.selectedAction}.`
  }
}
```

### Character Limit Enforcement

**Strategy:** Truncate gracefully if explanation exceeds 300 characters

```typescript
function enforceCharacterLimit(explanation: string, maxLength: number = 300): string {
  if (explanation.length <= maxLength) return explanation
  
  // Truncate at last complete sentence before limit
  const truncated = explanation.substring(0, maxLength)
  const lastPeriod = truncated.lastIndexOf('.')
  
  return lastPeriod > 100 ? truncated.substring(0, lastPeriod + 1) : truncated + "..."
}
```

## Testing Strategy

### Unit Tests

**Test Categories:**

1. **Payment History Contextualization**
   - Excellent history (>=90%) → "excellent payment history"
   - Poor history (<50%) → "poor payment history"
   - Null payment rate → generic "payment history"
   - New customer (0 months) → "new customer"

2. **Behavior Pattern Detection**
   - Good history + significantly overdue → "unusual for this customer"
   - Poor history + overdue → "consistent with past behavior"
   - First late payment (priorOverdueCount === 0) → "first late payment"
   - Recurring pattern (priorOverdueCount >= 2) → "recurring late payment pattern"

3. **Action Selection Explanation**
   - payment_plan selected → mentions "flexible payment options"
   - reminder selected → mentions "early overdue" or "good history"
   - escalation selected → mentions "multiple reminders without response"
   - clarification selected → mentions "disputed" status

4. **External Signals Integration**
   - Distress flag true → mentions "financial distress"
   - Distress flag false → omits distress references
   - Mock data source → omits external signal references
   - Live data source with signals → includes signal context

5. **Edge Cases**
   - All null profile fields → produces valid explanation
   - Zero lifetime value → omits LTV references
   - Empty allowed actions → handles gracefully
   - Very long customer name → doesn't break formatting

6. **Character Limits**
   - Explanation under 100 chars → passes through
   - Explanation 100-300 chars → passes through
   - Explanation over 300 chars → truncates at sentence boundary

**Test Framework:** Jest (existing project test framework)

**Example Test:**

```typescript
describe("generateHumanReadableReasoning", () => {
  it("should flag unusual behavior for good customer suddenly overdue", () => {
    const reasoning = generateHumanReadableReasoning({
      customerName: "Acme Corp",
      daysOverdue: 35,
      amount: 2500,
      selectedAction: "payment_plan",
      allowedActions: ["payment_plan", "escalation"],
      trajectory: "worsening",
      aggressionBudget: 65,
      ltvFactor: 0.25,
      lifetimeValue: 10000,
      profile: {
        paymentRatePct: 95,
        avgDaysLate: 2,
        priorOverdueCount: 0,
        totalInvoices: 24,
        relationshipMonths: 18,
        writtenOffCount: 0
      },
      externalSignals: {
        newsSummary: "No notable news found for this customer.",
        distressFlag: false,
        dataSource: "mock"
      }
    })
    
    expect(reasoning).toContain("excellent payment history")
    expect(reasoning).toContain("unusual")
    expect(reasoning).toContain("payment plan")
  })
})
```

### Integration Tests

**Scope:** Verify reasoning generator integrates correctly with `deterministicDecision`

**Test Cases:**
1. Call `deterministicDecision` with various customer profiles
2. Verify `chainOfThought` field contains human-readable explanation (not technical jargon)
3. Verify no technical terms appear: "trajectory=", "aggression=", "rule filter"
4. Verify explanation length is within 100-300 character range

### Manual Review Checklist

Before deployment, manually review generated explanations for:
- [ ] Clarity: Can a non-technical user understand the reasoning?
- [ ] Accuracy: Does the explanation match the decision parameters?
- [ ] Tone: Is the language professional and appropriate?
- [ ] Completeness: Are key factors (payment history, days overdue, action rationale) included?
- [ ] Consistency: Do similar scenarios produce similar explanations?

## Implementation Plan

### Phase 1: Core Reasoning Generator

**Files to Modify:**
- `src/lib/services/collections-decision-agent.ts`

**Changes:**
1. Add `generateHumanReadableReasoning` function before `deterministicDecision`
2. Add helper functions: `getPaymentHistoryLabel`, `getBehaviorPattern`, `getActionRationale`
3. Update `deterministicDecision` to pass `profile` parameter (requires caller to fetch profile)
4. Replace technical `chainOfThought` with call to reasoning generator

**Estimated Effort:** 2-3 hours

### Phase 2: Helper Functions

**Functions to Implement:**

1. `getPaymentHistoryLabel(paymentRatePct: number | null): string`
2. `getBehaviorPattern(profile: CustomerProfile, daysOverdue: number): string`
3. `getActionRationale(action: string, daysOverdue: number, profile: CustomerProfile): string`
4. `formatReasoningSentences(parts: string[]): string`
5. `enforceCharacterLimit(text: string, max: number): string`

**Estimated Effort:** 1-2 hours

### Phase 3: Testing

**Test Files to Create:**
- `src/lib/services/__tests__/collections-decision-reasoning.test.ts`

**Test Coverage:**
- Unit tests for all helper functions
- Integration tests for `generateHumanReadableReasoning`
- Edge case tests for null/missing data
- Character limit enforcement tests

**Estimated Effort:** 2-3 hours

### Phase 4: Manual Review & Refinement

**Activities:**
1. Generate explanations for 10-15 real customer scenarios
2. Review with product/collections team for clarity and tone
3. Refine templates based on feedback
4. Update tests to match refined output

**Estimated Effort:** 1-2 hours

**Total Estimated Effort:** 6-10 hours

## Deployment Considerations

### Backward Compatibility

- No changes to `CollectionsDecision` type structure
- No changes to Claude decision path (only fallback path modified)
- Existing UI components (`RescueClient.tsx`) work without modification
- Database schema unchanged

### Rollout Strategy

1. **Development:** Implement and test in local environment
2. **Staging:** Deploy to staging, manually review generated explanations
3. **Production:** Deploy during low-traffic period, monitor for errors
4. **Validation:** Review first 50 fallback decisions in production for quality

### Monitoring

**Metrics to Track:**
- Fallback decision rate (should remain unchanged)
- Average explanation length (target: 150-250 chars)
- Error rate in reasoning generator (target: 0%)
- Human review flag rate (should remain unchanged)

**Logging:**
```typescript
console.log("[generateHumanReadableReasoning]", {
  customerName,
  daysOverdue,
  selectedAction,
  explanationLength: reasoning.length,
  containsTechnicalJargon: /trajectory=|aggression=|rule filter/.test(reasoning)
})
```

### Rollback Plan

If generated explanations are unclear or cause issues:
1. Revert to previous technical explanation format
2. Add feature flag to toggle between technical and human-readable explanations
3. Investigate and fix issues in development
4. Redeploy with fixes

## Future Enhancements

### Phase 2 Improvements (Post-Launch)

1. **Tone Calibration:** Adjust explanation tone based on aggression budget
   - Low aggression (< 30): Empathetic, understanding tone
   - High aggression (> 70): Direct, urgent tone

2. **Action Comparison:** Explain why selected action was chosen over alternatives
   - "Payment plan chosen over escalation given customer's strong history"

3. **Confidence Indicators:** Include confidence level in explanation
   - "High confidence: Customer pattern clearly indicates..."
   - "Moderate confidence: Mixed signals suggest..."

4. **Localization:** Support multiple languages for international customers

5. **A/B Testing:** Test different explanation formats to optimize clarity

### Integration with Claude Path

Currently, Claude generates its own `chainOfThought`. Future work could:
- Apply similar reasoning principles to Claude's explanations
- Ensure consistency between Claude and fallback explanations
- Use reasoning generator as a fallback if Claude's explanation is too technical

## Appendix: Example Transformations

### Before (Technical)
```
"Fallback decision: 31d overdue, trajectory=flat, aggression=78. Selected 'payment_plan' based on rule filter."
```

### After (Human-Readable)
```
"Customer has generally reliable payment history (75% on-time) but is now 31 days overdue on $2,450. Given their 12-month relationship and $8,500 lifetime value, offering a payment plan balances firmness with flexibility."
```

---

### Before (Technical)
```
"Fallback decision: 45d overdue, trajectory=worsening, aggression=92. Selected 'escalation' based on rule filter."
```

### After (Human-Readable)
```
"Customer has poor payment history (35% on-time) with 4 prior overdue invoices, now 45 days late on $1,200. This is consistent with their pattern. Multiple reminders sent without response warrant escalation."
```

---

### Before (Technical)
```
"Fallback decision: 22d overdue, trajectory=worsening, aggression=55. Selected 'payment_plan' based on rule filter."
```

### After (Human-Readable)
```
"Customer is 22 days overdue on $3,100. External signals indicate potential financial distress. Given the distress indicators, a payment plan offers a path to recovery while preserving the relationship."
```
