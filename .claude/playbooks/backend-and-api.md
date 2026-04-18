# Backend and API Playbook

## Style rules

- Route handlers validate and delegate.
- Services own mutations.
- Queries own read-model shaping.
- New agent routes should be additive, not invasive.

## Route style

Follow the house pattern:

- success: `Response.json({ data })`
- error: `Response.json({ error }, { status })`

For TinyFish routes:

- export `runtime = "nodejs"`
- export `dynamic = "force-dynamic"`

## TinyFish route rules

- never assume unverified live endpoint paths
- keep mock mode as the default safe path
- return typed failure or misconfiguration states
- logging failure must not break the route

## Logging

Use `recordAiAction` for auditability when appropriate, but:

- provide a valid UUID for `entity_id`
- treat logging as best-effort in demo routes

## What not to touch casually

- invoice generation flow
- finance row creation
- webhook dedupe behavior
- stable schema assumptions in Supabase
