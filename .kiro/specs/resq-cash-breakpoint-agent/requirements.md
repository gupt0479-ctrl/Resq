# Requirements Document

## Introduction

Resq Cash Breakpoint Agent reshapes the existing Rescue Queue (`/rescue`) from an invoice-by-invoice collections tool into a CFO cash control tower. The system ingests a company's financial data (cleared ledger cash, open receivables, committed outflows, recurring obligations, historical actuals), builds a deterministic 13-week cash forecast using collection lag as the key predictive input, detects the exact week where cash runs short (the "breakpoint"), identifies the single largest driver behind it, and produces a ranked queue of interventions the CFO can execute.

The Rescue Queue page remains the primary surface. It gains four CFO-critical metric boxes at the top, a single "Run AI Analysis" button as the primary action, and a hovering overlay dashboard that presents AI findings, client summary boxes, and a natural-language analysis — absorbing the old invoice detail view entirely. TinyFish provides external client research and financing option discovery only; it never touches forecast math. All historical numbers are 100% deterministic; projections carry explicit assumptions; recommendations cite audited sources.

The target user is a single-company CFO who currently manages finances in Excel spreadsheets and needs notification-worthy cash deviations — not generic dashboards.

## Glossary

- **Cash_Model**: The deterministic computation engine that calculates current cash position from cleared ledger transactions only (direction='in' minus direction='out' from `finance_transactions`) and projects weekly cash balances. Receivables are NOT included in current cash — they are projected inflows.
- **Forecast_Engine**: The module that produces the 13-week rolling cash forecast waterfall from Cash_Model outputs, using collection lag to shift open receivables into expected receipt weeks.
- **Collection_Lag_Computer**: The module that computes average days-to-collect from historical paid invoices (paid_at minus created_at), buckets clients into on-time, slightly late, and very late tiers, and applies those lags to unpaid invoices to determine expected receipt weeks.
- **Breakpoint_Detector**: The module that scans the 13-week forecast to identify the first week where projected cash balance drops below a defined threshold.
- **Risk_Driver_Analyzer**: The module that attributes a detected breakpoint to specific causal factors (e.g., a slipping receivable, a tax payment, a recurring obligation increase) using counterfactual removal analysis.
- **Action_Ranker**: The agent layer that generates and ranks intervention options by cash impact, speed to resolution, execution risk, and confidence score.
- **Audit_Timeline**: The append-only log of all agent decisions, inputs, outputs, and assumptions, stored in the `ai_actions` table.
- **Cash_Summary_API**: The API endpoint (`GET /api/cash/summary`) that returns the four top-row CFO metrics: current cash position, cash collected, breakpoint week, and largest risk driver.
- **Cash_Analyze_API**: The API endpoint (`POST /api/cash/analyze`) that triggers the full AI analysis pipeline for a selected client — replacing the per-invoice run endpoint.
- **Forecast_API**: The API endpoint (`GET /api/cash/forecast`) that returns the 13-week waterfall data with base, stress, and upside scenarios.
- **Action_Execute_API**: The API endpoint (`POST /api/cash/actions/:id/execute`) that executes safe actions such as drafting reminders or logging tasks.
- **Rescue_Queue_UI**: The reshaped `/rescue` page serving as the primary CFO cash control tower surface.
- **Analysis_Overlay**: The hovering modal/overlay dashboard that appears when "Run AI Analysis" is clicked, containing AI findings, client summary boxes, and natural-language analysis.
- **CFO**: The target user — a single-company finance leader who manages cash flow, typically using spreadsheets.
- **Breakpoint**: The specific future week in the 13-week forecast where projected cash balance first drops below the minimum threshold.
- **Collection_Lag**: The average number of days between invoice creation and payment receipt, computed from historical paid invoices per client. The single most impactful predictive input for cash forecasting.
- **Deviation**: A material change in a forecast input (e.g., invoice slippage, new expense) that shifts the breakpoint or cash position.
- **Intervention**: A recommended action to resolve or mitigate a cash shortfall (e.g., accelerate collections, secure financing, defer a payment).
- **TinyFish_Agent**: The external web agent used for research-only tasks: client external signals (news, financial distress, public records), financing option discovery, and vendor alternative evidence. TinyFish never invents balances or forecast math.
- **cash_obligations**: New Supabase table storing future committed outflows (payroll, rent, tax, vendor bills) with amount, due date, recurrence, and category.
- **cash_forecast_snapshots**: New Supabase table storing serialized forecast run results for historical comparison and deviation detection.

