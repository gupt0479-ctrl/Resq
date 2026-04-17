# Integrations and Webhooks Playbook

## Integration philosophy

Integrations exist to strengthen the survival-agent story, not to prove the app
can connect to everything.

## Keep

- connector health and status
- webhook dedupe
- normalized event handling
- auditable integration behavior

## Add

- TinyFish as a first-class connector in the product story
- demo-safe health and demo-run routes
- clear live vs mock behavior

## Connector rules

- `integration_connectors` is unique on `(organization_id, provider)`
- seed add-ons must upsert using that uniqueness
- display names should render correctly even if rows are created programmatically

## Webhook rules

- store raw payloads
- dedupe retries
- normalize provider events
- dispatch through deterministic services when they change business truth

## Demo guidance

The integrations page should help a judge understand:

- what external systems the agent depends on
- whether the system is in mock or live mode
- that failures degrade safely
