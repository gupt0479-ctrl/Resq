# Design Document: Resq Cash Breakpoint Agent

## High-Level Design

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Rescue Queue UI (/rescue)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ Current   │ │ Cash     │ │Breakpoint│ │ Largest  │               │
│  │ Cash Pos  │ │Collected │ │  Week    │ │Risk Driver│              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
│  ┌─────────────────┐  ┌────────────────────────────────────────┐    │
│  │  Case List       │  │  Analysis Overlay (modal)              │    │
│  │  (risk-sorted)   │  │  ┌─────────┐ ┌──────────────────────┐ │    │
│  │  • Client A      │  │  │ TinyFish│ │ 4 Client Summary     │ │    │
│  │  • Client B      │  │  │ Findings│ │ Boxes + AI Text      │ │    │
│  │  • Client C      │  │  │ (left)  │ │ + Action Queue       │ │    │
│  │                   │  │  └─────────┘ └──────────────────────┘ │    │
│  └─────────────────┘  └────────────────────────────────────────┘    │
│           [ Run AI Analysis ]                                        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │     API Layer        │
                    │  GET /api/cash/summary│
                    │  POST /api/cash/analyze│
                    │  GET /api/cash/forecast│
                    │  POST /api/cash/actions/:id/execute│
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                     │
┌─────────▼────────┐ ┌────────▼────────┐ ┌─────────▼────────┐
│ Cash Domain       │ │ Agent Layer     │ │ External Research │
│ Services          │ │                 │ │                   │
│ • Cash_Model      │ │ • Action_Ranker │ │ • TinyFish_Agent  │
│ • Forecast_Engine │ │ • Collections   │ │   (client signals,│
│ • Breakpoint_     │ │   Decision Agent│ │    financing,     │
│   Detector        │ │                 │ │    vendor alts)   │
│ • Risk_Driver_    │ │                 │ │                   │
│   Analyzer        │ │                 │ │                   │
│ • Collection_Lag_ │ │                 │ │                   │
│   Computer        │ │                 │ │                   │
└─────────┬────────┘ └────────┬────────┘ └─────────┬────────┘
          │                    │                     │
          └────────────────────┼─────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │     Supabase        │
                    │  • finance_transactions│
                    │  • invoices          │
                    │  • cash_obligations  │ (NEW)
                    │  • cash_forecast_    │
                    │    snapshots         │ (NEW)
                    │  • ai_actions        │
                    │  • customers         │
                    └─────────────────────┘