## Requirements

### Requirement 1: Deterministic Cash Position Calculation

**User Story:** As a CFO, I want to see my exact current cash position derived from cleared ledger transactions only, so that I trust the numbers and understand the difference between cash-in-hand and money owed to me.

#### Acceptance Criteria

1. THE Cash_Model SHALL compute current cash position as the sum of cleared `finance_transactions` where direction='in' minus the sum of cleared `finance_transactions` where direction='out', excluding any open receivables or projected amounts.
2. THE Cash_Model SHALL compute a separate "open receivables" total from unpaid invoices (status in 'sent', 'pending', 'overdue'), clearly distinguished from current cash position.
3. THE Cash_Model SHALL use 100% deterministic arithmetic for all historical and current-period calculations, with no AI-generated or estimated values for actuals.
4. WHEN a finance transaction is recorded in the ledger, THE Cash_Model SHALL reflect the updated cash position within the same request cycle.
5. THE Cash_Summary_API SHALL return the current cash position, cash collected (last 90 days), breakpoint week (or "No risk"), and largest risk driver as four distinct metric objects in a single response.
6. IF the `finance_transactions` table contains no data for the organization, THEN THE Cash_Summary_API SHALL return a cash position of zero and indicate that no financial data is available.

### Requirement 2: 13-Week Cash Forecast with Collection Lag and Scenarios

**User Story:** As a CFO, I want a 13-week rolling cash forecast that uses actual collection patterns to predict when receivables will arrive, with base, stress, and upside scenarios, so that I can see exactly when cash pressure builds under different conditions.

#### Acceptance Criteria

1. THE Forecast_Engine SHALL produce a 13-week rolling forecast starting from the current week, with each week containing projected inflows, projected outflows, and projected ending cash balance.
2. THE Forecast_Engine SHALL derive projected inflows by applying Collection_Lag (average days-to-collect per client tier) to open receivables, shifting each receivable into its expected receipt week rather than using the invoice due date alone.
3. THE Forecast_Engine SHALL derive projected outflows from committed obligations in the `cash_obligations` table plus baseline recurring outflows computed from trailing 8-week ledger history in `finance_transactions`.
4. THE Forecast_Engine SHALL produce three scenario variants for each forecast run: a base case (normal collection lag plus known obligations), a stress case (two largest receivables slip by an additional 14 days plus one vendor cost spike of 20%), and an upside case (collection lag reduced by 30% plus one deferred payment).
5. THE Forecast_Engine SHALL label each projection with an explicit assumption tag (e.g., "collection lag: 22 days avg for this client", "recurring monthly expense from 8-week trailing average") so the CFO can audit the reasoning.
6. THE Forecast_API SHALL return the 13-week waterfall as three scenario arrays (base, stress, upside), each containing ordered weekly objects with: week number, start date, end date, projected inflows, projected outflows, projected ending balance, and assumption tags.
7. WHEN no historical data exists for a projection category, THE Forecast_Engine SHALL use zero for that category and attach an assumption tag of "no historical data available".

### Requirement 3: Breakpoint Detection

**User Story:** As a CFO, I want to know the exact week my company will run short on cash and why, so that I can act before the shortfall hits.

#### Acceptance Criteria

1. THE Breakpoint_Detector SHALL scan the 13-week forecast (base case) and identify the first week where the projected ending cash balance drops below the configurable minimum cash threshold.
2. WHEN a breakpoint is detected, THE Breakpoint_Detector SHALL return the breakpoint week number, the projected shortfall amount, and the threshold that was breached.
3. WHEN no breakpoint exists within the 13-week horizon, THE Breakpoint_Detector SHALL return a result indicating "No risk" and the minimum projected cash balance across all 13 weeks.
4. THE Cash_Summary_API SHALL include the breakpoint detection result (week number or "No risk", shortfall amount, and threshold) as the third metric box value.
5. WHEN the minimum cash threshold is not explicitly configured by the CFO, THE Breakpoint_Detector SHALL default to the greater of: trailing 4-week average outflows, or the next known payroll obligation from `cash_obligations`.

