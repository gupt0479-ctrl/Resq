# Backend and API Playbook

## Core rules

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
- never let live TinyFish failure crash the route
- preserve `mode`, `degradedFromLive`, and `warning` honestly

## What route handlers may do

- validate input
- delegate to services or TinyFish client helpers
- return typed success or failure
- best-effort audit logging

## What route handlers must not do

- own business logic
- mutate deterministic finance state directly
- assume live external config exists
- hide degraded behavior from the caller

## Audit logging

Use `recordAiAction` when the route performs meaningful agent work, but:

- provide a valid UUID for `entity_id`
- treat logging as best-effort in demo routes
- do not 500 the route because audit logging failed

## What not to touch casually

- invoice generation flow
- finance row creation
- webhook dedupe behavior
- stable schema assumptions in Supabase