```

### Correctness Promise

- 100% accurate actuals — derived from cleared ledger only
- 100% deterministic forecast math — same inputs = same outputs, always
- 100% explicit assumptions — every projection tagged with its reasoning
- 0 hallucinated financial numbers — AI summarizes and ranks, never owns cash numbers
- Supabase is the source of truth, not TinyFish, not Claude

### What Is NOT In Scope

- Spreadsheet import (deferred — not needed for rescue queue first)
- Full AP automation
- ML model training
- Lender application flows
- Generalized vendor/insurance surface on the rescue page
- Annual metrics (use 90-day window, not annual — rescue queue is short-horizon)

### Existing Code Reuse Map

| Existing Code | Reuse For |
|---|---|
| `src/lib/queries/rescue.ts` → `getRescueQueue()` | Case list data (keep as-is, risk-sorted invoices) |
| `src/lib/services/collections-decision-agent.ts` → `runCollectionsDecision()` | Client classification, external signals, outreach drafts |
| `src/lib/services/collections-decision-agent.ts` → `fetchExternalSignals()` | TinyFish client research for overlay left rail |
| `src/lib/services/collections-decision-agent.ts` → `analyzeTrajectory()` | Payment trend (improving/flat/worsening) |
| `src/lib/services/finance.ts` → `listTransactions()` | Ledger data for Cash_Model |
| `src/lib/tinyfish/client.ts` → `search()`, `runAgent()` | TinyFish mock/live/misconfigured contract |
| `src/lib/tinyfish/mock-data.ts` → `FINANCING_OFFERS` | Mock financing data for Action_Ranker |
| `src/lib/services/ai-actions.ts` → `recordAiAction()` | Audit timeline entries |
| `src/app/api/rescue/[invoiceId]/run/route.ts` | Reference pattern for new `/api/cash/analyze` route |

> The existing `collections-decision-agent.ts` already has: customer classification (forgot/cash_flow/disputing/bad_actor), external signal fetching via TinyFish, portal reconnaissance, LTV-weighted aggression, and Claude-powered decision generation. The Action_Ranker should WRAP the existing collections decision agent, not replace it. The existing `fetchExternalSignals()` function already does TinyFish search + Claude summarization. The existing `analyzeTrajectory()` function already computes improving/flat/worsening trends. New cash domain services (Cash_Model, Forecast_Engine, etc.) are additive — they don't replace existing services.

### Component Responsibilities

| Component | Responsibility | Touches AI? |
|---|---|---|
| Cash_Model | Computes current cash position from cleared ledger. Pure arithmetic. | No |
| Collection_Lag_Computer | Computes avg days-to-collect per client from paid invoices. Buckets into tiers. | No |
| Forecast_Engine | Produces 13-week waterfall with 3 scenarios using collection lag. | No |
| Breakpoint_Detector | Finds first week below threshold. Computes default threshold. | No |
| Risk_Driver_Analyzer | Counterfactual removal analysis to rank drivers. | No |
| Action_Ranker | Generates and ranks interventions. Uses Claude for natural-language summary. | Yes |
| TinyFish_Agent | External client research, financing discovery, vendor alternatives. | Yes (external) |
| Audit_Timeline | Append-only logging to ai_actions table. | No |

### Page Load Strategy

- On page load: `GET /api/cash/summary` loads the 4 top metric boxes (fast, no AI)
- On page load: existing rescue queue query loads the case list (reuse `getRescueQueue`)
- On "Run AI Analysis" click: `POST /api/cash/analyze` runs the full pipeline (slower, includes AI)
- `GET /api/cash/forecast` is secondary — only called if the user wants the full waterfall view (not needed for the main rescue queue interaction)
- `POST /api/cash/actions/:id/execute` is called from within the overlay

### Data Flow: "Run AI Analysis" Pipeline

1. User clicks "Run AI Analysis" on selected client
2. UI calls `POST /api/cash/analyze` with `{ organizationId, clientId }`
3. API handler orchestrates (in parallel where possible):

   **Deterministic path (no AI):**
   a. `Cash_Model.computePosition(orgId)` → current cash, open receivables
   b. `Collection_Lag_Computer.computeForClient(orgId, clientId)` → lag tier, avg days, payment trend
   c. `Forecast_Engine.generate(orgId, "base")` → 13-week base waterfall
   d. `Breakpoint_Detector.detect(forecast, threshold)` → breakpoint result
   e. `Risk_Driver_Analyzer.analyze(forecast, breakpoint)` → ranked drivers

   **AI-assisted path (parallel with deterministic):**
   f. `fetchExternalSignals(clientName)` → TinyFish news/distress (reuse existing)
   g. `runCollectionsDecision(client, invoiceId, orgId)` → classification, outreach draft (reuse existing)

   **Summary generation (after both paths complete):**
   h. Claude generates natural-language summary from deterministic facts + AI findings
   i. Action_Ranker produces ONE recommended action (top-ranked)
   j. `recordAiAction(...)` → append audit entry

4. API returns combined response
5. UI renders Analysis_Overlay

---

## Low-Level Design

### New Supabase Tables

#### `cash_obligations`

Stores future committed outflows (payroll, rent, tax, vendor bills).

```sql
CREATE TABLE IF NOT EXISTS cash_obligations (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID           NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category         TEXT           NOT NULL,
  description      TEXT           NOT NULL,
  amount           NUMERIC(12, 2) NOT NULL,
  due_at           TIMESTAMPTZ    NOT NULL,
  recurrence       TEXT           NOT NULL DEFAULT 'one_time',
  is_active        BOOLEAN        NOT NULL DEFAULT TRUE,
  notes            TEXT,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT cash_obligations_category_check CHECK (
    category IN ('payroll', 'rent', 'tax', 'vendor_bill', 'insurance', 'loan_payment', 'other')
  ),
  CONSTRAINT cash_obligations_recurrence_check CHECK (
    recurrence IN ('one_time', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual')
  )
);

CREATE INDEX IF NOT EXISTS idx_cash_obligations_org
  ON cash_obligations(organization_id, due_at);
CREATE INDEX IF NOT EXISTS idx_cash_obligations_active
  ON cash_obligations(organization_id, is_active)
  WHERE is_active = TRUE;
```

#### `cash_forecast_snapshots`

Stores serialized forecast run results for deviation detection and historical comparison.

```sql
CREATE TABLE IF NOT EXISTS cash_forecast_snapshots (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  forecast_json    JSONB       NOT NULL,
  breakpoint_week  INTEGER,
  breakpoint_amount NUMERIC(12, 2),
  threshold_used   NUMERIC(12, 2) NOT NULL,
  scenario_type    TEXT        NOT NULL DEFAULT 'base',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cash_forecast_snapshots_scenario_check CHECK (
    scenario_type IN ('base', 'stress', 'upside')
  )
);

CREATE INDEX IF NOT EXISTS idx_cash_forecast_snapshots_org
  ON cash_forecast_snapshots(organization_id, created_at DESC);
```

---

### Zod Schemas for New Data Types

File: `src/lib/schemas/cash.ts`

```typescript
import { z } from "zod"

// ─── Cash Position ─────────────────────────────────────────────────────────

export const CashPositionSchema = z.object({
  currentCash: z.number(),
  openReceivables: z.number(),
  cashCollected90d: z.number(),
})

// ─── Collection Lag ────────────────────────────────────────────────────────

export const CollectionLagTierSchema = z.enum(["on_time", "slightly_late", "very_late"])

export const ClientCollectionLagSchema = z.object({
  clientId: z.string().uuid(),
  clientName: z.string(),
  avgDaysToCollect: z.number().nonnegative(),
  tier: CollectionLagTierSchema,
  paidInvoiceCount: z.number().int().nonnegative(),
  onTimePercent: z.number().min(0).max(100),
})

// ─── Weekly Forecast Bucket ────────────────────────────────────────────────

export const WeeklyBucketSchema = z.object({
  weekNumber: z.number().int().min(1).max(13),
  startDate: z.string(),
  endDate: z.string(),
  projectedInflows: z.number(),
  projectedOutflows: z.number(),
  endingBalance: z.number(),
  assumptionTags: z.array(z.string()).min(1),
})

export const ForecastScenarioSchema = z.object({
  scenarioType: z.enum(["base", "stress", "upside"]),
  weeks: z.array(WeeklyBucketSchema).length(13),
})

export const ForecastResponseSchema = z.object({
  base: ForecastScenarioSchema,
  stress: ForecastScenarioSchema,
  upside: ForecastScenarioSchema,
  generatedAt: z.string(),
  organizationId: z.string().uuid(),
})

// ─── Breakpoint ────────────────────────────────────────────────────────────

export const BreakpointResultSchema = z.object({
  detected: z.boolean(),
  weekNumber: z.number().int().min(1).max(13).nullable(),
  shortfallAmount: z.number().nullable(),
  thresholdUsed: z.number(),
  minimumProjectedBalance: z.number(),
  label: z.string(), // "Week 4" or "No risk"
})

// ─── Risk Driver ───────────────────────────────────────────────────────────

export const RiskDriverCategorySchema = z.enum([
  "receivable_slippage",
  "expense_spike",
  "revenue_shortfall",
  "tax_obligation",
  "recurring_obligation_increase",
])

export const RiskDriverSchema = z.object({
  category: RiskDriverCategorySchema,
  description: z.string(),
  cashImpact: z.number(),
  entityRef: z.string().nullable(),
})

// ─── Intervention ──────────────────────────────────────────────────────────

export const InterventionCategorySchema = z.enum([
  "accelerate_collection",
  "secure_financing",
  "defer_payment",
  "reduce_expense",
])

export const InterventionSchema = z.object({
  id: z.string().uuid(),
  category: InterventionCategorySchema,
  description: z.string(),
  cashImpactEstimate: z.number(),
  speedDays: z.number().int().nonnegative(),
  riskLevel: z.enum(["low", "medium", "high"]),
  confidenceScore: z.number().min(0).max(1),
  sourceAttribution: z.string().nullable(),
  executable: z.boolean(),
})

// ─── Cash Summary (4 metric boxes) ─────────────────────────────────────────

export const MetricBoxSchema = z.object({
  label: z.string(),
  value: z.string(),
  numericValue: z.number().nullable(),
  detail: z.string().nullable(),
})

export const CashSummaryResponseSchema = z.object({
  currentCashPosition: MetricBoxSchema,
  cashCollected: MetricBoxSchema,
  breakpointWeek: MetricBoxSchema,
  largestRiskDriver: MetricBoxSchema,
  deviation: z.object({
    oldBreakpointWeek: z.number().nullable(),
    newBreakpointWeek: z.number().nullable(),
    triggerEvent: z.string(),
    summary: z.string(),
    urgency: z.enum(["normal", "critical"]),
    createdAt: z.string(),
  }).nullable(),
  organizationId: z.string().uuid(),
  generatedAt: z.string(),
})

// ─── Cash Obligation ───────────────────────────────────────────────────────

export const CashObligationCategorySchema = z.enum([
  "payroll", "rent", "tax", "vendor_bill", "insurance", "loan_payment", "other",
])

export const CashObligationRecurrenceSchema = z.enum([
  "one_time", "weekly", "biweekly", "monthly", "quarterly", "annual",
])

export const CashObligationSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  category: CashObligationCategorySchema,
  description: z.string(),
  amount: z.number(),
  dueAt: z.string(),
  recurrence: CashObligationRecurrenceSchema,
  isActive: z.boolean(),
})

