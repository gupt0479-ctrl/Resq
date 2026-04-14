# Backend And API Playbook

Use for route handlers, services, schemas, and deterministic mutations.

## Preferred order

1. Confirm enums and schema vocabulary
2. Update domain rules if needed
3. Implement or adjust the service layer
4. Keep route handlers thin
5. Update query or response contracts
6. Re-run verification

## Hard rules

- Route handlers validate early
- Services own mutations and state transitions
- Queries own read-model shaping
- Preserve `organization_id` scope on every DB path
- Return safe errors, not raw internal failures

## Important files

```text
src/app/api/
src/lib/services/
src/lib/queries/
src/lib/schemas/
src/lib/constants/enums.ts
src/lib/domain/
```

## Common mistakes

- Direct Supabase mutations in route handlers
- Duplicate business logic across routes and services
- Mixing raw DB shapes into UI contracts
- Inventing new enum values without updating canonical files
