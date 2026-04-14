# AI Features Playbook

Use for AI summaries, review analysis, recovery drafting, or prompt changes.

## AI is allowed to own

- Feedback classification
- Recovery and follow-up drafting
- Manager summary wording
- Prioritization based on existing facts

## AI is not allowed to own

- Invoice totals
- Payment amounts
- Reservation status
- Invoice status
- Finance ledger writes

## Required contract

Every meaningful AI feature should have:

1. Stable input shape
2. Zod-validated output
3. Adapter boundary to the provider
4. Safe failure mode
5. Persistence if the output matters to the product

## Important files

```text
agents/customer-service/agent.js
src/lib/services/feedback.ts
src/lib/services/ai-actions.ts
src/lib/services/ai-summaries.ts
src/lib/schemas/feedback-ai.ts
```

## Common mistakes

- Building AI on mock facts
- Calling the provider directly from route handlers
- Letting prompts replace domain rules
