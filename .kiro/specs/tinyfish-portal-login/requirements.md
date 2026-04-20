> **Historical Note:** This spec was written during the OpsPilot → Resq transition. References to "OpsPilot" are historical.

# Requirements Document

## Introduction

This feature enables the OpsPilot Rescue Agent to perform intelligent pre-collection reconnaissance by logging into customer payment portals using TinyFish Web Agent's vault credential system. The agent verifies invoice visibility, checks payment status, analyzes customer activity, and sends portal-native messages before escalating to traditional collection methods. This capability is the most demo-able part of the autonomous collections agent and demonstrates true agentic behavior by taking multi-step actions across external systems.

## Glossary

- **Portal_Login_Agent**: The TinyFish-backed service that authenticates into customer payment portals
- **Vault_Credential**: Securely stored customer portal login credentials managed by TinyFish's password manager integration
- **Invoice_Visibility_Check**: Verification that an invoice appears in the customer's portal view
- **Payment_Status_Verification**: Confirmation of whether payment is already processing or completed
- **Customer_Activity_Analysis**: Examination of customer login history, invoice views, and engagement patterns
- **Portal_Native_Message**: Communication sent inside the customer's payment portal interface
- **Session_Screenshot**: Visual proof of portal state captured during the agent session
- **Mock_Mode**: Demo-safe operation using deterministic fixtures without real portal access
- **Live_Mode**: Production operation using real TinyFish API calls with vault credentials
- **Collections_Decision_Agent**: The existing service that determines collection actions and messaging
- **Recovery_Queue**: The prioritized list of overdue invoices requiring action

## Requirements

### Requirement 1: Portal Authentication

**User Story:** As a collections agent, I want to log into customer payment portals automatically, so that I can verify invoice status before sending collection messages.

#### Acceptance Criteria

1. WHEN a portal login is requested, THE Portal_Login_Agent SHALL authenticate using Vault_Credentials via TinyFish
2. WHERE Live_Mode is enabled, THE Portal_Login_Agent SHALL use TinyFish vault credential system with `use_vault: true`
3. WHERE Mock_Mode is enabled, THE Portal_Login_Agent SHALL return deterministic fixture data without network calls
4. IF authentication fails, THEN THE Portal_Login_Agent SHALL log the failure and return a typed error without crashing
5. WHEN authentication succeeds, THE Portal_Login_Agent SHALL maintain the session for subsequent verification steps
6. THE Portal_Login_Agent SHALL support domain matching for credentials (e.g., `customer-portal.example.com`)
7. IF multiple credentials exist for the same domain, THEN THE Portal_Login_Agent SHALL use the credential specified by `credential_item_ids`

### Requirement 2: Invoice Visibility Verification

**User Story:** As a collections agent, I want to verify that invoices are visible to customers in their portal, so that I don't chase customers for invoices they cannot see.

#### Acceptance Criteria

1. WHEN authenticated to a portal, THE Portal_Login_Agent SHALL navigate to the invoices or billing section
2. THE Portal_Login_Agent SHALL search for the target invoice by invoice number or amount
3. IF the invoice is found, THEN THE Portal_Login_Agent SHALL return `visibility: true` with the invoice location
4. IF the invoice is not found, THEN THE Portal_Login_Agent SHALL return `visibility: false` with a reason (e.g., "not in customer view", "filtered to spam")
5. THE Portal_Login_Agent SHALL capture a screenshot showing the invoice list or detail page
6. FOR ALL visibility checks, the result SHALL include `confidence` (0-100) indicating detection certainty

### Requirement 3: Payment Status Verification

**User Story:** As a collections agent, I want to check if payment is already processing, so that I never chase customers who have already paid.

#### Acceptance Criteria

1. WHEN an invoice is visible in the portal, THE Portal_Login_Agent SHALL check the payment status field
2. THE Portal_Login_Agent SHALL detect payment states: `unpaid`, `processing`, `paid`, `failed`, `unknown`
3. IF payment status is `processing` or `paid`, THEN THE Portal_Login_Agent SHALL return `shouldSkipCollection: true`
4. IF payment status is `unpaid` or `failed`, THEN THE Portal_Login_Agent SHALL return `shouldSkipCollection: false`
5. THE Portal_Login_Agent SHALL extract payment date and method when available
6. THE Portal_Login_Agent SHALL capture a screenshot showing the payment status

