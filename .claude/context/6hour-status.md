# 6-Hour Status

Updated: 2026-04-14

## TL;DR

The project is functionally demo-ready. Focus only on:

1. Supabase project setup or verification
2. End-to-end demo rehearsal
3. Small polish fixes that improve reliability or judge clarity

## Core workflow that must work

1. Complete reservation
2. Generate invoice
3. Mark invoice paid
4. Create finance transaction
5. Submit negative review
6. Flag issue and surface recovery action
7. Approve follow-up

## Important files

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
supabase/seed.sql
```

## Environment checklist

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`

## Final verification

```bash
npm run lint
npx tsc --noEmit
npm run test
npm run build
```

## Demo checklist

- `/dashboard` shows meaningful data
- `/appointments` can complete an active reservation
- `/invoices` can mark a target invoice paid
- `/finance` reflects the payment
- `/feedback` can ingest and resolve a review scenario

## Known acceptable gaps

- Drafted messages are not actually sent
- Public review approval does not post externally
- Inventory and performance remain partial/demo surfaces
