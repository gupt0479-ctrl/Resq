# Implementation Plan: Improve Decision Reasoning

## Overview

This implementation adds human-readable reasoning to the collections decision agent's fallback logic. The approach is to create helper functions for payment history labeling, behavior pattern detection, and action rationale, then integrate them into a main `generateHumanReadableReasoning` function that replaces the technical `chainOfThought` in `deterministicDecision`.

## Tasks

- [x] 1. Implement helper functions for reasoning generation
  - [x] 1.1 Create `getPaymentHistoryLabel` function
    - Implement function that converts payment rate percentage to human-readable labels
    - Handle null payment rates with generic fallback
    - Return labels: "excellent payment history" (>=90%), "generally reliable payment history" (70-89%), "inconsistent payment history" (50-69%), "poor payment history" (<50%)
    - _Requirements: 1.1, 1.2, 7.1_

  - [x] 1.2 Create `getBehaviorPattern` function
    - Implement function that detects unusual vs. consistent payment patterns
    - Compare current overdue status against payment history
    - Return patterns: "first late payment", "recurring late payment pattern", "unusual for this customer", "consistent with past behavior"
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 1.3 Create `getActionRationale` function
    - Implement function that explains why each action type was selected
    - Handle payment_plan, reminder, escalation, and clarification actions
    - Reference customer payment history and days overdue in explanations
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 1.4 Create `formatReasoningSentences` function
    - Implement function that combines reasoning parts into cohesive narrative
    - Use natural language connectors (because, since, given that)
    - Order factors by importance (distress > days overdue > payment history)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 1.5 Create `enforceCharacterLimit` function
    - Implement function that truncates explanations over 300 characters
    - Truncate at last complete sentence before limit
    - Add ellipsis if truncation occurs mid-sentence
    - _Requirements: 2.5, 6.5_

- [x] 2. Implement main reasoning generator function
  - [x] 2.1 Create `generateHumanReadableReasoning` function
    - Define function signature with all required parameters (customerName, daysOverdue, amount, trajectory, aggressionBudget, ltvFactor, lifetimeValue, selectedAction, allowedActions, profile, externalSignals)
    - Implement try-catch wrapper for error handling
    - Call helper functions to build reasoning components
    - Return formatted human-readable explanation string
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.5_

  - [x] 2.2 Add customer situation context building
    - Build payment history context using `getPaymentHistoryLabel`
    - Build behavior pattern context using `getBehaviorPattern`
    - Include relationship value context (lifetime value, relationship months)
    - Handle null/missing profile fields gracefully
    - _Requirements: 1.2, 1.3, 7.1, 7.3, 7.4_

  - [x] 2.3 Add external signals integration
    - Check if external signals should be included (live data source, distress flag, or notable news)
    - Include financial distress indicators when distress flag is true
    - Omit external signal references when unavailable or in mock mode
    - _Requirements: 1.4, 7.2_

  - [x] 2.4 Add action selection explanation
    - Call `getActionRationale` with selected action and context
    - Explain why selected action was chosen over other allowed actions
    - Reference specific customer factors that influenced the choice
    - _Requirements: 1.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Integrate reasoning generator into deterministicDecision
  - [x] 3.1 Update deterministicDecision function signature
    - Add lifetimeValue parameter to function signature
    - Add profile parameter (CustomerProfile type) to function signature
    - Pass these parameters through from runCollectionsDecision caller
    - _Requirements: 5.1, 5.2_

  - [x] 3.2 Replace technical chainOfThought with human-readable reasoning
    - Remove existing technical chainOfThought line
    - Call generateHumanReadableReasoning with all required parameters
    - Assign result to chainOfThought field in return object
    - _Requirements: 5.3, 6.1, 6.2, 6.3_

  - [x] 3.3 Update runCollectionsDecision to pass profile to deterministicDecision
    - Pass profile object to deterministicDecision in fallback catch block
    - Pass lifetimeValue to deterministicDecision
    - Ensure all other decision fields remain unchanged
    - _Requirements: 5.2, 5.4_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 5. Add comprehensive unit tests
  - [ ]* 5.1 Write tests for getPaymentHistoryLabel
    - Test excellent history (>=90%) returns "excellent payment history"
    - Test poor history (<50%) returns "poor payment history"
    - Test null payment rate returns generic "payment history"
    - _Requirements: 1.2, 7.1_

  - [ ]* 5.2 Write tests for getBehaviorPattern
    - Test good history + significantly overdue returns "unusual for this customer"
    - Test poor history + overdue returns "consistent with past behavior"
    - Test first late payment (priorOverdueCount === 0) returns "first late payment"
    - Test recurring pattern (priorOverdueCount >= 2) returns "recurring late payment pattern"
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 5.3 Write tests for getActionRationale
    - Test payment_plan action mentions "flexible payment options"
    - Test reminder action mentions "early overdue" or "good history"
    - Test escalation action mentions "multiple reminders without response"
    - Test clarification action mentions "disputed" status
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 5.4 Write tests for generateHumanReadableReasoning integration
    - Test high-value customer with first late payment produces appropriate explanation
    - Test chronic late payer produces appropriate explanation
    - Test financial distress detected scenario includes distress mention
    - Test all null profile fields produces valid explanation
    - Test zero lifetime value omits LTV references
    - Test explanation length is within 100-300 character range
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 5.5 Write tests for character limit enforcement
    - Test explanation under 100 chars passes through unchanged
    - Test explanation 100-300 chars passes through unchanged
    - Test explanation over 300 chars truncates at sentence boundary
    - _Requirements: 6.5_

  - [ ]* 5.6 Write integration tests for deterministicDecision
    - Test deterministicDecision returns human-readable chainOfThought (not technical jargon)
    - Test chainOfThought does not contain "trajectory=", "aggression=", or "rule filter"
    - Test chainOfThought length is within expected range
    - Test all other decision fields remain unchanged
    - _Requirements: 5.3, 5.4, 6.1, 6.2, 6.3, 6.4_

- [ ] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- No property-based tests needed (natural language output is subjective)
- Manual review recommended after implementation to verify explanation quality
