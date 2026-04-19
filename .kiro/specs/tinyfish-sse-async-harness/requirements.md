# Requirements Document

## Introduction

This feature adds three TinyFish cookbook patterns to OpsPilot Rescue that close the gap between the existing synchronous, spinner-based agent calls and a judge-visible, live-progress experience:

1. **SSE streaming proxy** — a `/api/tinyfish/run-sse` route that proxies TinyFish's `/v1/automation/run-sse` endpoint and streams server-sent events to the browser so judges see live agent steps instead of a blank spinner.
2. **Async run + poll harness** — a pair of routes (`/api/tinyfish/run-async` and `/api/tinyfish/poll/[runId]`) that start a long-running survival scan without blocking the HTTP connection, then let the UI poll with exponential backoff for incremental progress.
3. **Structured goal prompts** — an improved `runFinancingAgentAssist` goal string that follows the TinyFish cookbook pattern (handle popups → navigate → extract → return strict JSON schema) so the agent reliably returns machine-readable financing offers.

All changes are additive. Existing routes, the financing contract, invoice logic, and the finance ledger are untouched. Every new path supports mock, misconfigured, and live modes.

## Glossary

- **SSE_Proxy**: The Next.js route handler at `/api/tinyfish/run-sse` that forwards a TinyFish SSE stream to the browser.
- **Async_Harness**: The pair of route handlers (`/api/tinyfish/run-async` and `/api/tinyfish/poll/[runId]`) that manage non-blocking agent runs.
- **Poll_Handler**: The route handler at `/api/tinyfish/poll/[runId]` that returns the current status and partial result of an async run.
- **Goal_Builder**: The function inside `client.ts` that constructs the structured goal string passed to `runFinancingAgentAssist`.
- **TinyFish_Client**: The existing module at `src/lib/tinyfish/client.ts`.
- **TinyFish_RunId**: The `run_id` returned by TinyFish's `/v1/automation/run-async` API, used directly as the opspilot `runId` in poll responses. No in-process mapping is required.
- **TinyFish_Mode**: One of `live`, `mock`, or `misconfigured`, as defined in `TinyFishModeSchema`.
- **Survival_Scan**: The `full_survival_scan` scenario that orchestrates financing, vendor, and insurance sub-scans and takes 30–60 s in live mode.
- **Financing_Agent_Assist**: The internal function `runFinancingAgentAssist` in `client.ts` that calls the TinyFish automation endpoint when search/fetch yields no offers.

---

## Requirements

### Requirement 1: SSE Streaming Proxy Route

**User Story:** As a judge watching the demo, I want to see live agent step updates stream into the UI as the agent works, so that I can verify the system is doing real multi-step work rather than waiting behind a spinner.

#### Acceptance Criteria

1. THE SSE_Proxy SHALL expose a `POST /api/tinyfish/run-sse` endpoint that accepts a JSON body containing at minimum `url` (string) and `goal` (string).
2. WHEN the TinyFish_Mode is `live`, THE SSE_Proxy SHALL forward the request to `https://agent.tinyfish.ai/v1/automation/run-sse` with the `X-API-Key` header and stream the raw SSE bytes to the browser response.
3. WHEN the TinyFish_Mode is `mock`, THE SSE_Proxy SHALL emit a deterministic sequence of at least three synthetic SSE events (e.g. `step`, `step`, `done`) with a short artificial delay between each, without making any network call.
4. WHEN the TinyFish_Mode is `misconfigured`, THE SSE_Proxy SHALL emit a single SSE `error` event containing a human-readable message and then close the stream, without crashing the server.
5. THE SSE_Proxy SHALL set the response `Content-Type` header to `text/event-stream` and `Cache-Control` to `no-cache` for all three modes.
6. IF the upstream TinyFish SSE connection drops or returns a non-2xx status in live mode, THEN THE SSE_Proxy SHALL emit a final SSE `error` event describing the failure and close the stream cleanly.
7. THE SSE_Proxy SHALL not modify or re-validate the content of individual SSE events; it passes bytes through as received from TinyFish.

---

### Requirement 2: Async Run Initiation Route

**User Story:** As a developer integrating the survival scan, I want to start a long-running agent task without blocking the HTTP connection, so that the UI remains responsive during the 30–60 s scan.

#### Acceptance Criteria

1. THE Async_Harness SHALL expose a `POST /api/tinyfish/run-async` endpoint that accepts a JSON body containing at minimum `url` (string) and `goal` (string).
2. WHEN the TinyFish_Mode is `mock`, THE Async_Harness SHALL return `{ runId: "mock_run_001", status: "PENDING", mode }` with HTTP 202 immediately, without making any outbound network call.
3. WHEN the TinyFish_Mode is `misconfigured`, THE Async_Harness SHALL return `{ runId: "misconfigured_run_001", status: "FAILED", error: "...", mode }` with HTTP 202, without making any outbound network call.
4. WHEN the TinyFish_Mode is `live`, THE Async_Harness SHALL POST to `https://agent.tinyfish.ai/v1/automation/run-async` with the `X-API-Key` header, read the `run_id` from the response, and return `{ runId: run_id, status: "PENDING", mode }` with HTTP 202.
5. THE Async_Harness SHALL NOT maintain any in-process Run_Store or Map; the TinyFish_RunId returned by TinyFish's API is used directly as the `runId` so that subsequent polls go to TinyFish's API without local state.

---