### Requirement 4: Customer Activity Analysis

**User Story:** As a collections agent, I want to analyze customer portal activity, so that I can tailor my collection approach based on engagement patterns.

#### Acceptance Criteria

1. WHEN authenticated to a portal, THE Portal_Login_Agent SHALL extract the customer's last login timestamp
2. THE Portal_Login_Agent SHALL determine if the customer has logged in within the last 7 days
3. THE Portal_Login_Agent SHALL extract invoice view count when available
4. THE Portal_Login_Agent SHALL extract invoice view timestamps when available
5. THE Portal_Login_Agent SHALL return `hasRecentActivity: true` if login or view occurred within 7 days
6. THE Portal_Login_Agent SHALL return `engagementLevel` as `high`, `medium`, `low`, or `none` based on activity patterns
7. FOR ALL activity analysis, the result SHALL include `activityConfidence` (0-100) indicating data quality

### Requirement 5: Portal-Native Messaging

**User Story:** As a collections agent, I want to send messages inside the customer's payment portal, so that communications are harder to ignore than email.

#### Acceptance Criteria

1. WHEN a portal supports messaging, THE Portal_Login_Agent SHALL detect the message or comment interface
2. THE Portal_Login_Agent SHALL compose a message using the draft provided by Collections_Decision_Agent
3. THE Portal_Login_Agent SHALL send the message through the portal's native interface
4. WHEN the message is sent, THE Portal_Login_Agent SHALL return `messageSent: true` with a timestamp
5. IF the portal does not support messaging, THEN THE Portal_Login_Agent SHALL return `messageSent: false` with reason `no_messaging_interface`
6. THE Portal_Login_Agent SHALL capture a screenshot showing the sent message
7. IF message sending fails, THEN THE Portal_Login_Agent SHALL return a typed error and fall back to email

### Requirement 6: Session Proof and Auditability

**User Story:** As a business owner, I want visual proof of portal sessions, so that I have evidence for potential disputes.

#### Acceptance Criteria

1. THE Portal_Login_Agent SHALL capture screenshots at each major step: login, invoice list, invoice detail, payment status, message sent
2. THE Portal_Login_Agent SHALL store screenshots with timestamps and invoice identifiers
3. THE Portal_Login_Agent SHALL return screenshot URLs or base64-encoded images in the result
4. THE Portal_Login_Agent SHALL log all portal actions to the `ai_actions` audit table
5. THE Portal_Login_Agent SHALL include portal URL, action type, timestamp, and result status in audit logs
6. FOR ALL portal sessions, the audit log SHALL preserve the full TinyFish run ID for traceability

### Requirement 7: Integration with Collections Decision Agent

**User Story:** As a collections system, I want portal reconnaissance to inform collection decisions, so that actions are based on complete context.

#### Acceptance Criteria

1. WHEN Collections_Decision_Agent evaluates an invoice, THE Portal_Login_Agent SHALL provide portal reconnaissance data
2. THE Collections_Decision_Agent SHALL skip collection if `shouldSkipCollection: true` (payment processing)
3. THE Collections_Decision_Agent SHALL adjust tone based on `engagementLevel` (high engagement → gentler tone)
4. THE Collections_Decision_Agent SHALL escalate faster if `visibility: false` (invoice not visible to customer)
5. THE Collections_Decision_Agent SHALL prefer portal messaging over email when `messageSent: true`
6. THE Collections_Decision_Agent SHALL include portal signals in the reasoning display (Assessment block)
7. THE Collections_Decision_Agent SHALL log portal reconnaissance results in the action audit trail

### Requirement 8: Three-Mode Operation

**User Story:** As a developer, I want the portal login feature to support mock, misconfigured, and live modes, so that the system is demo-safe and production-ready.

#### Acceptance Criteria

1. WHERE `TINYFISH_ENABLED=false` or `TINYFISH_USE_MOCKS=true`, THE Portal_Login_Agent SHALL operate in Mock_Mode
2. WHERE `TINYFISH_ENABLED=true` and required config is missing, THE Portal_Login_Agent SHALL return `mode: misconfigured` with a warning
3. WHERE `TINYFISH_ENABLED=true` and config is complete, THE Portal_Login_Agent SHALL operate in Live_Mode
4. THE Portal_Login_Agent SHALL return `mode` field in all responses: `mock`, `misconfigured`, or `live`
5. WHERE Live_Mode fails, THE Portal_Login_Agent SHALL degrade gracefully to fixture data and set `degradedFromLive: true`
6. THE Portal_Login_Agent SHALL never crash due to missing TinyFish configuration
7. THE Portal_Login_Agent SHALL expose mode status via `/api/tinyfish/health` endpoint