### Requirement 4: Risk Driver Identification

**User Story:** As a CFO, I want to understand which single factor is most compressing my cash, so that I can prioritize the right corrective action.

#### Acceptance Criteria

1. WHEN a breakpoint is detected, THE Risk_Driver_Analyzer SHALL identify the top contributing factors by comparing the breakpoint-week forecast against a counterfactual baseline where each factor is removed individually.
2. THE Risk_Driver_Analyzer SHALL categorize each driver as one of: receivable_slippage, expense_spike, revenue_shortfall, tax_obligation, or recurring_obligation_increase.
3. THE Risk_Driver_Analyzer SHALL rank drivers by their cash impact in descending order (largest impact first).
4. THE Cash_Summary_API SHALL include the single largest risk driver (category, description, and cash impact amount) as the fourth metric box value.
5. IF no breakpoint is detected, THEN THE Risk_Driver_Analyzer SHALL still return the top factors that most reduce the cash buffer, ranked by impact.

### Requirement 5: Ranked Action Queue

**User Story:** As a CFO, I want a prioritized list of actions I can take to resolve or delay the cash shortfall, so that I spend my limited time on the highest-impact moves.

#### Acceptance Criteria

1. WHEN the Cash_Analyze_API is called, THE Action_Ranker SHALL generate a list of candidate interventions based on the detected breakpoint and its risk drivers.
2. THE Action_Ranker SHALL rank each intervention by four factors: cash impact (dollars recovered or saved), speed to resolution (days), execution risk (low, medium, high), and confidence score (0.0 to 1.0).
3. THE Action_Ranker SHALL categorize each intervention as one of: accelerate_collection, secure_financing, defer_payment, or reduce_expense.
4. WHERE TinyFish is enabled, THE Action_Ranker SHALL use the TinyFish_Agent to research financing options and vendor alternatives, and attach source URLs and confidence scores to those interventions.
5. WHERE TinyFish is not enabled, THE Action_Ranker SHALL use mock data for external research results and indicate mock mode in the response.
6. THE Cash_Analyze_API SHALL return the ranked interventions as an ordered array, each containing: intervention ID, category, description, cash impact estimate, speed estimate, risk level, confidence score, source attribution, and executable flag.
7. THE Action_Ranker SHALL write a complete audit record to the Audit_Timeline for every analysis run, including all inputs, assumptions, generated interventions, and ranking rationale.

### Requirement 6: Action Execution

**User Story:** As a CFO, I want to execute the top recommended action from within the AI analysis overlay, so that I can act immediately on the agent's advice without navigating away.

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

**User Story:** As a CFO, I want a complete, append-only log of every agent decision and action, so that I can review what the system did and why.

#### Acceptance Criteria

1. THE Audit_Timeline SHALL record every agent operation (forecast generation, breakpoint detection, risk analysis, action ranking, action execution) as a separate entry in the `ai_actions` table.
2. THE Audit_Timeline SHALL store for each entry: organization ID, entity type, entity ID, trigger type, action type, input summary, full output payload, status, and timestamps.
3. THE Audit_Timeline SHALL be append-only — existing entries are never modified or deleted by the application.
4. WHEN an agent operation fails, THE Audit_Timeline SHALL record the failure with status "failed", the error message in the output payload, and the inputs that caused the failure.
5. THE system SHALL expose the Audit_Timeline through the existing workflow view, ordered by timestamp descending, with the ability to filter by action type.

### Requirement 9: Rescue Queue UI Layout

**User Story:** As a CFO, I want the Rescue Queue page to serve as my cash control tower with four critical metric boxes, a single analysis button, and an overlay dashboard that shows me everything about a selected client, so that I can manage cash risk from one screen without navigating between multiple views.

#### Acceptance Criteria