### Requirement 3: Async Poll Route

**User Story:** As a frontend developer, I want to poll for the status and partial result of an async run, so that I can show incremental progress and the final result without long-polling or websockets.

#### Acceptance Criteria

1. THE Poll_Handler SHALL expose a `GET /api/tinyfish/poll/[runId]` endpoint that accepts a `runId` path parameter via `ctx: { params: Promise<{ runId: string }> }`.
2. WHEN the TinyFish_Mode is `mock`, THE Poll_Handler SHALL return HTTP 200 with `{ runId, status: "COMPLETED", startedAt, completedAt, result: { ok: true, fixture: true }, mode }` using the provided `runId`.
3. WHEN the TinyFish_Mode is `misconfigured`, THE Poll_Handler SHALL return HTTP 200 with `{ runId, status: "FAILED", error: "...", mode }`.
4. WHEN the TinyFish_Mode is `live`, THE Poll_Handler SHALL GET `https://agent.tinyfish.ai/v1/runs/${encodeURIComponent(runId)}` with the `X-API-Key` header and return a stable shape: `{ runId, status, result, error, mode, raw }`.
5. IF the upstream TinyFish poll request returns a non-2xx status, THEN THE Poll_Handler SHALL return HTTP 502 with `{ runId, status: "FAILED", error: "...", mode }`.
6. THE Poll_Handler SHALL include a `mode` field in every response reflecting the active TinyFish_Mode.

---

### Requirement 4: Structured Goal Prompt for Financing Agent Assist

**User Story:** As a developer, I want the `runFinancingAgentAssist` goal prompt to follow the TinyFish cookbook pattern, so that the agent reliably navigates to the financing page, handles popups, and returns a strict JSON schema that the existing normalizer can parse without guessing.

#### Acceptance Criteria

1. THE Goal_Builder SHALL construct a goal string with exactly four numbered steps: STEP 1 handle any cookie consent or popup overlays before interacting with page content, STEP 2 navigate to the primary financing or loan product section of the target URL, STEP 3 extract all available financing offers, STEP 4 return strict JSON only with no surrounding prose.
2. THE Goal_Builder SHALL include an explicit JSON schema in the goal string specifying the required output structure: an `offers` array where each element contains `lender`, `product`, `aprPercent`, `termMonths`, `maxAmountUsd`, `decisionSpeed`, and `notes`.
3. THE Goal_Builder SHALL instruct the agent to use `null` for any field it cannot find and to not invent values.
4. THE Goal_Builder SHALL instruct the agent to return only the JSON object as its final output, with no surrounding prose.
5. WHEN the agent response is received, THE TinyFish_Client SHALL check if `payload.result` is a string and, IF so, SHALL attempt `JSON.parse` on it before passing the value to `normalizeAgentFinancingOffers`; IF parsing fails, THE TinyFish_Client SHALL pass the raw string value without throwing.
6. THE Goal_Builder changes SHALL be confined to the `runFinancingAgentAssist` function in `client.ts` and SHALL NOT alter the `TinyFishFinancingOutputsSchema`, the `TinyFishFinancingOfferSchema`, or any route handler contract.

---

### Requirement 5: Three-Mode Compliance for All New Paths

**User Story:** As a developer running the demo in a safe environment, I want every new TinyFish route and helper to respect the existing mock/misconfigured/live mode system, so that the demo never crashes due to missing credentials.

#### Acceptance Criteria

1. THE SSE_Proxy, THE Async_Harness, and THE Poll_Handler SHALL each read TinyFish_Mode from the existing `getTinyFishMode()` helper in `src/lib/env.ts` and SHALL NOT introduce a separate mode-detection mechanism.
2. WHEN TinyFish_Mode is `mock`, THE SSE_Proxy, THE Async_Harness, and THE Poll_Handler SHALL each return deterministic, fixture-backed responses without making any outbound network call.
3. WHEN TinyFish_Mode is `misconfigured`, THE SSE_Proxy, THE Async_Harness, and THE Poll_Handler SHALL each return a typed error response (or SSE error event) containing a human-readable message sourced from the existing `missingLiveConfigMessage` pattern.
4. THE SSE_Proxy, THE Async_Harness, and THE Poll_Handler SHALL each include a `mode` field (or SSE event field) in their responses so the caller can distinguish live from degraded output.
5. THE new routes SHALL NOT alter the behavior or response shape of `GET /api/tinyfish/health` or `POST /api/tinyfish/demo-run`.

---

### Requirement 6: Additive-Only Constraint

**User Story:** As a team member maintaining the existing demo, I want all new code to be strictly additive, so that the existing financing contract, invoice logic, and finance ledger remain stable.

#### Acceptance Criteria

1. THE new routes and helpers SHALL be added as new files or appended exports and SHALL NOT modify the existing `TinyFishFinancingOutputsSchema`, `TinyFishFinancingOfferSchema`, `TinyFishAgentRunResultSchema`, or `TinyFishSearchResultSchema`.
2. THE new routes SHALL NOT modify the existing `/api/tinyfish/health` or `/api/tinyfish/demo-run` route handlers.
3. THE new routes SHALL NOT modify any invoice, finance ledger, or Supabase mutation service.
4. IF the Goal_Builder change in `client.ts` requires modifying `runFinancingAgentAssist`, THEN THE change SHALL be limited to the goal string construction and the JSON pre-parse step, leaving all other logic in that function unchanged.