// ─── Analysis Response (POST /api/cash/analyze) ────────────────────────────

export const ClientSummaryBoxesSchema = z.object({
  totalOutstanding: z.number(),
  avgDaysToPay: z.number(),
  paymentReliabilityPercent: z.number().min(0).max(100),
  riskClassification: z.enum(["forgot", "cash_flow", "disputing", "bad_actor"]),
})

export const AnalysisResponseSchema = z.object({
  organizationId: z.string().uuid(),
  clientId: z.string().uuid(),
  clientName: z.string(),

  // 4 client summary boxes
  clientSummary: ClientSummaryBoxesSchema,

  // Collection lag for this client
  collectionLag: ClientCollectionLagSchema,

  // AI-generated natural language summary
  aiSummary: z.string(),

  // TinyFish external findings
  externalFindings: z.object({
    newsSummary: z.string(),
    rawSnippets: z.array(z.string()),
    distressFlag: z.boolean(),
    dataSource: z.enum(["live", "mock"]),
  }),

  // Ranked interventions (read-only context list)
  interventions: z.array(InterventionSchema),

  // The single top-ranked recommended action
  recommendedAction: InterventionSchema.nullable(),

  // Breakpoint context
  breakpoint: BreakpointResultSchema,

  // Top risk drivers
  riskDrivers: z.array(RiskDriverSchema),

  // Audit
  auditRecordId: z.string().uuid(),
  mode: z.enum(["live", "mock"]),
  degradedFromLive: z.boolean(),
  warning: z.string().nullable(),
  generatedAt: z.string(),
})

// ─── Action Execution ──────────────────────────────────────────────────────

export const ActionExecuteRequestSchema = z.object({
  interventionId: z.string().uuid(),
})

export const ActionExecuteResponseSchema = z.object({
  status: z.enum(["executed", "failed", "requires_manual"]),
  auditRecordId: z.string().uuid(),
  executionType: z.string(),
  artifacts: z.object({
    draftEmailContent: z.string().nullable(),
    taskDescription: z.string().nullable(),
  }).nullable(),
  guidanceText: z.string().nullable(),
})

