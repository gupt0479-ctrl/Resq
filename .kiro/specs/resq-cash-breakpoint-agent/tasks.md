# Implementation Plan: Resq Cash Breakpoint Agent

## Overview

Reshape the Rescue Queue (`/rescue`) into a CFO cash control tower with deterministic 13-week cash forecasting, breakpoint detection, risk driver analysis, and AI-assisted action ranking. Implementation builds from the data layer up through deterministic services, AI-assisted services, API routes, and finally UI — ensuring each layer is testable before the next depends on it. Reuses existing `getRescueQueue()`, `fetchExternalSignals()`, `analyzeTrajectory()`, `recordAiAction()`, and TinyFish mock/live contract.

## Tasks

- [x] 1. Database migration and Zod schemas
  - [x] 1.1 Create Supabase migration for `cash_obligations` and `cash_forecast_snapshots` tables
    - Create migration file `supabase/migrations/007_cash_breakpoint.sql`
    - Add `cash_obligations` table with columns: id, organization_id, category, description, amount, due_at, recurrence, is_active, notes, created_at, updated_at
    - Add CHECK constraints for category (payroll, rent, tax, vendor_bill, insurance, loan_payment, other) and recurrence (one_time, weekly, biweekly, monthly, quarterly, annual)
    - Add `cash_forecast_snapshots` table with columns: id, organization_id, forecast_json (JSONB), breakpoint_week, breakpoint_amount, threshold_used, scenario_type, created_at
    - Add CHECK constraint for scenario_type (base, stress, upside)
    - Add indexes: `idx_cash_obligations_org(organization_id, due_at)`, `idx_cash_obligations_active(organization_id, is_active) WHERE is_active = TRUE`, `idx_cash_forecast_snapshots_org(organization_id, created_at DESC)`
    - _Requirements: 2.3, 7.1, 11.1_

  - [x] 1.2 Create Zod schemas in `src/lib/schemas/cash.ts`
    - Define all schemas from the design: CashPositionSchema, CollectionLagTierSchema, ClientCollectionLagSchema, WeeklyBucketSchema, ForecastScenarioSchema, ForecastResponseSchema, BreakpointResultSchema, RiskDriverCategorySchema, RiskDriverSchema, InterventionCategorySchema, InterventionSchema, MetricBoxSchema, CashSummaryResponseSchema, CashObligationCategorySchema, CashObligationRecurrenceSchema, CashObligationSchema, ClientSummaryBoxesSchema, AnalysisResponseSchema, ActionExecuteRequestSchema, ActionExecuteResponseSchema, DeviationRecordSchema
    - Ensure all schemas match the design document exactly
    - _Requirements: 1.5, 2.6, 3.2, 4.3, 5.6, 6.5, 9.6_

