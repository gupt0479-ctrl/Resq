# TinyFish and Agent Playbook

This is the canonical guide for TinyFish-backed behavior in OpsPilot Rescue.

## TinyFish role in the product

TinyFish is the external investigation layer. It helps the system:

- search public financing sources
- fetch lender or quote pages
- optionally run one multi-step extraction pass
- support collections with external signals when useful

## Auth split

Two TinyFish auth paths exist and must never be conflated.

### MCP in Kiro or IDE tools

- OAuth 2.1
- endpoint: `https://agent.tinyfish.ai/mcp`

### App runtime REST

- header: `X-API-Key`
- official surfaces:
  - Search: `https://api.search.tinyfish.ai`
  - Fetch: `https://api.fetch.tinyfish.ai`
  - Agent: `https://agent.tinyfish.ai/v1/automation/run`

## Required three-mode behavior

Every TinyFish-backed route or helper must support:

- `mock`
- `misconfigured`
- `live`

### `mock`

- deterministic fixtures only
- no network calls

### `misconfigured`

- live intent is on
- required config is missing
- return a typed warning, not a crash

### `live`

- real TinyFish call attempted
- may still degrade to fixture-backed output when a substep fails

## Financing scout is the hero flow

The only required live external lane is financing scout.

### Required sequence

1. Search for lender or financing pages
2. Fetch top candidate pages
3. Normalize offer data into the app contract
4. Optionally use Agent for one multi-step extraction if needed
5. Fall back cleanly if live data is weak or unavailable

### Stable financing output contract

Financing output must remain understandable to both UI and judges.

Each offer should preserve:

- `lender`
- `product`
- `aprPercent`
- `termMonths`
- `maxAmountUsd`
- `decisionSpeed`
- `sourceUrl`
- `sourceTitle`
- `confidence`

At the route or run level, preserve:

- `mode`
- `degradedFromLive`
- `warning`

### Route contract

- `POST /api/tinyfish/demo-run` with `{"scenario":"financing"}` should expose
  `data.mode`, `data.degradedFromLive`, `data.warning`, and
  `data.result.outputs.offers`.
- `POST /api/tinyfish/demo-run` with `{"scenario":"full_survival_scan"}` may
  keep vendor and insurance fixture-backed, but the nested financing branch
  should still preserve `offers`, `mode`, `degradedFromLive`, and `warning`
  under `data.result.outputs.financing`.
- `GET /api/tinyfish/health` is a mode/config probe. It should not pretend to
  know whether a future live run will degrade. Degraded truth belongs to
  executed runs.

### Additive progress endpoints

The repo also includes additive TinyFish cookbook endpoints for progress UX:

- `POST /api/tinyfish/run-sse`
- `POST /api/tinyfish/run-async`
- `GET /api/tinyfish/poll/[runId]`

Rules:

- they do not replace `demo-run`
- they must preserve the same `mock` / `misconfigured` / `live` posture
- `run-sse` should emit a local `MODE` event before forwarding live upstream
  SSE bytes unchanged
- `run-async` and `poll/[runId]` remain stateless at the app layer

Current status:

- backend support exists
- frontend rescue flow still needs explicit wiring if judges are meant to see
  live streaming or async progress instead of a spinner

## What not to build first

- full browser-session automation
- login-heavy flows
- lender submission flows
- broad vendor live scraping
- insurance live automation beyond seeded proof

## Audit rule

TinyFish helps investigate and normalize. It does not own financial truth.

Every meaningful agent result should remain auditable through `ai_actions`.
