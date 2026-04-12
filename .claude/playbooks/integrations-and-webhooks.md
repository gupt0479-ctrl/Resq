# Integrations And Webhooks Playbook

Use this file when working on connectors, webhook routes, n8n flows, external payloads, or MCP-style normalization.

Keywords:

- webhook
- integration
- connector
- square
- opentable
- sync
- payload
- external_event_id
- dedupe
- n8n

## Integration Philosophy

External systems may trigger domain behavior, but they do not own domain truth.

The correct sequence is:

1. receive external payload
2. validate payload
3. store raw payload
4. dedupe
5. normalize into internal meaning
6. call the same service layer used by the UI

## Existing Files

- `src/lib/schemas/integrations.ts`
- `src/lib/services/integrations.ts`
- `src/app/api/integrations/webhooks/[provider]/route.ts`

## Required Guarantees

- raw payload remains stored for audit/debugging
- duplicate external events do not create duplicate business mutations
- webhook processing does not bypass appointment/invoice/finance services
- provider-specific payload weirdness is normalized at the edge

## Supported Contract Shape

The current webhook layer accepts both:

- camelCase
- snake_case

Examples:

- `externalEventId` or `external_event_id`
- `eventType` or `event_type`
- `data` or `payload`

## Common Mistakes To Avoid

- directly inserting invoice or finance rows from webhook handlers
- using payload shape as the internal domain contract
- marking events processed without performing or recording dispatch results
