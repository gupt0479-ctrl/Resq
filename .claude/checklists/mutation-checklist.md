# Mutation Checklist

Run this after changing any route, service, webhook, or SQL path that mutates business state.

## Verify

- request input is validated
- `organization_id` scope is preserved
- status transitions are explicit
- deterministic side effects happen in the service layer
- idempotency is handled where retries are realistic
- audit/event rows are written when the workflow depends on them
- routes stay thin and reusable services do the real work
- no AI call was introduced into a deterministic mutation path

## Extra Checks For Finance

- paid invoice still produces exactly one revenue row
- empty/fresh DB states still return safe summary output
- no duplicate ledger write can happen from retry paths
