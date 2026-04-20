# Architecture Snapshot

## Product shape

Resq is an agentic fintech product built on top of an existing
small-business operations codebase. The app is not a generic chatbot and not a
full ERP. It is a focused survival decision system.

## System rules

- Supabase/Postgres is the source of truth.
- Route handlers validate and delegate.
- Services own deterministic mutations and side effects.
- Queries shape UI-ready read models.
- AI works downstream of facts.

## Main survival flow

1. internal financial context indicates pressure
2. the system identifies a rescue case
3. the agent investigates using internal data plus external tools
4. the product surfaces financing / collections / vendor / insurance actions
5. the outcome is written back into `ai_actions` and related views

## Code layers

- `src/lib/domain/`
  Deterministic business rules
- `src/lib/services/`
  Mutation logic and financial truth
- `src/lib/queries/`
  UI-facing read-model shaping
- `src/lib/tinyfish/`
  TinyFish client, schemas, and mock fixtures
- `src/lib/aws/`
  Optional artifact storage helpers
- `src/app/api/`
  Route handlers, including agent scaffolding

## Forbidden AI ownership

- invoice totals
- finance ledger writes
- invoice status truth
- deterministic payment math
- irreversible business truth without deterministic validation

## Allowed AI ownership

- investigation
- summarization
- ranking and prioritization
- option comparison
- demo-safe external tool orchestration

## TinyFish rule

TinyFish is a first-class part of the hackathon architecture, but the system
must remain demo-safe:

1. mock mode available at all times
2. live mode fully env-gated
3. route handlers must not crash if live config is incomplete
4. financing scout is the only required live external lane
5. vendor and insurance may remain seeded during hybrid live mode

## Integration rule

External inputs and agent outputs must remain auditable:

1. log connector state
2. normalize incoming or outgoing actions
3. write auditable `ai_actions`
4. preserve deterministic service boundaries

## Public contract freeze

### `/api/tinyfish/health`

Must distinguish:

- `mock`
- `misconfigured`
- `live`

### `/api/tinyfish/demo-run`

Must remain the judge-facing survival-scan route.

For financing, the returned output must stay stable around:

- `offers[]`
- `lender`
- `product`
- `aprPercent`
- `termMonths`
- `maxAmountUsd`
- `decisionSpeed`
- `sourceUrl`
- `sourceTitle`
- `confidence`
- `mode`
- `degradedFromLive`
- `warning`
