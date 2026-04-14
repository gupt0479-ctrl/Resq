# Supabase And Data Playbook

Use for migrations, seeds, schema changes, or environment setup.

## Data rules

- Supabase/Postgres is the source of truth
- Business tables should carry `organization_id` where appropriate
- `finance_transactions` is first-class, not derived later
- Seed data must reflect believable demo states
- Status vocabulary must match the real workflow

## Important files

```text
supabase/migrations/0001_core_ledger.sql
supabase/migrations/002_invoice_reminders.sql
supabase/migrations/004_feedback_domain.sql
supabase/seed.sql
supabase/seed_feedback_addon.sql
src/lib/seed/run.ts
```

## Migration rules

- Prefer additive changes
- Add indexes for real query paths
- Encode uniqueness and idempotency in SQL when possible
- Keep SQL, Zod contracts, and services aligned

## Seed rules

- Include real demo states, not filler rows
- Include a completed finance-proof path
- Keep README examples aligned with seed behavior

## Before calling the app ready

- `.env.local` is valid
- Migrations are applied to the target Supabase project
- Seed data is loaded
- Pages render against live data
- Writes hit the same project that was seeded