// ─── Deviation ─────────────────────────────────────────────────────────────

export const DeviationRecordSchema = z.object({
  oldBreakpointWeek: z.number().int().nullable(),
  newBreakpointWeek: z.number().int().nullable(),
  triggerEvent: z.string(),
  summary: z.string(),
  urgency: z.enum(["normal", "critical"]),
  createdAt: z.string(),
})
```


---

### Algorithm: Collection Lag Computation

File: `src/lib/services/collection-lag.ts`

```
FUNCTION computeCollectionLag(orgId, clientId?):
  // 1. Fetch all paid invoices for the org (or specific client)
  paidInvoices = SELECT id, customer_id, created_at, paid_at
                 FROM invoices
                 WHERE organization_id = orgId
                   AND status = 'paid'
                   AND paid_at IS NOT NULL
                   AND (clientId IS NULL OR customer_id = clientId)

  // 2. Compute days-to-collect for each invoice
  FOR EACH invoice IN paidInvoices:
    invoice.daysToCollect = (paid_at - created_at) in calendar days

  // 3. Group by client
  clientGroups = GROUP paidInvoices BY customer_id

  // 4. For each client, compute average and assign tier
  results = []
  FOR EACH (clientId, invoices) IN clientGroups:
    IF invoices.length < 2:
      SKIP (will use org-wide fallback)

    avgDays = MEAN(invoices.map(i => i.daysToCollect))
    avgDueDateDays = MEAN(invoices.map(i => (i.due_at - i.created_at) in days))
    daysLate = avgDays - avgDueDateDays

    tier = CASE
      WHEN daysLate <= 5  THEN "on_time"
      WHEN daysLate <= 30 THEN "slightly_late"
      ELSE                     "very_late"
    END

    onTimeCount = COUNT(invoices WHERE paid_at <= due_at)
    onTimePercent = (onTimeCount / invoices.length) * 100

    results.push({ clientId, avgDaysToCollect: avgDays, tier, paidInvoiceCount: invoices.length, onTimePercent })

  // 5. Compute org-wide fallback for clients with < 2 paid invoices
  allDays = paidInvoices.map(i => i.daysToCollect)
  orgAvgDays = MEAN(allDays) OR 30 (default if no paid invoices at all)

  // 6. Fill in clients with < 2 paid invoices using org average
  FOR EACH client with < 2 paid invoices:
    results.push({ clientId, avgDaysToCollect: orgAvgDays, tier: tierFromDays(orgAvgDays), paidInvoiceCount: count, onTimePercent: null })

  RETURN results
```

### Algorithm: 13-Week Forecast (Weekly Buckets)

File: `src/lib/services/forecast-engine.ts`

```
FUNCTION generateForecast(orgId, scenarioType = "base"):
  // 1. Starting cash = cleared ledger balance
  startingCash = SUM(finance_transactions WHERE direction='in' AND org=orgId)
                - SUM(finance_transactions WHERE direction='out' AND org=orgId)

  // 2. Compute collection lags for all clients
  lags = computeCollectionLag(orgId)

  // 3. Fetch open receivables
  openInvoices = SELECT * FROM invoices
                 WHERE organization_id = orgId
                   AND status IN ('sent', 'pending', 'overdue')

  // 4. Fetch committed obligations
  obligations = SELECT * FROM cash_obligations
                WHERE organization_id = orgId
                  AND is_active = TRUE
                  AND due_at >= currentWeekStart

  // 5. Compute trailing 8-week baseline outflows
  trailingOutflows = SELECT category, SUM(amount) / 8 as weeklyAvg
                     FROM finance_transactions
                     WHERE organization_id = orgId
                       AND direction = 'out'
                       AND occurred_at >= NOW() - INTERVAL '8 weeks'
                     GROUP BY category

  // 6. Build 13 weekly buckets
  weeks = []
  runningBalance = startingCash

  FOR weekNum = 1 TO 13:
    weekStart = currentWeekStart + (weekNum - 1) * 7 days
    weekEnd = weekStart + 6 days

    // --- INFLOWS ---
    inflows = 0
    inflowTags = []
    FOR EACH invoice IN openInvoices:
      clientLag = lags.find(l => l.clientId == invoice.customer_id)
      expectedReceiptDate = invoice.created_at + clientLag.avgDaysToCollect days

      // Apply scenario adjustments
      IF scenarioType == "stress" AND invoice is one of two largest:
        expectedReceiptDate += 14 days
      IF scenarioType == "upside":
        expectedReceiptDate -= clientLag.avgDaysToCollect * 0.30 days

      IF expectedReceiptDate falls within [weekStart, weekEnd]:
        inflows += invoice.total_amount - invoice.amount_paid
        inflowTags.push("collection lag: {clientLag.avgDaysToCollect}d avg for {clientName}")

    // --- OUTFLOWS ---
    outflows = 0
    outflowTags = []

    // Committed obligations due this week
    FOR EACH obligation IN obligations:
      IF obligation falls in this week (considering recurrence):
        amount = obligation.amount
        IF scenarioType == "stress" AND obligation is vendor category:
          amount *= 1.20  // 20% spike
        outflows += amount
        outflowTags.push("committed: {obligation.description}")

    // Baseline recurring from trailing history
    FOR EACH (category, weeklyAvg) IN trailingOutflows:
      IF category not already covered by obligations this week:
        outflows += weeklyAvg
        outflowTags.push("recurring {category} from 8-week trailing average")

    // Upside: one deferred payment
    IF scenarioType == "upside" AND weekNum <= 4:
      // Defer the largest non-payroll obligation to week+4
      // (reduce outflows this week, add to later week)

    endingBalance = runningBalance + inflows - outflows
    weeks.push({
      weekNumber: weekNum,
      startDate: weekStart,
      endDate: weekEnd,
      projectedInflows: inflows,
      projectedOutflows: outflows,
      endingBalance: endingBalance,
      assumptionTags: [...inflowTags, ...outflowTags]
    })
    runningBalance = endingBalance

  RETURN { scenarioType, weeks }