- [x] 2. Deterministic cash domain services
  - [x] 2.1 Implement Cash_Model in `src/lib/services/cash-model.ts`
    - Export `computePosition(orgId: string)` that queries `finance_transactions` and computes `currentCash = sum(direction='in') - sum(direction='out')`
    - Compute separate `openReceivables` total from unpaid invoices (status in 'sent', 'pending', 'overdue')
    - Compute `cashCollected90d` from inflows in the last 90 days
    - Return object matching `CashPositionSchema`
    - Handle empty ledger case: return zero values
    - Use existing `db` from `@/lib/db` and Drizzle ORM patterns from `finance.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6_

  - [x] 2.2 Write property test for Cash Position Determinism
    - **Property 1: Cash Position Determinism**
    - Generate random sets of finance transactions with varying amounts and directions
    - Verify `currentCash == sum(amounts where direction='in') - sum(amounts where direction='out')`
    - Verify adding unpaid invoices does not change `currentCash`
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [x] 2.3 Implement Collection_Lag_Computer in `src/lib/services/collection-lag.ts`
    - Export `computeForClient(orgId, clientId)` and `computeAll(orgId)`
    - Query paid invoices, compute `daysToCollect = paid_at - created_at` for each
    - Group by client, compute average, assign tier: on_time (<=5 days late), slightly_late (6-30), very_late (>30)
    - Compute `onTimePercent` per client
    - Fall back to org-wide average when client has < 2 paid invoices
    - Return array of `ClientCollectionLagSchema` objects
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 2.4 Write property test for Collection Lag Tier Bucketing
    - **Property 8: Collection Lag Tier Bucketing**
    - Generate random paid invoice histories with varying days-to-collect
    - Verify tier assignment matches: on_time if avg days late <= 5, slightly_late if 6-30, very_late if > 30
    - **Validates: Requirements 10.2**

  - [x] 2.5 Write property test for Collection Lag Fallback
    - **Property 9: Collection Lag Fallback**
    - Generate organizations with mixed client histories (some with 0-1 paid invoices, some with 2+)
    - Verify clients with < 2 paid invoices get the org-wide average
    - **Validates: Requirements 10.4**

  - [x] 2.6 Implement Forecast_Engine in `src/lib/services/forecast-engine.ts`
    - Export `generate(orgId, scenarioType)` that produces a 13-week rolling forecast
    - Start from current cash position via `computePosition()`
    - Derive projected inflows by applying collection lag to open receivables, shifting each into its expected receipt week
    - Derive projected outflows from `cash_obligations` plus trailing 8-week baseline from `finance_transactions`
    - Implement three scenario variants: base (normal lag + known obligations), stress (2 largest receivables slip +14 days, one vendor cost +20%), upside (lag reduced 30%, one deferred payment)
    - Attach assumption tags to every projection
    - Handle missing data: use zero with "no historical data available" tag
    - Return object matching `ForecastScenarioSchema`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7_

  - [x] 2.7 Write property test for Forecast Waterfall Consistency
    - **Property 2: Forecast Waterfall Consistency**
    - Generate forecasts from random transaction/obligation sets
    - For each week w: verify `weeks[w].endingBalance == (w == 1 ? startingCash : weeks[w-1].endingBalance) + weeks[w].projectedInflows - weeks[w].projectedOutflows`
    - **Validates: Requirements 2.1**

  - [x] 2.8 Write property test for Collection Lag Shifts Receivables
    - **Property 3: Collection Lag Shifts Receivables Later Than Due Date**
    - Generate clients with random paid invoice histories producing various lag values
    - Verify `expectedReceiptWeek >= dueDateWeek` when client's avg collection lag exceeds payment terms
    - **Validates: Requirements 2.2, 10.3**

  - [x] 2.9 Write property test for Scenario Ordering
    - **Property 4: Scenario Ordering**
    - Generate forecasts with all three scenarios
    - For each week w: verify `stress.weeks[w].endingBalance <= base.weeks[w].endingBalance <= upside.weeks[w].endingBalance`
    - **Validates: Requirements 2.4**

- [x] 3. Breakpoint detection and risk analysis services
  - [x] 3.1 Implement Breakpoint_Detector in `src/lib/services/breakpoint-detector.ts`
    - Export `detect(forecast, threshold?)` that scans 13-week forecast for first week below threshold
    - Compute default threshold as `max(trailing_4_week_avg_outflows, next_known_payroll_obligation)`
    - Return `BreakpointResultSchema` object: detected, weekNumber, shortfallAmount, thresholdUsed, minimumProjectedBalance, label
    - Handle no-breakpoint case: return `{ detected: false, label: "No risk" }`
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 3.2 Write property test for Breakpoint Is First Week Below Threshold
    - **Property 5: Breakpoint Is First Week Below Threshold**
    - Generate random 13-week forecasts with varying balances and thresholds
    - When breakpoint detected at week N: verify all weeks 1..N-1 have endingBalance >= threshold AND week N has endingBalance < threshold
    - **Validates: Requirements 3.1**

  - [x] 3.3 Write property test for Default Threshold Computation
    - **Property 6: Default Threshold Computation**
    - Generate random trailing outflow histories and payroll obligations
    - Verify `threshold >= trailing4WeekAvg` AND `threshold >= nextPayroll`
    - **Validates: Requirements 3.5**

  - [x] 3.4 Implement Risk_Driver_Analyzer in `src/lib/services/risk-driver-analyzer.ts`
    - Export `analyze(orgId, forecast, breakpoint)` that performs counterfactual removal analysis
    - Identify candidate factors: receivable slippage, expense spikes, obligations
    - For each candidate, re-run forecast without it and measure impact on breakpoint
    - Categorize each driver: receivable_slippage, expense_spike, revenue_shortfall, tax_obligation, recurring_obligation_increase
    - Rank by cash impact descending
    - When no breakpoint: still return top factors reducing cash buffer
    - Return array of `RiskDriverSchema` objects
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [x] 3.5 Write property test for Drivers Ranked by Cash Impact Descending
    - **Property 7: Drivers Ranked by Cash Impact Descending**
    - Generate random driver sets from the analyzer
    - Verify monotonic descending order: `drivers[i].cashImpact >= drivers[i+1].cashImpact`
    - **Validates: Requirements 4.3**

- [x] 4. Checkpoint — Deterministic services
  - Ensure all deterministic service tests pass, ask the user if questions arise.

- [x] 5. AI-assisted service and action execution
  - [x] 5.1 Implement Action_Ranker in `src/lib/services/action-ranker.ts`
    - Export `rank(breakpoint, drivers, clientId, orgId)` that generates and ranks interventions
    - Wrap existing `runCollectionsDecision()` from `collections-decision-agent.ts` for client classification and outreach drafts
    - Wrap existing `fetchExternalSignals()` for TinyFish client research
    - Rank interventions by: cash impact, speed to resolution, execution risk, confidence score
    - Categorize each as: accelerate_collection, secure_financing, defer_payment, reduce_expense
    - Use TinyFish mock data when `TINYFISH_USE_MOCKS=true` (reuse existing mock/live contract)
    - Generate Claude natural-language summary from deterministic facts + AI findings; fall back to template summary on Claude failure
    - Write audit record via `recordAiAction()` for every analysis run
    - Return array of `InterventionSchema` objects plus `recommendedAction` (top-ranked)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 5.2 Write property test for Intervention Categories Valid
    - **Property 14: Intervention Categories Valid**
    - Generate random breakpoint/driver combinations
    - Verify every intervention's category is in: accelerate_collection, secure_financing, defer_payment, reduce_expense
    - **Validates: Requirements 5.3**

  - [x] 5.3 Implement action execution logic for `POST /api/cash/actions/[id]/execute`
    - Support safe execution types: draft payment reminder email, log follow-up task in audit timeline, mark action as "CFO-acknowledged"
    - Return error with guidance text for non-executable interventions
    - Write audit record for every execution via `recordAiAction()`
    - Return `ActionExecuteResponseSchema` with status, auditRecordId, executionType, artifacts, guidanceText
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6. API routes
  - [x] 6.1 Implement `GET /api/cash/summary` route at `src/app/api/cash/summary/route.ts`
    - Accept `organizationId` query param (default to DEMO_ORG_ID)
    - Call Cash_Model, Forecast_Engine, Breakpoint_Detector, Risk_Driver_Analyzer
    - Return `CashSummaryResponseSchema` with four metric box objects
    - Include most recent deviation record if one exists within last 24 hours
    - Handle empty data: return zero cash position with "No financial data available"
    - _Requirements: 1.5, 1.6, 3.4, 4.4, 7.4, 9.1_

  - [x] 6.2 Write property test for Cash Summary Four Metrics Schema
    - **Property 11: Cash Summary Four Metrics Schema**
    - Generate random organization states
    - Parse response through `CashSummaryResponseSchema`
    - Verify all four keys present and each conforms to `MetricBoxSchema`
    - **Validates: Requirements 1.5, 9.1**

  - [x] 6.3 Implement `POST /api/cash/analyze` route at `src/app/api/cash/analyze/route.ts`
    - Accept `{ organizationId, clientId }` in request body
    - Orchestrate deterministic path (Cash_Model, Collection_Lag, Forecast, Breakpoint, Risk_Driver) in parallel with AI path (fetchExternalSignals, runCollectionsDecision)
    - Generate Claude summary after both paths complete; fall back to template on failure
    - Produce ranked interventions via Action_Ranker
    - Record audit entry via `recordAiAction()`
    - Include client's collection lag tier and avg days-to-collect in response
    - Return `AnalysisResponseSchema` with clientSummary, collectionLag, aiSummary, externalFindings, interventions, recommendedAction, breakpoint, riskDrivers
    - Handle TinyFish failure gracefully: set `degradedFromLive: true`, populate warning
    - _Requirements: 5.1, 5.6, 5.7, 9.4, 10.6_

  - [x] 6.4 Write property test for Mock/Live Structural Equivalence
    - **Property 12: Mock/Live Structural Equivalence**
    - Generate analysis requests, run in mock mode
    - Verify response parses through `AnalysisResponseSchema`
    - Same schema applies regardless of mode
    - **Validates: Requirements 11.6**

  - [x] 6.5 Implement `GET /api/cash/forecast` route at `src/app/api/cash/forecast/route.ts`
    - Accept `organizationId` query param
    - Call Forecast_Engine for all 3 scenarios (base, stress, upside)
    - Save snapshot to `cash_forecast_snapshots` table
    - Return `ForecastResponseSchema` with three scenario arrays
    - _Requirements: 2.6_

  - [x] 6.6 Implement `POST /api/cash/actions/[id]/execute` route at `src/app/api/cash/actions/[id]/execute/route.ts`
    - Accept intervention ID from URL param
    - Validate intervention is executable
    - Delegate to action execution logic from task 5.3
    - Return `ActionExecuteResponseSchema`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7. Checkpoint — API routes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Deviation detection
  - [x] 8.1 Implement deviation detection in Breakpoint_Detector
    - Compare current breakpoint against most recent `cash_forecast_snapshots` entry
    - Generate deviation record when breakpoint shifts by 1+ weeks
    - Set urgency to "critical" when new breakpoint is week 2 or earlier
    - Write deviation as audit entry via `recordAiAction()`
    - Return `DeviationRecordSchema` object
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [x] 8.2 Write property test for Deviation Urgency
    - **Property 10: Deviation Urgency**
    - Generate random deviation records with various old/new breakpoint weeks
    - Verify `urgency == "critical"` iff `newBreakpointWeek <= 2`
    - **Validates: Requirements 7.5**

- [x] 9. Rescue Queue UI reshape
  - [x] 9.1 Implement CashMetricBoxes component and wire to `GET /api/cash/summary`
    - Create top-row layout with 4 metric boxes: Current Cash Position, Cash Collected (90d), Breakpoint Week, Largest Risk Driver
    - Fetch data from `GET /api/cash/summary` on page load
    - Display loading skeleton while fetching
    - Handle error/empty states
    - _Requirements: 9.1_

  - [x] 9.2 Reshape RescueClient layout with CaseList and MainArea columns
    - Left column: CaseList using existing `getRescueQueue()` — risk-sorted, showing customer name, outstanding amount, days overdue, risk badge
    - Right column: MainArea with ClientHeader (name, total outstanding, days overdue badge), RecentAuditTrail (last 2-3 agent actions), RunAnalysisButton ("Run AI Analysis" single primary CTA)
    - Remove old filter tabs (All, Collections, High urgency)
    - Remove old per-invoice action buttons (Run Agent, Survival Scan, Send Reminder, Execute Decision)
    - _Requirements: 9.2, 9.3, 9.9_

  - [x] 9.3 Implement AnalysisOverlay modal
    - OverlayHeader: client name + close button
    - OverlayLeftRail: PaymentBehaviorSection (deterministic — avg days to pay, payment trend via `analyzeTrajectory()`, recent payments) + ExternalResearchSection (TinyFish findings with mode badge, news summary, distress flag, collapsible raw snippets)
    - OverlayCenterPanel: ClientSummaryBoxes (4 boxes in 2x2 grid — total outstanding, avg days to pay, payment reliability score, risk classification) + AiSummaryText (natural language absorbing invoice detail) + InterventionList (read-only ranked actions)
    - OverlayFooter: exactly 2 buttons — "Execute Recommended Action" (primary, calls `POST /api/cash/actions/[id]/execute`) + "Mark Reviewed" (secondary, acknowledges without action)
    - Wire "Run AI Analysis" button to `POST /api/cash/analyze`, show loading state, render overlay with response
    - _Requirements: 9.4, 9.5, 9.6, 9.7, 9.8_

- [x] 10. Checkpoint — UI integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Demo data seed script
  - [x] 11.1 Create SQL seed script for realistic cash breakpoint demo
    - Create `supabase/seed_cash_breakpoint.sql`
    - Seed cleared ledger transactions (direction='in' and direction='out') to establish a realistic cash position
    - Seed open receivables at various aging stages (sent, pending, overdue)
    - Seed `cash_obligations` entries: payroll (biweekly), rent (monthly), tax (quarterly), vendor bills
    - Seed at least one invoice configuration that creates a week-4 breakpoint
    - Seed clients with varied collection lag profiles: one on-time payer, one slightly-late (15-20 days avg), one very-late (40+ days avg), each with sufficient paid invoice history
    - Seed mock financing offers (3+) with realistic terms (APR, term, max amount, decision speed)
    - Seed mock vendor alternatives (2+) with price comparisons
    - Ensure end-to-end flow works with seeded data and mock mode only
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 12. Final checkpoint
  - Ensure all tests pass and the full end-to-end flow works with seeded demo data in mock mode, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at each layer boundary
- Property tests validate the 14 correctness properties from the design document
- All deterministic services (tasks 2-3) have zero AI dependency and can be tested in isolation
- The Action_Ranker (task 5.1) wraps the existing collections-decision-agent — it does not replace it
- TinyFish mock mode is the default; live mode is opt-in via environment variable
- Claude failure in the AI summary path falls back to template-based summary using deterministic data