### Requirement 9: Portal Reconnaissance API

**User Story:** As a frontend developer, I want a stable API for portal reconnaissance, so that I can display results in the rescue queue.

#### Acceptance Criteria

1. THE Portal_Login_Agent SHALL expose `POST /api/tinyfish/portal-recon` endpoint
2. THE endpoint SHALL accept `invoiceId` and optional `customerId` in the request body
3. THE endpoint SHALL return a typed response with `mode`, `degradedFromLive`, `warning`, and `result` fields
4. THE `result` field SHALL include: `visibility`, `paymentStatus`, `shouldSkipCollection`, `hasRecentActivity`, `engagementLevel`, `messageSent`, `screenshots`, `confidence`
5. THE endpoint SHALL return 200 status for successful reconnaissance (even if invoice not found)
6. THE endpoint SHALL return 400 status for invalid request parameters
7. THE endpoint SHALL return 500 status only for unexpected server errors

### Requirement 10: Demo Readiness and Reliability

**User Story:** As a hackathon presenter, I want portal login to work reliably in demo mode, so that I can showcase agentic behavior without external dependencies.

#### Acceptance Criteria

1. WHERE Mock_Mode is enabled, THE Portal_Login_Agent SHALL return realistic fixture data within 500ms
2. THE fixture data SHALL include varied scenarios: visible invoices, processing payments, high engagement, low engagement
3. THE Portal_Login_Agent SHALL include mock screenshots (placeholder images or base64 data)
4. THE Portal_Login_Agent SHALL never require real TinyFish API keys in Mock_Mode
5. THE Portal_Login_Agent SHALL support demo scenarios: `invoice_visible_unpaid`, `invoice_visible_processing`, `invoice_not_visible`, `high_engagement`, `low_engagement`
6. WHERE Live_Mode is enabled, THE Portal_Login_Agent SHALL use stealth browser profile and proxy for anti-bot protection
7. THE Portal_Login_Agent SHALL validate Live_Mode results and fall back to fixtures if confidence is below 50%

### Requirement 11: Parser and Round-Trip Testing

**User Story:** As a developer, I want to parse portal HTML responses reliably, so that invoice and payment data is extracted correctly.

#### Acceptance Criteria

1. WHEN portal HTML is received, THE Portal_HTML_Parser SHALL extract invoice numbers, amounts, dates, and status fields
2. WHEN portal HTML is received, THE Portal_HTML_Parser SHALL extract customer activity timestamps and view counts
3. THE Portal_HTML_Parser SHALL handle common portal formats: table rows, card layouts, JSON-embedded data
4. IF parsing fails, THEN THE Portal_HTML_Parser SHALL return a descriptive error with the failed selector or pattern
5. THE Portal_Pretty_Printer SHALL format parsed portal data back into a human-readable summary
6. FOR ALL valid portal data objects, parsing then printing then parsing SHALL produce an equivalent object (round-trip property)
7. THE Portal_HTML_Parser SHALL return `confidence` (0-100) indicating parse quality based on matched fields

### Requirement 12: Error Handling and Fallback

**User Story:** As a system operator, I want portal login failures to degrade gracefully, so that collections workflow continues even when portals are unavailable.

#### Acceptance Criteria

1. IF TinyFish returns a 429 rate limit error, THEN THE Portal_Login_Agent SHALL retry with exponential backoff up to 2 attempts
2. IF TinyFish returns a 5xx server error, THEN THE Portal_Login_Agent SHALL retry with exponential backoff up to 2 attempts
3. IF authentication fails due to invalid credentials, THEN THE Portal_Login_Agent SHALL return `authFailed: true` and skip to email collection
4. IF portal shows CAPTCHA or bot detection, THEN THE Portal_Login_Agent SHALL return `botDetected: true` and fall back to fixtures
5. IF portal structure changes and parsing fails, THEN THE Portal_Login_Agent SHALL return `parsingFailed: true` with low confidence
6. THE Portal_Login_Agent SHALL never block the collections workflow for more than 30 seconds
7. THE Portal_Login_Agent SHALL log all errors to the audit trail with error type and recovery action