```

### Algorithm: Breakpoint Detection

File: `src/lib/services/breakpoint-detector.ts`

```
FUNCTION detectBreakpoint(forecast, threshold?):
  // 1. Compute default threshold if not provided
  IF threshold IS NULL:
    trailing4WeekAvgOutflows = AVG(
      SUM(finance_transactions WHERE direction='out' AND occurred_at >= NOW() - 4 weeks)
    ) / 4

    nextPayroll = SELECT amount FROM cash_obligations
                  WHERE category = 'payroll'
                    AND due_at >= NOW()
                  ORDER BY due_at ASC LIMIT 1

    threshold = MAX(trailing4WeekAvgOutflows, nextPayroll.amount OR 0)

  // 2. Scan weeks for first breach
  FOR EACH week IN forecast.weeks:
    IF week.endingBalance < threshold:
      RETURN {
        detected: true,
        weekNumber: week.weekNumber,
        shortfallAmount: threshold - week.endingBalance,
        thresholdUsed: threshold,
        minimumProjectedBalance: MIN(forecast.weeks.map(w => w.endingBalance)),
        label: "Week {week.weekNumber}"
      }

  // 3. No breakpoint found
  RETURN {
    detected: false,
    weekNumber: null,
    shortfallAmount: null,
    thresholdUsed: threshold,
    minimumProjectedBalance: MIN(forecast.weeks.map(w => w.endingBalance)),
    label: "No risk"
  }
```

### Algorithm: Counterfactual Driver Analysis

File: `src/lib/services/risk-driver-analyzer.ts`

```
FUNCTION analyzeDrivers(orgId, baseForecast, breakpoint):
  // 1. Identify candidate factors
  candidates = []

  // a. Each open receivable that's expected after breakpoint week
  FOR EACH invoice IN openInvoices WHERE expectedReceiptWeek > breakpoint.weekNumber:
    candidates.push({
      type: "receivable_slippage",
      entityRef: invoice.id,
      description: "Invoice {invoice.invoice_number} from {clientName} — expected week {receiptWeek}",
      amount: invoice.total_amount - invoice.amount_paid
    })

  // b. Each obligation in or before breakpoint week
  FOR EACH obligation IN cash_obligations WHERE dueWeek <= breakpoint.weekNumber:
    candidates.push({
      type: mapObligationCategory(obligation.category),
      entityRef: obligation.id,
      description: "{obligation.description} due week {dueWeek}",
      amount: obligation.amount
    })

  // c. Trailing expense spikes (categories where recent 4-week avg > 8-week avg by >15%)
  FOR EACH category WHERE recent4WeekAvg > trailing8WeekAvg * 1.15:
    candidates.push({
      type: "expense_spike",
      entityRef: category,
      description: "{category} spending up {pctIncrease}% vs 8-week average",
      amount: (recent4WeekAvg - trailing8WeekAvg) * weeksToBreakpoint
    })

  // 2. Counterfactual removal: for each candidate, re-run forecast without it
  FOR EACH candidate IN candidates:
    modifiedForecast = regenerateForecastWithout(orgId, candidate)
    modifiedBreakpoint = detectBreakpoint(modifiedForecast)

    IF modifiedBreakpoint.detected == false:
      candidate.cashImpact = breakpoint.shortfallAmount  // removing this factor eliminates breakpoint
    ELSE IF modifiedBreakpoint.weekNumber > breakpoint.weekNumber:
      candidate.cashImpact = (modifiedBreakpoint.weekNumber - breakpoint.weekNumber) * avgWeeklyBurn
    ELSE:
      candidate.cashImpact = 0  // this factor doesn't contribute

  // 3. Rank by cash impact descending
  candidates.sort((a, b) => b.cashImpact - a.cashImpact)

  // 4. Map to RiskDriver schema
  RETURN candidates.map(c => ({
    category: c.type,
    description: c.description,
    cashImpact: c.cashImpact,
    entityRef: c.entityRef
  }))
