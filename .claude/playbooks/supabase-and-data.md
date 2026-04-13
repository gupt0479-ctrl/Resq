# Supabase And Data Playbook

Use this file when working on Supabase setup, SQL, migrations, seeds, or data contracts.

Keywords:

- supabase
- migration
- seed
- sql
- schema
- table
- index
- data
- rls

## Current Data Foundations

Existing files:

- `supabase/migrations/0001_core_ledger.sql`
- `supabase/seed.sql`
- `src/lib/seed/run.ts`

These already encode the first milestone domain model. Prefer extending them over creating parallel setup paths.

## Data Principles

- all business tables must carry `organization_id` where appropriate
- `finance_transactions` is a first-class table, not a derived afterthought
- seed data must represent believable demo states, not placeholder rows
- status values must match the workflow vocabulary exactly

## Migration Rules

- migrations should be additive and explicit
- add indexes for query paths that already exist in services or queries
- protect idempotency in the database when possible with unique or partial unique indexes
- if a route depends on uniqueness, encode that guarantee in SQL as well as in code

## Seed Rules

- seed should produce a believable demo, not just syntactically valid data
- include rows for each major UI state the demo depends on
- include at least one completed workflow path that proves the ledger works
- update README examples if seed ids or seed scenarios change

## Supabase Setup Expectations

Before calling the app “working,” make sure:

- env vars are present in `.env.local`
- migration is applied to a real project
- seed is loaded successfully
- pages render against live Supabase data
- write flows mutate the same project you seeded

## Common Mistakes To Avoid

- mock data still powering milestone-1 pages
- seed data that does not match current route behavior
- missing unique indexes for dedupe or idempotency guarantees
- silent drift between SQL schema, Zod contracts, and service assumptions
