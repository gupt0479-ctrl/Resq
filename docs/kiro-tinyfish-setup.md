# Kiro + TinyFish Setup

This is the fastest stable setup for the TinyFish financing-scout lane.

## What lives where

- Kiro workspace MCP config: `.kiro/settings/mcp.json`
- Repo-level compatibility MCP config: `.mcp.json`
- Shared Kiro local agent: `.kiro/agents/resq.json`
- Shared hook commands: `.kiro/hooks/`
- Shared starter specs: `.kiro/specs/`
- App runtime TinyFish auth: `.env.local`

Kiro MCP and app runtime auth are different:

- MCP tools use OAuth against `https://agent.tinyfish.ai/mcp`
- App routes use `TINYFISH_API_KEY` against TinyFish REST APIs

## Shared MCP servers

The committed workspace config includes only the shared, low-friction servers:

- `tinyfish`
- `tinyfish-docs`
- `aws-knowledge-mcp-server`

It intentionally does **not** include personal or secret-bound servers such as
Obsidian, GitHub, or local filesystem tools.

## Kiro setup

1. Install Kiro and sign in.
2. Open this workspace in Kiro.
3. Enable MCP support in Kiro settings.
4. Switch to the local `resq` agent if your Kiro build exposes local agents.
5. Open the MCP panel and confirm the TinyFish and AWS servers appear.
6. Trigger a TinyFish tool once.
7. Complete the OAuth browser flow for TinyFish.

The shared local agent now preloads the core `.claude` canon plus the
workspace skill metadata through its `resources` field, which matches Kiro's
documented custom-agent behavior.

## Hooks and specs

This repo keeps Kiro guidance narrow on purpose:

- `.claude` is canonical for product truth and guardrails.
- `.kiro/steering` is only a thin mirror.
- `.kiro/hooks/` contains shared hook commands for canon reminders, secret
  hygiene, and demo-safety reminders.
- `.kiro/specs/` contains two small starter specs:
  - financing lane stability
  - rescue demo polish

Official Kiro docs describe hooks primarily through the Hook UI and local agent
configuration. This repo includes the shared commands and a local agent config
so the team can reuse the same setup without turning Kiro into a second canon.

TinyFish OAuth works best when you are already signed in to both of these in your default browser:

- `claude.ai`
- `agent.tinyfish.ai`

## TinyFish runtime setup

Add this to `.env.local` when you are ready to try live mode:

```env
TINYFISH_ENABLED=true
TINYFISH_USE_MOCKS=false
TINYFISH_API_KEY=your_real_tinyfish_key
TINYFISH_AGENT_BASE_URL=https://agent.tinyfish.ai
TINYFISH_SEARCH_BASE_URL=https://api.search.tinyfish.ai
TINYFISH_FETCH_BASE_URL=https://api.fetch.tinyfish.ai
TINYFISH_AGENT_PATH=/v1/automation/run
```

For safe demo mode:

```env
TINYFISH_ENABLED=false
TINYFISH_USE_MOCKS=true
```

## Verification

Run the health route:

```bash
curl -s http://localhost:3000/api/tinyfish/health | jq
```

Expected outcomes:

- `mode: "mock"` when mocks are active
- `mode: "misconfigured"` when live intent is on but `TINYFISH_API_KEY` is missing
- `mode: "live"` when official TinyFish REST config is ready

Important:

- `/api/tinyfish/health` is a mode/config probe.
- Degraded-from-live truth is surfaced on executed runs such as
  `/api/tinyfish/demo-run`.

Run the financing scout:

```bash
curl -s -X POST http://localhost:3000/api/tinyfish/demo-run \
  -H "Content-Type: application/json" \
  -d '{"scenario":"financing"}' | jq
```

What to look for:

- `data.mode`
- `data.degradedFromLive`
- `data.warning`
- `data.result.outputs.offers`

For cookbook-style live progress, the repo also exposes additive TinyFish routes:

```bash
curl -N -X POST http://localhost:3000/api/tinyfish/run-sse \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","goal":"Return JSON only"}'

curl -s -X POST http://localhost:3000/api/tinyfish/run-async \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","goal":"Return JSON only"}' | jq

curl -s http://localhost:3000/api/tinyfish/poll/<runId> | jq
```

These routes are additive helpers for frontend progress UX:

- `run-sse` streams TinyFish progress with an initial local `MODE` event
- `run-async` starts a long-running run and returns a `runId`
- `poll/[runId]` checks run status without local server-side state

Important:

- The rescue UI does not consume these endpoints automatically yet.
- The judge-facing hero flow still runs through the existing rescue and demo-run surfaces until frontend wiring is added.

For the full survival scan, the financing branch remains visible under:

- `data.result.outputs.financing.offers`
- `data.result.outputs.financing.mode`
- `data.result.outputs.financing.degradedFromLive`
- `data.result.outputs.financing.warning`

## Current live scope

Live TinyFish work is currently focused on:

1. Search financing sources
2. Fetch lender or quote pages
3. Normalize financing offers into the app output
4. Optionally use one TinyFish Agent pass if search/fetch is too sparse

Vendor and insurance flows remain demo-safe fixtures during hybrid live mode.
