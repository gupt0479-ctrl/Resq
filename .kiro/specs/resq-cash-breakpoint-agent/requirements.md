# Requirements Document

## Introduction

Resq Cash Breakpoint Agent replaces the broad "survival agent" framing with a focused cash-risk operator for single-company CFOs. The system ingests a company's financial data (bank cash, open receivables, committed outflows, recurring obligations, historical actuals), builds a deterministic 13-week cash forecast, detects the exact week where cash runs short (the "breakpoint"), identifies the drivers behind it, and produces a ranked queue of interventions the CFO can execute. TinyFish provides external evidence for financing options and vendor alternatives. All historical numbers are 100% deterministic; projections carry explicit assumptions; recommendations cite audited sources. No hallucinated financial truth.

The target user is a single-company CFO who currently manages finances in Excel spreadsheets and needs notification-worthy cash deviations — not generic dashboards.

## Glossary

- **Cash_Model**: The deterministic computation engine that calculates current cash position and projects weekly cash balances from bank cash, open receivables, committed outflows, recurring obligations, and historical actuals.
- **Forecast_Engine**: The module that produces the 13-week rolling cash forecast waterfall from Cash_Model outputs.
- **Breakpoint_Detector**: The module that scans the 13-week forecast to identify the first week where projected cash balance drops below a defined threshold (e.g., payroll coverage).
- **Risk_Driver_Analyzer**: The module that attributes a detected breakpoint to specific causal factors (e.g., a slipping invoice, a tax payment, a revenue shortfall).
- **Action_Ranker**: The agent layer that generates and ranks intervention options by cash impact, speed to resolution, execution risk, and confidence score.
- **Audit_Timeline**: The append-only log of all agent decisions, inputs, outputs, and assumptions, stored in the `ai_actions` table.
- **Cash_Summary_API**: The API endpoint (`GET /api/cash/summary`) that returns current cash position, runway, next breakpoint, and top drivers.
- **Forecast_API**: The API endpoint (`GET /api/cash/forecast`) that returns the 13-week waterfall data.
- **Plan_Run_API**: The API endpoint (`POST /api/cash/plan/run`) that triggers the agent to produce ranked actions.
- **Action_Execute_API**: The API endpoint (`POST /api/cash/actions/:id/execute`) that executes safe actions such as drafting reminders or logging tasks.
- **CFO**: The target user — a single-company finance leader who manages cash flow, typically using spreadsheets.
- **Breakpoint**: The specific future week in the 13-week forecast where projected cash balance first drops below the minimum threshold.
- **Deviation**: A material change in a forecast input (e.g., invoice slippage, new expense) that shifts the breakpoint or cash position.
- **Intervention**: A recommended action to resolve or mitigate a cash shortfall (e.g., accelerate collections, secure financing, defer a payment).
- **TinyFish_Agent**: The external web agent used for research-only tasks such as finding financing options or vendor alternatives. TinyFish never invents balances or forecast math.

## Requirements

### Requirement 1: Deterministic Cash Position Calculation

**User Story:** As a CFO, I want to see my exact current cash position derived from real financial data, so that I trust the numbers before making decisions.

#### Acceptance Criteria

1. THE Cash_Model SHALL compute current cash position as the sum of bank cash plus received payments minus committed outflows, using only data from the `finance_transactions` and `invoices` tables.
2. THE Cash_Model SHALL use 100% deterministic arithmetic for all historical and current-period calculations, with no AI-generated or estimated values for actuals.
3. WHEN a finance transaction is recorded in the ledger, THE Cash_Model SHALL reflect the updated cash position within the same request cycle.
4. THE Cash_Summary_API SHALL return the current cash position, cash runway in weeks, next breakpoint week, and top risk drivers in a single response.
5. IF the `finance_transactions` table contains no data for the organization, THEN THE Cash_Summary_API SHALL return a cash position of zero and indicate that no financial data is available.

### Requirement 2: 13-Week Cash Forecast Waterfall

**User Story:** As a CFO, I want a 13-week rolling cash forecast broken down by week, so that I can see exactly when cash pressure builds.

#### Acceptance Criteria

