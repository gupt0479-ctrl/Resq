# Keyword Map

Use this file first when a prompt is vague or broad. Match prompt keywords to the right project memory files before editing code.

## If The Prompt Mentions Supabase, Database, Migration, Seed, Schema, SQL, RLS

Read:

- `context/current-state.md`
- `playbooks/supabase-and-data.md`
- `playbooks/backend-and-api.md`
- `checklists/change-planning.md`

## If The Prompt Mentions Invoice, Billing, Payment, Paid, Revenue, Ledger, Finance

Read:

- `workflows/restaurant-core-demo.md`
- `playbooks/invoice-and-finance.md`
- `context/architecture.md`
- `checklists/mutation-checklist.md`

## If The Prompt Mentions Dashboard, KPI, Cards, Page Wiring, UI Data, Real Data, Mock Removal

Read:

- `context/current-state.md`
- `playbooks/ui-and-read-models.md`
- `playbooks/backend-and-api.md`
- `checklists/demo-readiness.md`

## If The Prompt Mentions Webhook, Connector, MCP, n8n, OpenTable, Square, Sync, Payload, Dedupe

Read:

- `playbooks/integrations-and-webhooks.md`
- `playbooks/backend-and-api.md`
- `checklists/mutation-checklist.md`

## If The Prompt Mentions AI, Summary, Feedback Classification, Recovery Action, Orchestrator

Read:

- `playbooks/ai-features.md`
- `context/architecture.md`
- `checklists/ai-change-checklist.md`

## If The Prompt Mentions Bug, Refactor, Rewrite, Cleanup, Prevent Mistakes, Best Pattern

Read:

- `context/current-state.md`
- `context/architecture.md`
- `decisions/decision-log.md`
- `checklists/change-planning.md`

## If The Prompt Mentions Merge Conflict, origin/main, Behind Main, Pull, Rebase, Teammate Sync

Read:

- `context/remote-main-and-merge.md`
- `context/current-state.md`
- `context/external-review-codex-2026-04.md` (if reconciling an external audit)

## If The Prompt Mentions Demo, Judge, Pitch, Story, Vertical Slice, Believability

Read:

- `workflows/restaurant-core-demo.md`
- `context/current-state.md`
- `checklists/demo-readiness.md`

## If Multiple Areas Match

Read the files from both areas and prefer the stricter guardrail. Example:

- finance + webhook -> the invoice/finance rules win over convenience
- UI + dashboard -> read-model and real-data rules win over mock speed
- AI + finance -> finance determinism wins over AI experimentation
