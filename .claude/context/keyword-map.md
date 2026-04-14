# Keyword Map

Use this file when a prompt is broad or ambiguous.

## Routing

- Supabase, migration, seed, schema, SQL, RLS
  Read: `context/current-state.md`, `playbooks/supabase-and-data.md`, `playbooks/backend-and-api.md`

- Invoice, payment, paid, revenue, ledger, finance, overdue
  Read: `workflows/restaurant-core-demo.md`, `playbooks/invoice-and-finance.md`, `checklists/mutation-checklist.md`

- Dashboard, KPI, page wiring, real data, mock removal
  Read: `context/current-state.md`, `playbooks/ui-and-read-models.md`, `checklists/demo-readiness.md`

- Webhook, connector, MCP, n8n, OpenTable, Square, dedupe
  Read: `playbooks/integrations-and-webhooks.md`, `playbooks/backend-and-api.md`

- AI, summary, classification, feedback, recovery
  Read: `playbooks/ai-features.md`, `context/architecture.md`, `checklists/ai-change-checklist.md`

- Bug, refactor, cleanup, rewrite
  Read: `context/current-state.md`, `context/architecture.md`, `decisions/decision-log.md`, `checklists/change-planning.md`

- Demo, judge, story, pitch
  Read: `workflows/restaurant-core-demo.md`, `context/current-state.md`, `checklists/demo-readiness.md`

- Merge, `origin/main`, teammate sync
  Read: `context/remote-main-and-merge.md`, `context/current-state.md`

## Tie-breakers

- Finance rules beat convenience
- Real-data rules beat mock speed
- Deterministic workflow rules beat AI experimentation
