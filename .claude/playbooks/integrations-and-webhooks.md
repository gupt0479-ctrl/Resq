# Integrations And Webhooks Playbook

Use for connector state, webhook routes, MCP ingress, or external payload normalization.

## Required flow

1. Receive payload
2. Validate payload
3. Store raw payload
4. Dedupe retries
5. Normalize into internal meaning
6. Dispatch through the same services used by UI actions

## Hard rules

- External systems do not own domain truth
- Webhooks must not write invoices or finance rows directly
- Provider-specific shape stays at the edge
- Dispatch results should be auditable

## Important files

```text
src/app/api/integrations/webhooks/[provider]/route.ts
src/lib/services/integrations.ts
src/lib/schemas/integrations.ts
```

## Accepted input aliases

- `externalEventId` or `external_event_id`
- `eventType` or `event_type`
- `data` or `payload`

## Common mistakes

- Treating webhook payload shape as the internal contract
- Bypassing the service layer
- Marking events processed without real dispatch or audit data
