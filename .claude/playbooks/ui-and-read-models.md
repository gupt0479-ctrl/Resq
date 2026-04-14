# UI And Read Models Playbook

Use for dashboard pages, KPI cards, list pages, or replacing mocks with live data.

## UI goal

The UI should prove the backend workflow is real.

## Hard rules

- Pages should consume stable, UI-ready data
- Repeated shaping belongs in query modules
- Keep restaurant-specific language in the UI
- Do not present fake AI behavior as real
- High-attention states must be visually obvious

## Important files

```text
src/lib/queries/dashboard.ts
src/lib/queries/appointments.ts
src/lib/queries/invoices.ts
src/lib/queries/finance.ts
src/lib/queries/feedback.ts
src/app/dashboard/
src/app/appointments/
src/app/invoices/
src/app/finance/
src/app/feedback/
```

## Demo requirement

At least one visible page should make each core workflow stage obvious:

- reservation status progression
- invoice creation and payment state
- finance ledger truth
- feedback issue and recovery flow
- dashboard summary of what matters now

## Common mistakes

- Reintroducing ad hoc mock transforms
- Bypassing query modules in pages
- Empty states that hide a broken backend connection
