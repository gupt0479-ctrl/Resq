# OpsPilot Rescue

OpsPilot Rescue is an autonomous SMB survival agent for the O1 Summit 2026
hackathon. The product helps small businesses stay alive during cash stress by
combining three agentic workflows:

1. Collections and receivables recovery
2. Financing scout
3. Vendor and insurance optimization

The demo is built for the Fintech track and is optimized around the event's hard
agentic-AI requirement: the system must take multi-step actions, use tools and
APIs, and make decisions without waiting for a human at each step.

## Product story

Small businesses do not usually fail because they lack dashboards. They fail
because cash arrives late, vendor costs rise, insurance renewals jump, and the
owner has no time to investigate options across disconnected tools.

OpsPilot Rescue detects survival risk, investigates live context, and produces
or executes next-best actions:

- recover overdue cash faster
- surface financing options before payroll pressure hits
- detect vendor cost spikes and cheaper alternatives
- flag insurance renewals that threaten cash flow

## Demo pillars

### 1. Collections

- detect overdue and at-risk receivables
- investigate invoice and payment context
- recommend or trigger the next recovery step

### 2. Financing Scout

- gather financing options from external sources
- normalize terms for quick comparison
- recommend the best short-term survival option

### 3. Vendor / Insurance Optimization

- compare vendor pricing and detect spikes
- highlight insurance renewal risk
- show concrete savings opportunities

## Why this repo exists

This repo started as a broader small-business operations demo. For this
hackathon, it is being narrowed into a single agentic fintech product.

We are intentionally reusing the existing strengths:

- deterministic invoices
- deterministic finance ledger writes
- Supabase-backed operational data
- integration connector and webhook infrastructure
- UI shell and audit timeline

We are intentionally de-emphasizing:

- restaurant-specific storytelling
- feedback as the primary product story
- broad inventory or operations scope
- generic dashboard breadth

## Hackathon constraints

- Event: O1 Summit 2026
- Build window: 24 hours
- Submission deadline: 11:00 AM, Sunday April 19
- Team size assumption in planning: 4 builders
- Judging: technical execution, market readiness, overall product quality
- Sponsor stack targets: TinyFish, AWS, Kiro

## Stack

### Product/runtime

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Postgres
- Zod 4

### Agentic / sponsor stack

- TinyFish for web-agent search, fetch, browser, and agent execution
- AWS for deployability and optional artifact storage
- Kiro for spec-mode planning and agent skill packaging
- Codex / Cursor / Claude Code for implementation speed

## Architecture rules

- Supabase/Postgres is the system of record.
- Deterministic services own invoice, status, and ledger mutations.
- Query modules own UI-facing read models.
- AI may investigate, summarize, prioritize, and propose actions.
- AI must not own invoice totals, status transitions, or finance truth.
- External tools must never bypass the deterministic service layer.
- Mock mode must remain available for demo safety.

## Repo truth

Read these first:

1. [.claude/PRD.md](./.claude/PRD.md)
2. [.claude/context/current-state.md](./.claude/context/current-state.md)
3. [.claude/context/6hour-status.md](./.claude/context/6hour-status.md)
4. [docs/rescue-demo-runbook.md](./docs/rescue-demo-runbook.md)

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill values.

Minimum required for local development:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DEMO_ORG_ID=00000000-0000-0000-0000-000000000001
```

Demo-safe TinyFish mode:

```env
TINYFISH_ENABLED=false
TINYFISH_USE_MOCKS=true
DEMO_MODE=true
```

3. Apply SQL in order:

- `supabase/migrations/0001_core_ledger.sql`
- `supabase/migrations/0002_appointments_extras.sql`
- `supabase/migrations/002_invoice_reminders.sql`
- `supabase/migrations/0003_inventory_shipments.sql`
- `supabase/migrations/004_feedback_domain.sql`
- `supabase/seed.sql`
- `supabase/seed_survival_demo.sql`

4. Start the app:

```bash
npm run dev
```

## Primary demo flow

The current winning demo story is:

1. Open the app and show cash pressure.
2. Show overdue receivables and agent urgency.
3. Run the survival agent.
4. Show financing options normalized into a usable comparison.
5. Show vendor spike detection and lower-cost alternatives.
6. Show insurance renewal risk.
7. Show the resulting agent audit trail.

The legacy restaurant data model may still appear in parts of the codebase.
That is acceptable. The product narrative is now SMB survival, not restaurant
operations.

## Important paths

```text
src/app/                      App routes and pages
src/app/api/                  API handlers
src/lib/services/             Deterministic mutation logic
src/lib/queries/              UI-facing read models
src/lib/domain/               Core business rules
src/lib/tinyfish/             TinyFish client and fixtures
src/lib/aws/                  Optional AWS helpers
supabase/migrations/          Schema and migrations
supabase/seed.sql             Base demo seed
supabase/seed_survival_demo.sql  Survival-agent addon seed
.claude/                      Canonical product memory and playbooks
docs/                         Demo and deployment runbooks
specs/                        Kiro/spec-mode artifacts
```

## Verification baseline

```bash
npm run lint
npx tsc --noEmit
npm run test
npm run build
bash scripts/demo-smoke.sh
```

## Current build strategy

We are not rebuilding the app from scratch. We are cleaning and narrowing it.

Keep:

- invoices
- finance
- integrations
- ai action timeline
- Supabase schema foundations

Hide or de-emphasize:

- broad restaurant-specific copy
- non-critical inventory breadth
- non-critical feedback breadth
- broad operational navigation

## Source-of-truth docs for agents

- Product truth: `.claude/PRD.md`
- Delivery status: `.claude/context/current-state.md`
- Fast handoff: `.claude/context/6hour-status.md`
- Runbook: `docs/rescue-demo-runbook.md`
- Kiro spec: `specs/smb-survival-agent-spec.md`
- Kiro skill: `.kiro/skills/smb-survival-agent/SKILL.md`

## Non-goals

- Full ERP
- Full accounting platform
- Production-grade lending marketplace
- Real outbound automation to every external tool
- Broad multi-vertical polish beyond the hackathon demo
