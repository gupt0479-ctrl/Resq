# Invoice And Finance Playbook

Use for invoice generation, payment handling, receivables, or ledger correctness.

## Core promise

Money flows must be deterministic and auditable.

## Hard rules

- Invoice totals are computed in code, never by AI
- `mark-paid` must create exactly one revenue transaction
- Overdue and aging derive from invoice facts
- Finance APIs must return safe zero states on empty data
- Idempotency matters in both app code and SQL where possible

## Important files

```text
src/lib/domain/invoice-calculator.ts
src/lib/domain/status-guards.ts
src/lib/services/invoices.ts
src/lib/services/finance.ts
src/lib/queries/finance.ts
```

## When changing finance behavior

Check:

1. State transition clarity
2. Organization scoping
3. Idempotency guarantees
4. Query output shape
5. Seed/demo coverage

## Common mistakes

- Generating money amounts from prompts or freeform text
- Writing finance rows directly from routes or webhooks
- Treating `sent` and `pending` as interchangeable everywhere
- Forgetting to update seed or docs after contract changes