1. THE Rescue_Queue_UI SHALL display four CFO-critical metric boxes at the top of the page: Current Cash Position (cleared ledger cash only), Cash Collected (last 90 days), Breakpoint Week (first week cash drops below threshold, or "No risk"), and Largest Risk Driver (single biggest factor compressing cash).
2. THE Rescue_Queue_UI SHALL display a case list on the left side showing clients/invoices ordered by risk score, where each item shows customer name, outstanding amount, and days overdue.
3. THE Rescue_Queue_UI SHALL provide a single primary action button labeled "Run AI Analysis" that replaces the previous Run Agent, Survival Scan, Send Reminder, and Execute Decision buttons.
4. WHEN the CFO clicks "Run AI Analysis", THE Rescue_Queue_UI SHALL display the Analysis_Overlay as a hovering modal/overlay dashboard over the Rescue Queue.
5. THE Analysis_Overlay SHALL contain a left panel showing TinyFish external findings about the selected client (news, financial distress signals, risk assessment, collection history analysis).
6. THE Analysis_Overlay SHALL contain a center section with four client summary boxes: total outstanding from this client, average days to pay (this client's collection lag), payment reliability score (percentage of invoices paid on time), and risk classification (forgot, cash_flow, disputing, bad_actor).
7. THE Analysis_Overlay SHALL contain below the summary boxes an AI-generated natural-language text summary stating the exact amounts coming in and going out, what is at risk, and the recommended action — absorbing the previous separate invoice detail view.
8. THE Analysis_Overlay SHALL present executable actions (accelerate collection, defer payment, send reminder, etc.) as clickable items within the overlay, replacing the previous separate action buttons.
9. THE Rescue_Queue_UI SHALL remove the filter tabs (All, Collections, High urgency) — the AI analysis handles prioritization through the risk-scored case list.

### Requirement 10: Collection Lag Computation

**User Story:** As a CFO, I want the forecast to use actual collection patterns from my historical data to predict when receivables will arrive, so that the forecast reflects real client payment behavior rather than optimistic due dates.

#### Acceptance Criteria

1. THE Collection_Lag_Computer SHALL compute average days-to-collect for each client from historical paid invoices using the formula: paid_at minus created_at for each paid invoice.
2. THE Collection_Lag_Computer SHALL bucket each client into one of three tiers: on_time (average days-to-collect within 5 days of due date), slightly_late (6 to 30 days past due date), and very_late (more than 30 days past due date).
3. THE Collection_Lag_Computer SHALL apply the computed collection lag to each unpaid invoice to determine the expected receipt week, shifting the receivable from its due-date week to its lag-adjusted week.
4. WHEN a client has fewer than two paid invoices in history, THE Collection_Lag_Computer SHALL fall back to the organization-wide average collection lag.
5. THE Collection_Lag_Computer SHALL recompute collection lag statistics whenever a new payment is recorded, keeping the lag data current.
6. THE Cash_Analyze_API SHALL include the selected client's collection lag tier and average days-to-collect in the analysis response.

### Requirement 11: Demo Data and Mock Mode

**User Story:** As a hackathon presenter, I want the system to work convincingly with seeded demo data including realistic collection lag scenarios, so that the demo is reliable regardless of live API availability.

#### Acceptance Criteria

1. THE system SHALL include a SQL seed script that populates a realistic 13-week cash scenario with: cleared ledger cash (direction='in' and direction='out' transactions), open receivables at various aging stages, committed outflows in `cash_obligations` (payroll, rent, vendor invoices), recurring obligations, and at least one invoice configuration that creates a week-4 breakpoint.
2. THE seed script SHALL include clients with varied collection lag profiles: at least one on-time payer, one slightly-late payer (15-20 days past due average), and one very-late payer (40+ days past due average), each with sufficient paid invoice history to compute meaningful lag statistics.
3. WHEN the environment variable `TINYFISH_USE_MOCKS` is set to true, THE Action_Ranker SHALL use mock financing offers and vendor alternatives instead of calling the TinyFish_Agent.
4. THE mock data SHALL include at least three financing offers with realistic terms (APR, term, max amount, decision speed) and at least two vendor alternatives with price comparisons.
5. THE system SHALL function end-to-end (cash summary with four metric boxes, forecast with three scenarios, breakpoint detection, collection lag computation, action ranking, action execution, and the Analysis_Overlay) using only seeded data and mock mode, with no external dependencies.
6. WHEN switching between mock and live TinyFish modes, THE system SHALL produce structurally identical API responses, differing only in the `mode` field value and the content of external research results.
