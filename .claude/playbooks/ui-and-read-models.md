# UI And Read Models Playbook

Use this file when changing dashboard pages, list pages, KPI cards, detail views, or page data contracts.

Keywords:

- dashboard
- ui
- page
- card
- list
- detail
- kpi
- real data
- mocks
- read model

## Goal

The UI should prove that the backend workflow is real. A judge should see actual reservations, invoices, finance state, and integration status backed by the database.

## Required Pattern

- pages should consume stable, UI-ready data shapes
- route handlers should not leak raw DB row shapes if the UI needs transformed data
- repeated mapping belongs in query modules, not spread across pages

## Existing Query Layer

Use and extend:

- `src/lib/queries/dashboard.ts`
- `src/lib/queries/appointments.ts`
- `src/lib/queries/invoices.ts`
- `src/lib/queries/finance.ts`

## UI Rules

- keep restaurant language in labels and empty states
- do not show fake “AI” elements that are not backed by data or clearly marked as deferred
- make high-attention states obvious: overdue invoices, pending receivables, failed connectors

## Demo Rules

At least one visible page or card must always demonstrate each core workflow stage that exists in the backend.

Examples:

- **dashboard** -> KPIs, AI briefing, **MCP bridge & connectors** card, **Feedback & recovery** spotlight, finance snapshot where applicable (PRD §1.2)
- reservations page -> status progression
- invoices page -> sent, pending, overdue, paid
- finance page -> ledger and receivables
- dashboard -> KPIs from real data

## Common Mistakes To Avoid

- reintroducing local mock transformations
- pages bypassing query modules to stitch data ad hoc
- vague empty states that hide a broken backend connection
