# Implementation Plan: TinyFish Portal Login

## Overview

This implementation adds intelligent pre-collection reconnaissance by logging into customer payment portals using TinyFish Web Agent's vault credential system. The feature demonstrates true agentic behavior by taking multi-step actions across external systems before escalating to traditional collection methods. The implementation follows three-mode operation (mock/misconfigured/live) with graceful degradation and full auditability.

## Tasks

- [x] 1. Set up portal reconnaissance infrastructure and types
  - Create TypeScript interfaces for portal reconnaissance results, parsed data, and screenshots
  - Define Zod schemas for validation following existing TinyFish patterns
  - Add environment variable configuration for portal reconnaissance mode detection
  - Set up mock fixture data for all five demo scenarios (invoice_visible_unpaid, invoice_visible_processing, invoice_not_visible, high_engagement, low_engagement)
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 10.1, 10.2_

- [ ] 2. Implement Portal HTML Parser service
  - [x] 2.1 Create portal-html-parser.ts service with parsing logic
    - Implement extraction for invoice numbers, amounts, dates, and status fields from table-based layouts
    - Implement extraction for invoice data from card-based layouts
    - Implement extraction for JSON-embedded invoice data
    - Implement customer activity extraction (last login, view counts, view timestamps)
    - Return confidence scores (0-100) based on matched fields
    - Handle missing or malformed data gracefully with descriptive errors
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.6_
  
  - [ ]* 2.2 Write property test for HTML parser round-trip preservation
    - **Property 1: Portal Data Round-Trip Preservation**
    - **Validates: Requirements 11.1, 11.2, 11.5**
    - Generate random valid portal data objects
    - Format with Portal Pretty Printer, parse the output, assert equivalence
    - Run 100 iterations minimum
    - _Requirements: 11.5, 11.6_

- [x] 3. Implement Portal Pretty Printer service
  - Create portal-pretty-printer.ts service
  - Format parsed invoice data into human-readable summaries
  - Format customer activity data into readable summaries
  - Handle null/undefined fields gracefully
  - _Requirements: 11.5_

