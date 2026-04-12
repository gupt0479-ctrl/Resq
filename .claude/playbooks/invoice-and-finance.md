# Invoice And Finance Playbook

Use this file for anything involving invoice generation, invoice status changes, payment handling, finance summaries, or ledger correctness.

Keywords:

- invoice
- finance
- paid
- mark-paid
- revenue
- ledger
- receivables
- overdue
- aging
- billing

## Core Promise

OpsPilot must look like software, not theater. That means money truth is deterministic and auditable.

## Hard Rules

- invoice line items come from DB-backed pricing or explicit saved order data
- invoice totals are computed in code, never by AI
- `mark-paid` must create exactly one revenue transaction
- aging and overdue state derive from invoice facts
- finance summaries must tolerate an empty database and return safe zero states

## Existing Code To Reuse

- `src/lib/domain/invoice-calculator.ts`
- `src/lib/domain/status-guards.ts`
- `src/lib/services/invoices.ts`
- `src/lib/services/finance.ts`
- `src/lib/queries/finance.ts`

## When Adding Or Changing Finance Logic

Check all of these:

1. does the database guarantee match the application guarantee
2. does the status transition remain explicit
3. does the API preserve organization scope
4. does the query layer still return UI-ready data
5. does the seed still demonstrate the scenario

## Idempotency Expectations

At minimum, protect:

- `mark-paid`
- payment webhooks
- revenue transaction creation

Use both:

- application checks
- DB uniqueness where practical

## Common Mistakes To Avoid

- generating invoice amounts from prompts or freeform text
- creating finance rows directly from routes or webhooks without services
- assuming `sent` and `pending` are interchangeable in every query
- forgetting to update README and seed examples when finance contracts change
