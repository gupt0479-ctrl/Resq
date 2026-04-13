# Backend And API Playbook

Use this file when working on route handlers, services, schemas, or domain mutations.

Keywords:

- backend
- route
- api
- service
- validation
- mutation
- contract
- zod

## Desired Pattern

For any backend feature, prefer this order:

1. define or confirm enum and schema vocabulary
2. add or update domain rules if needed
3. implement or update service-layer mutation/query behavior
4. keep route handlers thin
5. update UI read model or API response contract
6. verify with lint, TypeScript, and build

## Route Handler Rules

- route handlers live under `src/app/api/**/route.ts`
- validate request input early
- preserve `organization_id` scoping on every query
- do not put business logic directly in route handlers
- return UI-safe error responses, not raw internal stack traces

## Service Rules

- services own state transitions
- services own deterministic downstream writes
- services should be reusable from both routes and webhooks
- if a side effect must happen for both UI and integration flows, it belongs in the service layer

## Query Rules

- read-model modules should shape UI-ready payloads
- avoid repeated mapping code inside pages and routes
- if multiple consumers need the same payload shape, add or update a query module

## Schema Rules

- Zod schemas should mirror stable contracts
- DB-facing shapes can be snake_case
- UI-facing/API shapes should usually be camelCase
- `src/lib/constants/enums.ts` and `src/lib/schemas/*.ts` are preferred sources of truth

## Common Mistakes To Avoid

- direct Supabase mutations inside route handlers
- mixed casing conventions in one contract
- route logic that duplicates service logic
- UI pages reading raw DB row shapes directly
- inventing new enum strings without updating canonical files