1. THE Forecast_Engine SHALL produce a 13-week rolling forecast starting from the current week, with each week containing projected inflows, projected outflows, and projected ending cash balance.
2. THE Forecast_Engine SHALL derive projected inflows from open receivables (using due dates and historical collection patterns) and recurring revenue patterns from the `finance_transactions` ledger.
3. THE Forecast_Engine SHALL derive projected outflows from committed obligations (e.g., invoices payable, recurring expenses) and historical expense patterns from the `finance_transactions` ledger.
4. THE Forecast_Engine SHALL label each projection with an explicit assumption tag (e.g., "based on 30-day average collection rate", "recurring monthly expense") so the CFO can audit the reasoning.
5. THE Forecast_API SHALL return the 13-week waterfall as an ordered array of weekly objects, each containing week number, start date, end date, projected inflows, projected outflows, projected ending balance, and assumption tags.
6. WHEN no historical data exists for a projection category, THE Forecast_Engine SHALL use zero for that category and attach an assumption tag of "no historical data available".

### Requirement 3: Breakpoint Detection

**User Story:** As a CFO, I want to know the exact week my company will run short on cash and why, so that I can act before the shortfall hits.

#### Acceptance Criteria

1. THE Breakpoint_Detector SHALL scan the 13-week forecast and identify the first week where the projected ending cash balance drops below the configurable minimum cash threshold.
2. WHEN a breakpoint is detected, THE Breakpoint_Detector SHALL return the breakpoint week number, the projected shortfall amount, and the threshold that was breached.
3. WHEN no breakpoint exists within the 13-week horizon, THE Breakpoint_Detector SHALL return a result indicating no breakpoint detected and the minimum projected cash balance across all 13 weeks.
4. THE Cash_Summary_API SHALL include the breakpoint detection result (week number or null, shortfall amount, and threshold) in its response.
5. WHEN the minimum cash threshold is not explicitly configured by the CFO, THE Breakpoint_Detector SHALL default to one week of average historical outflows as the threshold.

### Requirement 4: Risk Driver Identification

**User Story:** As a CFO, I want to understand which specific factors are causing my cash breakpoint, so that I can prioritize the right corrective actions.

#### Acceptance Criteria

1. WHEN a breakpoint is detected, THE Risk_Driver_Analyzer SHALL identify the top contributing factors by comparing the breakpoint-week forecast against a baseline where each factor is removed individually.
2. THE Risk_Driver_Analyzer SHALL categorize each driver as one of: receivable_slippage, expense_spike, revenue_shortfall, tax_obligation, or recurring_obligation_increase.
3. THE Risk_Driver_Analyzer SHALL rank drivers by their cash impact in descending order (largest impact first).
4. THE Cash_Summary_API SHALL include the ranked list of risk drivers, each with a category, description, cash impact amount, and the entity reference (e.g., invoice ID, expense category) that caused the driver.
5. IF no breakpoint is detected, THEN THE Risk_Driver_Analyzer SHALL still return the top factors that most reduce the cash buffer, ranked by impact.

### Requirement 5: Ranked Action Queue

**User Story:** As a CFO, I want a prioritized list of actions I can take to resolve or delay the cash shortfall, so that I spend my limited time on the highest-impact moves.

#### Acceptance Criteria

1. WHEN the Plan_Run_API is called, THE Action_Ranker SHALL generate a list of candidate interventions based on the detected breakpoint and its risk drivers.
2. THE Action_Ranker SHALL rank each intervention by four factors: cash impact (dollars recovered or saved), speed to resolution (days), execution risk (low, medium, high), and confidence score (0.0 to 1.0).
3. THE Action_Ranker SHALL categorize each intervention as one of: accelerate_collection, secure_financing, defer_payment, reduce_expense, or increase_revenue.
4. WHERE TinyFish is enabled, THE Action_Ranker SHALL use the TinyFish_Agent to research external evidence for financing options and vendor alternatives, and attach source URLs and confidence scores to those interventions.
5. WHERE TinyFish is not enabled, THE Action_Ranker SHALL use mock data for external research results and indicate mock mode in the response.
6. THE Plan_Run_API SHALL return the ranked interventions as an ordered array, each containing: intervention ID, category, description, cash impact estimate, speed estimate, risk level, confidence score, source attribution, and executable flag.
7. THE Action_Ranker SHALL write a complete audit record to the Audit_Timeline for every plan run, including all inputs, assumptions, generated interventions, and ranking rationale.

### Requirement 6: Action Execution

**User Story:** As a CFO, I want to execute the top recommended action with one click, so that I can act immediately on the agent's advice.

#### Acceptance Criteria

