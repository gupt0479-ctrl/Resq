# Architecture Snapshot

## Product shape

OpsPilot is a restaurant operations app for the Ember Table demo. The app is built to prove one believable operational loop, not a general chatbot.

## System rules

- Supabase/Postgres is the source of truth
- Route handlers validate and delegate
- Services own deterministic mutations and side effects
- Queries shape UI-ready read models
- AI is downstream of facts, never upstream of money or workflow truth

## Main flow

1. Reservation exists
2. Reservation completes
3. Invoice is created deterministically
4. Payment marks the invoice paid
5. Finance ledger updates exactly once
6. Feedback is analyzed and surfaced for action
7. Dashboard summarizes what needs attention

## Core code paths

- `src/lib/domain/`
  Deterministic business rules
- `src/lib/services/`
  Mutation logic and side effects
- `src/lib/queries/`
  Read models for pages and APIs
- `src/app/api/`
  Route handlers
- `agents/customer-service/`
  Review analysis and recovery drafting

## Forbidden AI ownership

- Invoice totals
- Amount calculations
- Reservation status transitions
- Invoice status transitions
- Finance ledger writes

## Integration rule

External webhooks must:

1. Store raw payloads
2. Dedupe retries
3. Normalize into internal commands
4. Call the same services as first-party UI actions
