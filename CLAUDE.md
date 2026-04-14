# OpsPilot Agent Brief

## Current mission

Hackathon submission mode. Optimize for demo reliability, not feature expansion.

The only story that must work end to end is:

`reservation -> invoice -> payment -> finance -> feedback -> recovery`

## Read order

1. `.claude/PRD.md`
2. `.claude/context/current-state.md`
3. `.claude/context/6hour-status.md`
4. The relevant playbook or checklist for the task

## What is already done

Do not rebuild these unless there is a confirmed bug:

- Appointment completion flow
- Invoice generation and mark-paid path
- Finance transaction creation
- Feedback ingestion and AI analysis pipeline
- Integration webhook ingress and dedupe
- Dashboard, appointments, invoices, finance, feedback, integrations
- Theme system and shared light/dark toggle

## What to prioritize

1. Demo-critical bug fixes
2. Supabase connection and seed verification
3. UI polish that improves judge comprehension
4. Documentation accuracy for handoff

## What not to spend time on

- New modules
- Broad refactors
- Renaming the domain model
- Replacing working service/query code
- Feature-complete inventory, marketing, or performance systems

## Core rules

- Supabase/Postgres is the source of truth
- Services own deterministic mutations
- Queries own UI-facing shaping
- AI may classify, summarize, and draft
- AI must not own invoice totals, invoice status, reservation status, or finance ledger writes
- Webhooks must reuse the same service layer as UI actions

## Key files

```text
src/lib/services/appointments.ts
src/lib/services/invoices.ts
src/lib/services/finance.ts
src/lib/services/feedback.ts
src/lib/services/integrations.ts
src/lib/queries/dashboard.ts
src/lib/queries/feedback.ts
agents/customer-service/agent.js
supabase/migrations/0001_core_ledger.sql
supabase/migrations/002_invoice_reminders.sql
supabase/migrations/004_feedback_domain.sql
```

## Verification baseline

```bash
npm run lint
npx tsc --noEmit
npm run test
npm run build
```

## Demo script

1. Show `/dashboard`
2. Complete an appointment on `/appointments`
3. Show the resulting invoice
4. Mark it paid
5. Show the finance ledger update
6. Submit a negative review on `/feedback`
7. Show the flagged issue and approve the follow-up

## If you are changing docs

- Keep `PRD.md` as the canonical product source of truth
- Keep supporting docs concise
- Prefer status clarity over exhaustive history
- Update only the files a teammate or agent would realistically read next
