# Architecture Snapshot

This file describes the intended architecture as of the current codebase. Update it when patterns change materially.

## Product Shape

OpsPilot is a restaurant operations app for the demo brand Ember Table. The product is meant to prove one believable operational flow, not a general chatbot:

1. reservation exists
2. reservation is completed
3. invoice is generated deterministically
4. invoice is sent or pending
5. payment creates exactly one revenue ledger row
6. finance views update from database truth
7. AI later summarizes facts or drafts recovery actions

## Source Of Truth

- Supabase/Postgres is the source of truth for domain state.
- Route handlers call service modules.
- Service modules own state transitions and deterministic side effects.
- Query modules shape UI-ready read models.
- AI is downstream of facts, never upstream of money or workflow truth.

## Current Layering

### Database / Supabase

- `supabase/migrations/0001_core_ledger.sql`
- `supabase/seed.sql`

Core tables include:

- `organizations`
- `customers`
- `staff`
- `services`
- `appointments`
- `appointment_events`
- `invoices`
- `invoice_items`
- `finance_transactions`
- `integration_connectors`
- `integration_sync_events`

### Server Access

- `src/lib/env.ts`
- `src/lib/db/supabase-server.ts`

These are server-only and should not leak service role credentials into client bundles.

### Domain Rules

- `src/lib/domain/invoice-calculator.ts`
- `src/lib/domain/status-guards.ts`

These files are the deterministic core for invoice math and state transitions.

### Services

- `src/lib/services/appointments.ts`
- `src/lib/services/invoices.ts`
- `src/lib/services/finance.ts`
- `src/lib/services/integrations.ts`

Rules:

- mutations belong here, not in route handlers
- webhook-driven mutations must also land here
- finance writes must be idempotent where required

### Read Models

- `src/lib/queries/dashboard.ts`
- `src/lib/queries/appointments.ts`
- `src/lib/queries/invoices.ts`
- `src/lib/queries/finance.ts`

Rules:

- these files exist to shape UI-ready payloads
- pages and routes should prefer them over ad hoc mapping
- keep read shaping separate from mutation services

### Schemas And Enums

- `src/lib/constants/enums.ts`
- `src/lib/schemas/*.ts`

Rules:

- DB vocabulary and Zod schemas are the authority
- `src/lib/types/index.ts` is a compatibility layer for UI-facing types, not the source of truth

## Integration Boundary

External systems such as OpenTable or Square should:

1. send a webhook
2. have the raw payload stored
3. dedupe on external event id
4. normalize into an internal domain event or command
5. call the same services as first-party UI routes

They must not write invoices or finance rows directly.

## AI Boundary

Allowed:

- classification
- drafting
- explanation
- prioritization
- summaries

Forbidden:

- invoice totals
- amount calculations
- finance ledger writes
- reservation or invoice status ownership
