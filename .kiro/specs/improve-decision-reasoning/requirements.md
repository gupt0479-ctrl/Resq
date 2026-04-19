# Requirements Document

## Introduction

The collections decision agent currently displays technical fallback reasoning that is not user-friendly. When Claude is unavailable, the system shows messages like "Fallback decision: 31d overdue, trajectory=flat, aggression=78. Selected 'payment_plan' based on rule filter." This technical jargon does not help users understand why the AI made a specific decision.

This feature will transform the technical fallback reasoning into plain-language explanations that help users understand what the AI observed about the customer situation, why it chose a specific action, and what factors influenced the decision (payment history, relationship value, external signals).

## Glossary

- **Decision_Agent**: The collections decision agent service that analyzes overdue invoices and recommends actions
- **Chain_Of_Thought**: The reasoning explanation displayed to users in the "Agent reasoning" section of the RescueClient UI
- **Fallback_Decision**: The deterministic decision logic used when Claude API is unavailable
- **Customer_Profile**: Historical payment data including payment rate, average days late, prior overdue count, and relationship length
- **Trajectory**: Customer payment behavior trend (improving, flat, or worsening)
- **Aggression_Budget**: A 0-100 score indicating how assertive the collections approach should be
- **LTV_Factor**: Lifetime value factor (0-0.3) that softens aggression for high-value customers
- **External_Signals**: News and financial distress indicators from TinyFish search
- **Rule_Filter**: Logic that determines which actions are allowed based on days overdue, reminder count, and invoice status

## Requirements

### Requirement 1: Generate Human-Readable Reasoning

**User Story:** As a collections manager, I want to see plain-language explanations of AI decisions, so that I can understand and trust the recommendations.

#### Acceptance Criteria

1. WHEN the Fallback_Decision generates a Chain_Of_Thought, THE Reasoning_Generator SHALL produce a human-readable explanation containing customer situation, decision rationale, and influencing factors
2. THE Reasoning_Generator SHALL include payment history context (payment rate, average days late, prior overdue count) in the explanation
3. THE Reasoning_Generator SHALL include relationship value context (lifetime value, relationship length, LTV_Factor) in the explanation
4. WHEN External_Signals contain a distress flag, THE Reasoning_Generator SHALL mention financial distress indicators in the explanation
5. THE Reasoning_Generator SHALL explain why the selected action was chosen over other allowed actions
6. THE Reasoning_Generator SHALL avoid technical jargon (trajectory names, aggression scores, rule filter references)

### Requirement 2: Format Reasoning for Readability

**User Story:** As a collections manager, I want reasoning explanations to be well-structured, so that I can quickly scan and understand key decision factors.

#### Acceptance Criteria

1. THE Reasoning_Formatter SHALL structure explanations into 2-4 sentences with clear logical flow
2. THE Reasoning_Formatter SHALL use natural language connectors (because, since, given that, therefore)
3. THE Reasoning_Formatter SHALL present the most important factor first (days overdue, distress signals, or payment history)
4. WHEN multiple factors influence a decision, THE Reasoning_Formatter SHALL list them in order of importance
5. THE Reasoning_Formatter SHALL use specific numbers (days, percentages, dollar amounts) instead of abstract scores

### Requirement 3: Explain Action Selection Logic

**User Story:** As a collections manager, I want to understand why a specific action was selected, so that I can evaluate whether it's appropriate for the situation.

#### Acceptance Criteria

1. WHEN "payment_plan" is selected, THE Action_Explainer SHALL explain that the customer is overdue beyond the reminder threshold and may need flexible payment options
2. WHEN "reminder" is selected, THE Action_Explainer SHALL explain that the customer is in the early overdue period or has a good payment history
3. WHEN "escalation" is selected, THE Action_Explainer SHALL explain that multiple reminders have been sent without response
4. WHEN "clarification" is selected, THE Action_Explainer SHALL explain that the invoice status is disputed or unclear
5. THE Action_Explainer SHALL reference the customer's payment history when explaining why an action is appropriate

### Requirement 4: Contextualize Customer Behavior

**User Story:** As a collections manager, I want to see how current behavior compares to the customer's history, so that I can identify unusual patterns.

#### Acceptance Criteria

1. WHEN a customer with a good payment history (payment rate >= 90%) is significantly overdue, THE Behavior_Contextualizer SHALL flag this as unusual behavior
2. WHEN a customer with a poor payment history (payment rate < 50%) continues the pattern, THE Behavior_Contextualizer SHALL note this is consistent with their history
3. WHEN a customer has zero prior overdue invoices, THE Behavior_Contextualizer SHALL mention this is their first late payment
4. WHEN a customer has multiple prior overdue invoices (>= 2), THE Behavior_Contextualizer SHALL note this is a recurring pattern
5. THE Behavior_Contextualizer SHALL compare current days overdue to the customer's average days late

### Requirement 5: Integrate Reasoning into Fallback Decision

**User Story:** As a developer, I want the improved reasoning to be generated within the deterministic decision function, so that it's available whenever the fallback is used.

#### Acceptance Criteria

1. THE Decision_Agent SHALL call the Reasoning_Generator within the deterministicDecision function
2. THE Decision_Agent SHALL pass Customer_Profile, External_Signals, days overdue, selected action, and allowed actions to the Reasoning_Generator
3. THE Decision_Agent SHALL replace the technical Chain_Of_Thought with the generated human-readable explanation
4. THE Decision_Agent SHALL preserve all other decision fields (classification, confidence, tone, outreach draft, response plan)
5. WHEN the Reasoning_Generator fails, THE Decision_Agent SHALL fall back to a generic explanation rather than showing technical details

### Requirement 6: Maintain Backward Compatibility

**User Story:** As a developer, I want the improved reasoning to work with existing UI components, so that no UI changes are required.

#### Acceptance Criteria

1. THE Reasoning_Generator SHALL output a string that fits in the existing chainOfThought field
2. THE Reasoning_Generator SHALL produce explanations that render correctly in the RescueClient UI "Agent reasoning" section
3. THE Decision_Agent SHALL continue to return the same CollectionsDecision type structure
4. THE Decision_Agent SHALL not modify the Claude decision path (only the fallback path)
5. THE Reasoning_Generator SHALL produce explanations between 100-300 characters to fit UI constraints

### Requirement 7: Handle Edge Cases Gracefully

**User Story:** As a developer, I want the reasoning generator to handle missing or incomplete data, so that it never crashes or shows errors to users.

#### Acceptance Criteria

1. WHEN Customer_Profile fields are null, THE Reasoning_Generator SHALL use generic descriptions instead of specific numbers
2. WHEN External_Signals are unavailable, THE Reasoning_Generator SHALL omit external signal references from the explanation
3. WHEN lifetimeValue is zero, THE Reasoning_Generator SHALL not mention relationship value in the explanation
4. WHEN relationshipMonths is zero, THE Reasoning_Generator SHALL describe the customer as new
5. THE Reasoning_Generator SHALL never throw exceptions or return empty strings

