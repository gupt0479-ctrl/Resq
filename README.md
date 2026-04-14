# OpsPilot

OpsPilot is an AI operations dashboard for the restaurant demo brand Ember Table. The demo proves one end-to-end manager workflow:

`reservation completed -> invoice generated -> payment recorded -> finance updated -> feedback analyzed -> recovery action surfaced`

## What ships in the demo

- Dashboard with KPIs, AI briefing, feedback spotlight, and connector status
- Appointments workflow with completion, cancel, and reschedule actions
- Deterministic invoice generation and mark-paid flow
- Finance summary and transaction ledger
- Feedback intake, AI analysis, flagging, and follow-up approval
- Integration webhook ingress that reuses the same domain services as UI actions
- Shared light/dark theme with persisted preference and animated toggle

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Postgres
- Zod 4
- Claude-powered customer service agent

## Repo truth

- Product source of truth: [.claude/PRD.md](./.claude/PRD.md)
- Current execution status: [.claude/context/current-state.md](./.claude/context/current-state.md)
- Fastest agent handoff: [.claude/context/6hour-status.md](./.claude/context/6hour-status.md)

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` with real credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
DEMO_ORG_ID=00000000-0000-0000-0000-000000000001
```

3. Apply Supabase SQL in order:

- `supabase/migrations/0001_core_ledger.sql`
- `supabase/migrations/002_invoice_reminders.sql`
- `supabase/migrations/004_feedback_domain.sql`

4. Load demo data:

- `supabase/seed.sql`
- Optional addon only if needed: `supabase/seed_feedback_addon.sql`

5. Verify and run:

```bash
npm run lint
npx tsc --noEmit
npm run test
npm run build
npm run dev
```

## Demo flow

1. Open `/dashboard`
2. Go to `/appointments` and complete an `in_progress` reservation
3. Check `/workflow` or `/invoices` for the generated invoice
4. Mark an invoice paid on `/invoices`
5. Confirm the revenue row on `/finance`
6. Submit a negative review on `/feedback`
7. Approve the suggested follow-up and confirm the issue resolves

## Key architecture rules

- Supabase is the system of record
- Route handlers validate; services own mutations
- Query modules shape UI-ready read models
- AI can classify, summarize, and draft
- AI must not own invoice totals, state transitions, or ledger writes
- Webhooks must dispatch through the same service layer as first-party routes

## Important paths

```text
src/app/                      Next.js routes and pages
src/app/api/                  Route handlers
src/lib/services/             Deterministic mutation logic
src/lib/queries/              UI-facing read models
src/lib/domain/               Core business rules
src/components/               Shared UI and page sections
agents/customer-service/      Review analysis and follow-up drafting
supabase/migrations/          Schema and domain migrations
supabase/seed.sql             Demo dataset
.claude/                      Product memory, playbooks, and workflows
```

## Submission status

Current baseline is production-submission ready for the hackathon demo:

- `npm run lint` passes
- `npx tsc --noEmit` passes
- `npm run test` passes
- `npm run build` passes

Known acceptable demo gaps:

- No real outbound email or SMS sending
- No public review posting automation
- Inventory/performance agents are not fully integrated
- Receipt upload and OCR are deferred
