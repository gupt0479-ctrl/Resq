# Supabase and Data Playbook

## Data strategy

Use the existing Supabase schema as the foundation. Additive change is the
default. Broad renames are not worth the risk during the hackathon.

## Seed order

1. base migrations
2. base seed
3. survival-agent addon seed

Canonical demo addon:

- `supabase/seed_survival_demo.sql`

## Demo data goals

- obvious cash pressure
- at least one overdue receivable
- financing option outputs
- vendor or insurance optimization outputs
- a believable agent timeline

## Data safety rules

- do not create fragile FK chains unnecessarily
- prefer additive ai-action rows over risky invoice rewrites
- keep seeds idempotent where possible
- keep rescue queue shaping in query/read-model code where possible

## Environment rules

- `DEMO_ORG_ID` must match seeded data
- TinyFish mock mode should work with zero external secrets
- live mode must be explicit, never assumed

## Deterministic ownership

Postgres and deterministic services own:

- invoices
- finance transactions
- payment state
- rescue status transitions that affect truth

AI and TinyFish may influence:

- ranking
- summaries
- prioritization
- external offer extraction
- recommended next actions