- [x] 4. Extend TinyFish client with portal login capability
  - Add runPortalLogin() method to src/lib/tinyfish/client.ts following existing patterns
  - Support vault credential authentication with use_vault: true
  - Configure browser profile as 'stealth' for anti-bot protection
  - Build goal prompt template for portal navigation and data extraction
  - Extract screenshots from TinyFish response at each step
  - Handle error responses with typed TinyFishError
  - Return typed PortalLoginResult with mode indicators
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 5. Checkpoint - Verify TinyFish client extension
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement Portal Reconnaissance Service
  - [x] 6.1 Create portal-reconnaissance.ts service with three-mode orchestration
    - Implement mode detection (mock/misconfigured/live) using environment variables
    - Implement mock mode returning fixture data within 500ms
    - Implement misconfigured mode returning warnings without crashing
    - Implement live mode calling TinyFish client with vault credentials
    - Implement graceful degradation from live to mock on errors
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 10.1, 10.2_
  
  - [x] 6.2 Implement invoice visibility verification logic
    - Navigate to invoices/billing section after authentication
    - Search for target invoice by number or amount
    - Return visibility: true/false with reason and confidence score
    - Capture screenshot showing invoice list or detail page
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [x] 6.3 Implement payment status verification logic
    - Check payment status field when invoice is visible
    - Detect payment states: unpaid, processing, paid, failed, unknown
    - Return shouldSkipCollection: true for processing/paid states
    - Extract payment date and method when available
    - Capture screenshot showing payment status
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [x] 6.4 Implement customer activity analysis logic
    - Extract last login timestamp from portal
    - Determine hasRecentActivity (within 7 days)
    - Extract invoice view count and timestamps when available
    - Calculate engagementLevel (high/medium/low/none) based on activity patterns
    - Return activityConfidence score (0-100)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [x] 6.5 Implement portal-native messaging logic
    - Detect message or comment interface in portal
    - Compose message using draft from Collections Decision Agent
    - Send message through portal's native interface
    - Return messageSent: true with timestamp on success
    - Return messageSent: false with reason if interface not supported
    - Capture screenshot showing sent message
    - Fall back to email on failure
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [x] 6.6 Implement session proof and audit logging
    - Capture screenshots at each major step (login, invoice_list, invoice_detail, payment_status, message_sent)
    - Store screenshots with timestamps and invoice identifiers
    - Return screenshot URLs or base64-encoded images
    - Log all portal actions to ai_actions audit table with action_type: 'portal_reconnaissance'
    - Include portal URL, action type, timestamp, result status, and TinyFish run ID in audit logs
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [x] 6.7 Implement error handling and retry logic
    - Retry TinyFish 429 and 5xx errors with exponential backoff (max 2 attempts)
    - Return authFailed: true for invalid credentials, skip to email collection
    - Return botDetected: true for CAPTCHA/bot detection, fall back to fixtures
    - Return parsingFailed: true with low confidence for structure changes
    - Never block collections workflow for more than 30 seconds
    - Log all errors to audit trail with error type and recovery action
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [x] 7. Create Portal Reconnaissance API endpoint
  - Create POST /api/tinyfish/portal-recon route handler
  - Validate request parameters (invoiceId required, customerId optional)
  - Call Portal Reconnaissance Service with validated parameters
  - Return typed response with mode, degradedFromLive, warning, and result fields
  - Return 200 for successful reconnaissance (even if invoice not found)
  - Return 400 for invalid request parameters
  - Return 500 only for unexpected server errors
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 8. Checkpoint - Verify portal reconnaissance service and API
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Integrate portal reconnaissance with Collections Decision Agent
  - [x] 9.1 Add portal reconnaissance call to Collections Decision Agent
    - Call portalReconnaissanceService.investigate() before decision logic
    - Pass invoiceId and customerId to reconnaissance service
    - Add portalReconnaissance field to CollectionsDecisionContext interface
    - _Requirements: 7.1_
  
  - [x] 9.2 Adjust decision logic based on portal signals
    - Skip collection if shouldSkipCollection: true (payment processing)
    - Adjust tone based on engagementLevel (high engagement → gentler tone)
    - Escalate faster if visibility: false (invoice not visible to customer)
    - Prefer portal messaging over email when messageSent: true
    - _Requirements: 7.2, 7.3, 7.4, 7.5_
  
  - [x] 9.3 Enhance reasoning display with portal signals
    - Include portal signals in Assessment block (visibility, payment status, engagement)
    - Add portal reconnaissance to External Signals section with confidence scores
    - Include portal context in chainOfThought reasoning
    - _Requirements: 7.6, 7.7_

- [x] 10. Add portal reconnaissance health check to TinyFish health endpoint
  - Extend /api/tinyfish/health to report portal reconnaissance mode status
  - Include TINYFISH_VAULT_ENABLED and TINYFISH_PORTAL_RECON_ENABLED in health check
  - Return mode: mock/misconfigured/live for portal reconnaissance
  - _Requirements: 8.7_

- [x] 11. Create mock screenshots for demo mode
  - Generate or source placeholder screenshot images for all five demo scenarios
  - Store as base64 data URIs or static assets
  - Include in mock fixture responses with appropriate step labels
  - _Requirements: 10.3_

- [x] 12. Wire portal reconnaissance into rescue queue UI (optional integration point)
  - Display portal reconnaissance results in rescue queue item details
  - Show visibility status, payment status, and engagement level
  - Display screenshots in expandable section
  - Show mode indicator (mock/misconfigured/live) with warnings
  - _Requirements: 9.4_

- [x] 13. Final checkpoint - End-to-end verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify mock mode returns realistic data within 500ms
  - Verify all five demo scenarios work reliably
  - Verify Collections Decision Agent integration complete
  - Verify reasoning display shows portal signals
  - Verify error handling covers all failure modes
  - Verify audit logging complete and queryable

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property test (2.2) validates HTML parser round-trip correctness
- Three-mode operation (mock/misconfigured/live) is critical for demo reliability
- Graceful degradation ensures collections workflow never blocks
- All portal actions must be logged to ai_actions for auditability
- Mock mode must work without any TinyFish configuration
- Live mode requires TINYFISH_VAULT_ENABLED=true and valid credentials