```


---

### API Contracts

#### `GET /api/cash/summary`

Returns the four top-row CFO metric boxes.

Request: No body. Query param: `organizationId` (defaults to DEMO_ORG_ID).

Response (`CashSummaryResponseSchema`):
```json
{
  "currentCashPosition": {
    "label": "Current Cash Position",
    "value": "$42,350",
    "numericValue": 42350,
    "detail": "Cleared ledger only"
  },
  "cashCollected": {
    "label": "Cash Collected (90d)",
    "value": "$128,900",
    "numericValue": 128900,
    "detail": "Last 90 days"
  },
  "breakpointWeek": {
    "label": "Breakpoint Week",
    "value": "Week 4",
    "numericValue": 4,
    "detail": "Shortfall: $8,200 below threshold"
  },
  "largestRiskDriver": {
    "label": "Largest Risk Driver",
    "value": "Receivable slippage",
    "numericValue": 12500,
    "detail": "INV-2043 from Carlos Rivera — $12,500 expected week 6"
  },
  "deviation": null,
  "organizationId": "00000000-0000-0000-0000-000000000001",
  "generatedAt": "2026-04-11T18:00:00.000Z"
}
```

#### `POST /api/cash/analyze`

Triggers the full AI analysis pipeline for a selected client. This is the single endpoint called by "Run AI Analysis."

Request:
```json
{
  "organizationId": "00000000-0000-0000-0000-000000000001",
  "clientId": "uuid-of-client"
}
```

Response (`AnalysisResponseSchema`):
```json
{
  "organizationId": "...",
  "clientId": "...",
  "clientName": "Carlos Rivera",
  "clientSummary": {
    "totalOutstanding": 12500,
    "avgDaysToPay": 38,
    "paymentReliabilityPercent": 62,
    "riskClassification": "cash_flow"
  },
  "collectionLag": {
    "clientId": "...",
    "clientName": "Carlos Rivera",
    "avgDaysToCollect": 38,
    "tier": "very_late",
    "paidInvoiceCount": 5,
    "onTimePercent": 40
  },
  "aiSummary": "Carlos Rivera owes $12,500 across 2 invoices. His average payment time is 38 days (very late tier). Based on collection patterns, we expect payment by May 19. Risk: cash_flow — Carlos appears to be experiencing cash flow difficulties. Recommended action: accelerate collection with a structured payment plan offer.",
  "externalFindings": {
    "newsSummary": "No notable financial distress signals found for Carlos Rivera.",
    "rawSnippets": [],
    "distressFlag": false,
    "dataSource": "mock"
  },
  "interventions": [
    {
      "id": "...",
      "category": "accelerate_collection",
      "description": "Send structured payment plan offer to Carlos Rivera for $12,500",
      "cashImpactEstimate": 12500,
      "speedDays": 7,
      "riskLevel": "low",
      "confidenceScore": 0.85,
      "sourceAttribution": null,
      "executable": true
    }
  ],
  "recommendedAction": {
    "id": "...",
    "category": "accelerate_collection",
    "description": "Send structured payment plan offer to Carlos Rivera for $12,500",
    "cashImpactEstimate": 12500,
    "speedDays": 7,
    "riskLevel": "low",
    "confidenceScore": 0.85,
    "sourceAttribution": null,
    "executable": true
  },
  "breakpoint": {
    "detected": true,
    "weekNumber": 4,
    "shortfallAmount": 8200,
    "thresholdUsed": 15000,
    "minimumProjectedBalance": 6800,
    "label": "Week 4"
  },
  "riskDrivers": [
    {
      "category": "receivable_slippage",
      "description": "INV-2043 from Carlos Rivera — expected week 6 based on 38-day collection lag",
      "cashImpact": 12500,
      "entityRef": "invoice-uuid"
    }
  ],
  "auditRecordId": "...",
  "mode": "mock",
  "degradedFromLive": false,
  "warning": null,
  "generatedAt": "2026-04-11T18:00:00.000Z"
}
```

#### `GET /api/cash/forecast`

Returns the 13-week waterfall with three scenarios.

Request: Query param: `organizationId`.

Response (`ForecastResponseSchema`):
```json
{
  "base": {
    "scenarioType": "base",
    "weeks": [
      {
        "weekNumber": 1,
        "startDate": "2026-04-13",
        "endDate": "2026-04-19",
        "projectedInflows": 8500,
        "projectedOutflows": 12000,
        "endingBalance": 38850,
        "assumptionTags": ["collection lag: 22d avg for Sophia Chen", "committed: biweekly payroll"]
      }
    ]
  },
  "stress": { "scenarioType": "stress", "weeks": [...] },
  "upside": { "scenarioType": "upside", "weeks": [...] },
  "generatedAt": "2026-04-11T18:00:00.000Z",
  "organizationId": "..."
}
```

#### `POST /api/cash/actions/:id/execute`

Executes a safe action from the intervention list.

Request: URL param `:id` = intervention ID. No body needed.

Response (`ActionExecuteResponseSchema`):
```json
{
  "status": "executed",
  "auditRecordId": "...",
  "executionType": "draft_reminder_email",
  "artifacts": {
    "draftEmailContent": "Dear Carlos, We noticed invoice INV-2043 is now 11 days past due...",
    "taskDescription": null
  },
  "guidanceText": null
}
```

---

### UI Component Structure

File: `src/app/rescue/RescueClient.tsx` (reshaped)

```
RescueClient (page root)
├── CashMetricBoxes (top row — 4 boxes, loaded from GET /api/cash/summary)
│   ├── MetricBox: Current Cash Position
│   ├── MetricBox: Cash Collected (90d)
│   ├── MetricBox: Breakpoint Week
│   └── MetricBox: Largest Risk Driver
├── RescueLayout (main content — two columns)
│   ├── CaseList (left column — risk-sorted, from getRescueQueue)
│   │   └── CaseListItem (client name, outstanding amount, days overdue, risk badge)
│   └── MainArea (right column — selected case context)
│       ├── ClientHeader (name, total outstanding, days overdue badge)
│       ├── RecentAuditTrail (last 2-3 agent actions, compact)
│       └── RunAnalysisButton ("Run AI Analysis" — single primary CTA)
└── AnalysisOverlay (modal — appears on top when analysis runs)
    ├── OverlayHeader (client name + close button)
    ├── OverlayBody (two-column layout)
    │   ├── OverlayLeftRail (scrollable)
    │   │   ├── PaymentBehaviorSection (deterministic — from collection lag)
    │   │   │   ├── AvgDaysToPay
    │   │   │   ├── PaymentTrend (improving/flat/worsening)
    │   │   │   └── RecentPayments (last 3: on-time/late/very-late)
    │   │   └── ExternalResearchSection (TinyFish — labeled with mode badge)
    │   │       ├── NewsSummary
    │   │       ├── DistressFlag (if detected)
    │   │       └── RawSnippets (collapsible)
    │   └── OverlayCenterPanel
    │       ├── ClientSummaryBoxes (4 boxes in 2x2 grid)
    │       │   ├── TotalOutstanding
    │       │   ├── AvgDaysToPay
    │       │   ├── PaymentReliabilityScore
    │       │   └── RiskClassification
    │       ├── AiSummaryText (natural language — absorbs invoice detail)
    │       └── InterventionList (read-only context — shows ranked actions)
    └── OverlayFooter (action buttons)
        ├── ExecuteRecommendedAction (primary CTA — executes top intervention)
        └── MarkReviewed (secondary CTA — acknowledges without action)