1. WHEN the Action_Execute_API is called with a valid intervention ID, THE system SHALL execute the intervention if it is marked as executable.
2. THE system SHALL support the following safe execution types: draft a payment reminder email, log a follow-up task in the Audit_Timeline, and mark an action as "CFO-acknowledged".
3. IF the intervention is not marked as executable, THEN THE Action_Execute_API SHALL return an error indicating the action requires manual execution and provide guidance text.
4. WHEN an action is executed, THE system SHALL write an audit record to the Audit_Timeline containing the intervention ID, execution type, execution timestamp, and outcome.
5. THE Action_Execute_API SHALL return the execution result including status (executed, failed, requires_manual), the audit record ID, and any generated artifacts (e.g., draft email content).

### Requirement 7: Deviation Notifications

**User Story:** As a CFO, I want to be alerted when a material change shifts my cash breakpoint, so that I stay ahead of emerging risks without constantly checking dashboards.

#### Acceptance Criteria

1. WHEN a forecast input changes (e.g., an invoice is marked overdue, a payment is received, a new expense is recorded), THE Breakpoint_Detector SHALL re-evaluate the breakpoint.
2. WHEN the breakpoint shifts by one or more weeks (earlier or later) compared to the previous evaluation, THE system SHALL generate a deviation record containing the old breakpoint week, new breakpoint week, the triggering event, and a human-readable summary.
3. THE deviation summary SHALL follow the notification style: specific, actionable, and referencing concrete entities (e.g., "Invoice INV-2043 slipping 9 more days now creates a week-4 shortfall").
4. THE Cash_Summary_API SHALL include the most recent deviation record in its response when one exists within the last 24 hours.
5. IF a deviation causes the breakpoint to move earlier than week 2, THEN THE system SHALL flag the deviation as critical urgency.

### Requirement 8: Audit Timeline Integrity

**User Story:** As a CFO, I want a complete, tamper-evident log of every agent decision and action, so that I can review what the system did and why.

#### Acceptance Criteria

1. THE Audit_Timeline SHALL record every agent operation (forecast generation, breakpoint detection, risk analysis, action ranking, action execution) as a separate entry in the `ai_actions` table.
2. THE Audit_Timeline SHALL store for each entry: organization ID, entity type, entity ID, trigger type, action type, input summary, full output payload, status, and timestamps.
3. THE Audit_Timeline SHALL be append-only — existing entries are never modified or deleted by the application.
4. WHEN an agent operation fails, THE Audit_Timeline SHALL record the failure with status "failed", the error message in the output payload, and the inputs that caused the failure.
5. THE system SHALL expose the Audit_Timeline through the existing workflow view, ordered by timestamp descending, with the ability to filter by action type.

### Requirement 9: Demo Data and Mock Mode

**User Story:** As a hackathon presenter, I want the system to work convincingly with seeded demo data and mock external services, so that the demo is reliable regardless of live API availability.

#### Acceptance Criteria

1. THE system SHALL include a SQL seed script that populates a realistic 13-week cash scenario with: bank cash, open receivables at various aging stages, committed outflows (payroll, rent, vendor invoices), recurring obligations, and at least one invoice that creates a week-4 breakpoint.
2. WHEN the environment variable `TINYFISH_USE_MOCKS` is set to true, THE Action_Ranker SHALL use mock financing offers and vendor alternatives instead of calling the TinyFish_Agent.
3. THE mock data SHALL include at least three financing offers with realistic terms (APR, term, max amount, decision speed) and at least two vendor alternatives with price comparisons.
4. THE system SHALL function end-to-end (cash summary, forecast, breakpoint detection, action ranking, action execution) using only seeded data and mock mode, with no external dependencies.
5. WHEN switching between mock and live TinyFish modes, THE system SHALL produce structurally identical API responses, differing only in the `mode` field value and the content of external research results.

### Requirement 10: Forecast Serialization Round-Trip

**User Story:** As a developer, I want the forecast data to serialize and deserialize without loss, so that the API contract is reliable and testable.

#### Acceptance Criteria

1. THE Forecast_API response SHALL conform to a Zod schema that validates all weekly forecast objects, including week number, dates, amounts, and assumption tags.
2. FOR ALL valid forecast responses, serializing to JSON and parsing back SHALL produce an object that is deeply equal to the original (round-trip property).
3. THE Cash_Summary_API response SHALL conform to a Zod schema that validates cash position, runway, breakpoint, drivers, and deviation fields.
4. FOR ALL valid cash summary responses, serializing to JSON and parsing back SHALL produce an object that is deeply equal to the original (round-trip property).