```

> The MainArea panel is what the user sees BEFORE clicking "Run AI Analysis". It shows the selected client's basic info, total outstanding, days overdue, and a brief audit trail. The overlay appears ON TOP of this when analysis runs.

> The overlay left rail separates deterministic internal data (payment behavior from collection lag) from external research data (TinyFish signals). Payment behavior summary uses `analyzeTrajectory()` from the existing collections decision agent — NOT TinyFish. External signals are clearly labeled as "External Research" with a mode badge (mock/live).

> The overlay footer has exactly TWO buttons: "Execute Recommended Action" (executes the top-ranked intervention) and "Mark Reviewed" (acknowledges without action). The full intervention list is visible as read-only context, not as individual action buttons.

### New Service Files

| File | Purpose |
|---|---|
| `src/lib/services/cash-model.ts` | `computePosition(orgId)` — cleared ledger arithmetic |
| `src/lib/services/collection-lag.ts` | `computeForClient(orgId, clientId)`, `computeAll(orgId)` — lag stats from paid invoices |
| `src/lib/services/forecast-engine.ts` | `generate(orgId, scenarioType)` — 13-week waterfall builder |
| `src/lib/services/breakpoint-detector.ts` | `detect(forecast, threshold?)` — first-week-below-threshold scanner |
| `src/lib/services/risk-driver-analyzer.ts` | `analyze(orgId, forecast, breakpoint)` — counterfactual removal ranking |
| `src/lib/services/action-ranker.ts` | `rank(breakpoint, drivers, clientId)` — intervention generation + Claude summary |
| `src/lib/schemas/cash.ts` | All Zod schemas for cash domain types |

### New API Routes

| Route | File | Handler |
|---|---|---|
| `GET /api/cash/summary` | `src/app/api/cash/summary/route.ts` | Calls Cash_Model + Breakpoint_Detector + Risk_Driver_Analyzer |
| `POST /api/cash/analyze` | `src/app/api/cash/analyze/route.ts` | Full pipeline orchestrator |
| `GET /api/cash/forecast` | `src/app/api/cash/forecast/route.ts` | Calls Forecast_Engine for all 3 scenarios |
| `POST /api/cash/actions/[id]/execute` | `src/app/api/cash/actions/[id]/execute/route.ts` | Action execution + audit |

---

## Error Handling and Graceful Degradation

| Failure Scenario | Behavior |
|---|---|
| TinyFish is misconfigured | Overlay left rail shows "External research unavailable" with mock badge. Rest of analysis works normally. |
| Claude fails | AI summary falls back to a template-based summary using deterministic data only. |
| No paid invoices exist for a client | Collection lag uses org-wide average (30 days default). |
| No `cash_obligations` exist | Forecast uses only trailing ledger history for outflows. |
| `finance_transactions` is empty | Summary shows "No financial data available" with zero values. |
| Audit logging failure | Never blocks the API response (existing pattern from `recordAiAction`). |

> These degradation rules follow the existing TinyFish contract patterns: every path supports mock, misconfigured, and live modes. The `degradedFromLive` and `warning` fields on the analysis response communicate degradation state to the UI.

---

## Correctness Properties

### Property 1: Cash Position Determinism (Req 1, AC 1-3)

For any set of `finance_transactions` with direction='in' and direction='out', the Cash_Model SHALL produce `currentCash = sum(in) - sum(out)`. Given the same input set, the output is always identical. Open receivables (unpaid invoices) are never included in `currentCash`.

**Test approach:** Property-based test. Generate random sets of finance transactions with varying amounts and directions. Verify `currentCash == sum(amounts where direction='in') - sum(amounts where direction='out')`. Separately verify that adding unpaid invoices does not change `currentCash`.

### Property 2: Forecast Waterfall Consistency (Req 2, AC 1)

For any 13-week forecast, each week's ending balance SHALL equal the previous week's ending balance plus that week's projected inflows minus that week's projected outflows. Week 1's starting balance equals the current cash position.

**Test approach:** Property-based test. Generate forecasts from random transaction/obligation sets. For each week `w` in `[1..13]`: `weeks[w].endingBalance == (w == 1 ? startingCash : weeks[w-1].endingBalance) + weeks[w].projectedInflows - weeks[w].projectedOutflows`.

### Property 3: Collection Lag Shifts Receivables Later Than Due Date (Req 2, AC 2; Req 10, AC 3)

For any client with a positive collection lag (avgDaysToCollect > days between created_at and due_at), the expected receipt week SHALL be later than or equal to the due-date week.

**Test approach:** Property-based test. Generate clients with random paid invoice histories producing various lag values. For each unpaid invoice, verify `expectedReceiptWeek >= dueDateWeek` when the client's average collection lag exceeds the invoice's payment terms.

### Property 4: Scenario Ordering (Req 2, AC 4)

For any forecast run, the stress scenario's ending balance for each week SHALL be less than or equal to the base scenario's ending balance, and the upside scenario's ending balance SHALL be greater than or equal to the base scenario's ending balance.

**Test approach:** Property-based test. Generate forecasts with all three scenarios. For each week `w`: `stress.weeks[w].endingBalance <= base.weeks[w].endingBalance <= upside.weeks[w].endingBalance`.

### Property 5: Breakpoint Is First Week Below Threshold (Req 3, AC 1)

If a breakpoint is detected at week N, then all weeks 1 through N-1 have ending balance >= threshold, and week N has ending balance < threshold.

**Test approach:** Property-based test. Generate random 13-week forecasts with varying balances and thresholds. When breakpoint is detected at week N, verify: `∀ w in [1..N-1]: weeks[w].endingBalance >= threshold` AND `weeks[N].endingBalance < threshold`.

### Property 6: Default Threshold Computation (Req 3, AC 5)

The default threshold SHALL equal `max(trailing_4_week_avg_outflows, next_known_payroll_obligation)`. It is always >= both inputs.

**Test approach:** Property-based test. Generate random trailing outflow histories and payroll obligations. Verify `threshold >= trailing4WeekAvg` AND `threshold >= nextPayroll`.

### Property 7: Drivers Ranked by Cash Impact Descending (Req 4, AC 3)

The risk drivers array SHALL be sorted such that for all consecutive pairs, `drivers[i].cashImpact >= drivers[i+1].cashImpact`.

**Test approach:** Property-based test. Generate random driver sets. Verify monotonic descending order of `cashImpact`.

### Property 8: Collection Lag Tier Bucketing (Req 10, AC 2)

For any client, the tier assignment SHALL be: `on_time` if average days late <= 5, `slightly_late` if 6-30, `very_late` if > 30.

**Test approach:** Property-based test. Generate random paid invoice histories. Compute average days late. Verify tier matches the bucketing rules exactly.

### Property 9: Collection Lag Fallback (Req 10, AC 4)

When a client has fewer than 2 paid invoices, the Collection_Lag_Computer SHALL use the organization-wide average instead of the client-specific average.

**Test approach:** Property-based test. Generate organizations with mixed client histories (some with 0-1 paid invoices, some with 2+). Verify clients with < 2 paid invoices get the org-wide average.

### Property 10: Deviation Urgency (Req 7, AC 5)

If a deviation causes the breakpoint to move to week 2 or earlier, the urgency SHALL be "critical". Otherwise, urgency SHALL be "normal".

**Test approach:** Property-based test. Generate random deviation records with various old/new breakpoint weeks. Verify `urgency == "critical"` iff `newBreakpointWeek <= 2`.

### Property 11: Cash Summary Four Metrics Schema (Req 1, AC 5; Req 9, AC 1)

The Cash_Summary_API response SHALL always contain exactly four metric box objects (currentCashPosition, cashCollected, breakpointWeek, largestRiskDriver), each with label, value, numericValue, and detail fields.

**Test approach:** Property-based test. Generate random organization states. Parse response through `CashSummaryResponseSchema`. Verify all four keys are present and each conforms to `MetricBoxSchema`.

### Property 12: Mock/Live Structural Equivalence (Req 11, AC 6)

Responses from mock mode and live mode SHALL both pass the same Zod schema validation, differing only in the `mode` field value and external research content.

**Test approach:** Property-based test. Generate analysis requests. Run in mock mode. Verify the response parses through `AnalysisResponseSchema`. The same schema applies regardless of mode.

### Property 13: Audit Append-Only (Req 8, AC 3)

After any agent operation, the count of `ai_actions` rows for the organization SHALL be greater than or equal to the count before the operation. No existing rows are modified or deleted.

**Test approach:** Example-based test. Record row count before operation, run operation, verify count increased by at least 1. Verify no existing row timestamps or payloads changed.

### Property 14: Intervention Categories Valid (Req 5, AC 3)

Every intervention returned by the Action_Ranker SHALL have a category that is one of: `accelerate_collection`, `secure_financing`, `defer_payment`, `reduce_expense`.

**Test approach:** Property-based test. Generate random breakpoint/driver combinations. Verify every intervention's category is in the valid enum set.
