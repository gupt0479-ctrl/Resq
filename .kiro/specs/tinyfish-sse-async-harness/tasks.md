# Implementation Plan: tinyfish-sse-async-harness

## Overview

Add three new Next.js route handlers and one targeted edit to `client.ts`. All changes are strictly additive — no existing routes, schemas, or services are touched. Each new path follows the existing `mock` / `misconfigured` / `live` three-mode pattern via `getTinyFishMode()`.

## Tasks

- [x] 1. SSE Streaming Proxy — `src/app/api/tinyfish/run-sse/route.ts`
  - [x] 1.1 Create the route file with `runtime = "nodejs"` and `dynamic = "force-dynamic"` exports
    - Implement `sseHeaders()` helper returning `Content-Type: text/event-stream` and `Cache-Control: no-cache`
    - Implement `encodeEvent(payload)` helper that serialises a payload as a `data: ...\n\n` SSE line
    - Implement `errorStream(mode, error)` helper that emits a `MODE` event then an `ERROR` event and closes
    - _Requirements: 1.5_

  - [x] 1.2 Implement body parsing and validation (runs before mode check)
    - Wrap `request.json()` in `try/catch`; on failure return `errorStream(mode, "Invalid JSON body")`
    - Validate `url` and `goal` are non-empty strings; on failure return `errorStream(mode, "url and goal are required")`
    - _Requirements: 1.1_

  - [x] 1.3 Implement mock mode branch
    - Emit `{ type: "MODE", mode: "mock" }` → 220 ms delay → `{ type: "STEP", index: 1, label: "mock_start" }` → 240 ms delay → `{ type: "STEP", index: 2, label: "mock_extract" }` → 240 ms delay → `{ type: "DONE" }`
    - No outbound `fetch` call
    - _Requirements: 1.3, 5.2_

  - [x] 1.4 Implement misconfigured mode branch
    - Call `healthCheck()` from `@/lib/tinyfish/client`; use `health.details` as the error message
    - Return `errorStream("misconfigured", msg)`
    - _Requirements: 1.4, 5.3_

  - [x] 1.5 Implement live mode branch
    - `fetch` upstream `https://agent.tinyfish.ai/v1/automation/run-sse` with `X-API-Key` header and `{ url, goal }` body
    - On success: `new Response(upstream.body, { headers: sseHeaders() })` — raw passthrough, no re-parsing
    - On upstream non-2xx: read body text, return `errorStream("live", \`upstream HTTP ${upstream.status}: ${text}\`)`
    - On `fetch` throw: return `errorStream("live", err.message)`
    - _Requirements: 1.2, 1.6, 1.7_

  - [x] 1.6 Write unit tests for SSE route (mock and misconfigured modes)
    - Assert mock mode emits exactly `MODE → STEP → STEP → DONE` in order
    - Assert misconfigured mode emits exactly one `ERROR` event
    - Assert all responses carry `Content-Type: text/event-stream` and `Cache-Control: no-cache`
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 1.7 Write property test — Property 1: SSE response headers are always correct
    - `// Feature: tinyfish-sse-async-harness, Property 1: SSE response headers are always correct`
    - `fc.property(fc.constantFrom("mock", "misconfigured"), async (mode) => { ... })`
    - Assert `Content-Type` and `Cache-Control` headers present for every mode
    - Minimum 100 iterations
    - _Requirements: 1.5_

  - [x] 1.8 Write property test — Property 5: Mock mode never makes outbound network calls
    - `// Feature: tinyfish-sse-async-harness, Property 5: Mock mode never makes outbound network calls`
    - Spy/mock global `fetch`; call SSE handler in mock mode with arbitrary `{ url, goal }`
    - Assert `fetch` was never called
    - Minimum 100 iterations
    - _Requirements: 5.2_

- [x] 2. Async Run Route — `src/app/api/tinyfish/run-async/route.ts`
  - [x] 2.1 Create the route file with `runtime = "nodejs"` and `dynamic = "force-dynamic"` exports
    - Parse and validate `url` and `goal` from JSON body; on failure return HTTP 400 `{ error: "url and goal are required" }`
    - _Requirements: 2.1_

  - [x] 2.2 Implement mock mode branch
    - Return HTTP 202 `{ runId: "mock_run_001", status: "PENDING", mode: "mock" }` — no outbound `fetch`
    - _Requirements: 2.2, 5.2_

  - [x] 2.3 Implement misconfigured mode branch
    - Call `healthCheck()`; use `health.details` as the error message
    - Return HTTP 202 `{ runId: "misconfigured_run_001", status: "FAILED", error: msg, mode: "misconfigured" }`
    - _Requirements: 2.3, 5.3_

  - [x] 2.4 Implement live mode branch
    - `POST https://agent.tinyfish.ai/v1/automation/run-async` with `X-API-Key` and `{ url, goal }` body
    - On success: read `run_id` from response JSON, return HTTP 202 `{ runId: run_id, status: "PENDING", mode: "live" }`
    - On upstream non-2xx: return HTTP 502 `{ runId: "error", status: "FAILED", error: "upstream HTTP {status}", mode: "live" }`
    - On `fetch` throw: return HTTP 502 `{ runId: "error", status: "FAILED", error: err.message, mode: "live" }`
    - No in-process run store — `run_id` from TinyFish is used directly
    - _Requirements: 2.4, 2.5_

  - [x] 2.5 Write unit tests for async run route (mock and misconfigured modes)
    - Assert mock returns `{ runId: "mock_run_001", status: "PENDING", mode: "mock" }` with HTTP 202
    - Assert misconfigured returns `{ runId: "misconfigured_run_001", status: "FAILED", mode: "misconfigured" }` with HTTP 202
    - _Requirements: 2.2, 2.3_

  - [x] 2.6 Write property test — Property 4: All handlers always include a mode field (async run)
    - `// Feature: tinyfish-sse-async-harness, Property 4: All handlers always include a mode field`
    - `fc.property(fc.constantFrom("mock", "misconfigured"), async (mode) => { ... })`
    - Assert `mode` field present in response body and matches active mode
    - Minimum 100 iterations
    - _Requirements: 5.4_

  - [x] 2.7 Write property test — Property 6: Misconfigured mode always returns non-empty error (async run)
    - `// Feature: tinyfish-sse-async-harness, Property 6: Misconfigured mode always returns non-empty error`
    - Call async run handler in misconfigured mode; assert `error` field is a non-empty string
    - Minimum 100 iterations
    - _Requirements: 5.3_

- [x] 3. Poll Handler — `src/app/api/tinyfish/poll/[runId]/route.ts`
  - [x] 3.1 Create the route file with `runtime = "nodejs"` and `dynamic = "force-dynamic"` exports
    - Resolve `runId` from `await ctx.params`; if missing return HTTP 400 `{ error: "runId is required" }`
    - _Requirements: 3.1_

  - [x] 3.2 Implement mock mode branch
    - Return HTTP 200 `{ runId, status: "COMPLETED", startedAt: <iso>, completedAt: <iso>, result: { ok: true, fixture: true }, mode: "mock" }`
    - _Requirements: 3.2, 5.2_

  - [x] 3.3 Implement misconfigured mode branch
    - Call `healthCheck()`; use `health.details` as the error message
    - Return HTTP 200 `{ runId, status: "FAILED", error: msg, mode: "misconfigured" }`
    - _Requirements: 3.3, 5.3_

  - [x] 3.4 Implement live mode branch
    - `GET https://agent.tinyfish.ai/v1/runs/${encodeURIComponent(runId)}` with `X-API-Key`
    - On success: return HTTP 200 `{ runId, status, result, error, mode: "live", raw }`
    - On upstream non-2xx: return HTTP 502 `{ runId, status: "FAILED", error: "upstream HTTP {status}", mode: "live" }`
    - On `fetch` throw: return HTTP 502 `{ runId, status: "FAILED", error: err.message, mode: "live" }`
    - _Requirements: 3.4, 3.5_

  - [x] 3.5 Write unit tests for poll handler (mock and misconfigured modes)
    - Assert mock returns `{ status: "COMPLETED", result: { ok: true, fixture: true } }` with HTTP 200
    - Assert misconfigured returns `{ status: "FAILED" }` with HTTP 200
    - Assert `mode` field present in both
    - _Requirements: 3.2, 3.3, 3.6_

  - [x] 3.6 Write property test — Property 3: Poll response always echoes runId
    - `// Feature: tinyfish-sse-async-harness, Property 3: Poll response always echoes runId`
    - `fc.property(fc.string({ minLength: 1 }), fc.constantFrom("mock", "misconfigured"), async (runId, mode) => { ... })`
    - Assert `response.runId === runId` for every input
    - Minimum 100 iterations
    - _Requirements: 3.2, 3.3, 3.5_

  - [x] 3.7 Write property test — Property 4: All handlers always include a mode field (poll)
    - `// Feature: tinyfish-sse-async-harness, Property 4: All handlers always include a mode field`
    - Call poll handler in mock and misconfigured modes; assert `mode` field present and matches
    - Minimum 100 iterations
    - _Requirements: 3.6, 5.4_

  - [x] 3.8 Write property test — Property 6: Misconfigured mode always returns non-empty error (poll)
    - `// Feature: tinyfish-sse-async-harness, Property 6: Misconfigured mode always returns non-empty error`
    - Call poll handler in misconfigured mode with arbitrary `runId`; assert `error` is a non-empty string
    - Minimum 100 iterations
    - _Requirements: 5.3_

- [x] 4. Checkpoint — Ensure all tests pass for the three new routes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Goal Prompt Edit — `src/lib/tinyfish/client.ts` (`runFinancingAgentAssist` only)
  - [x] 5.1 Replace the goal string in `runFinancingAgentAssist` with the 4-step cookbook pattern
    - STEP 1: handle cookie consent / popup overlays
    - STEP 2: navigate to primary financing or loan product section of `${url}`
    - STEP 3: extract all available financing offers
    - STEP 4: return strict JSON only — no surrounding prose, no markdown
    - Include explicit output schema: `{ "offers": [ { "lender", "product", "aprPercent", "termMonths", "maxAmountUsd", "decisionSpeed", "notes" } ] }`
    - Include `null` instruction and "do not invent values" instruction
    - All other logic in `runFinancingAgentAssist` and `runAutomationLive` is unchanged
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.4_

  - [x] 5.2 Add JSON pre-parse step before `normalizeAgentFinancingOffers`
    - After receiving `payload.result`, check `typeof resultValue === "string"`
    - If true, attempt `JSON.parse(resultValue)` inside `try/catch`; on failure pass raw string through
    - Pass `resultValue` (parsed or raw) to `normalizeAgentFinancingOffers`
    - _Requirements: 4.5_

  - [x] 5.3 Write property test — Property 7: Goal string always contains all four steps and required field names
    - `// Feature: tinyfish-sse-async-harness, Property 7: Goal string always contains all four steps and required field names`
    - Extract goal builder to a pure helper `buildGoalString(url: string): string` for testability
    - `fc.property(fc.webUrl(), (url) => { ... })` — assert `STEP 1`–`STEP 4` present and all seven field names present
    - Minimum 100 iterations
    - _Requirements: 4.1, 4.2_

  - [x] 5.4 Write property test — Property 8: JSON pre-parse never throws
    - `// Feature: tinyfish-sse-async-harness, Property 8: JSON pre-parse never throws`
    - `fc.property(fc.oneof(fc.string(), fc.jsonValue(), fc.constant(null)), (result) => { ... })`
    - Call the pre-parse logic inline; assert it never throws for any input
    - Minimum 100 iterations
    - _Requirements: 4.5_

- [x] 6. Integration tests for live mode paths
  - [x] 6.1 Write integration test — live SSE proxy passthrough
    - Mock upstream to return a fixed SSE byte sequence
    - Call SSE handler in live mode; assert response body bytes match upstream bytes unchanged
    - _Requirements: 1.2, 1.7_

  - [x] 6.2 Write integration test — live async run reads `run_id`
    - Mock upstream to return `{ run_id: "abc123" }`
    - Call async run handler in live mode; assert `runId: "abc123"` in response
    - _Requirements: 2.4_

  - [x] 6.3 Write integration test — live poll forwards upstream shape
    - Mock upstream to return `{ status: "COMPLETED", result: { foo: "bar" } }`
    - Call poll handler in live mode; assert `status: "COMPLETED"` and `result.foo === "bar"` in response
    - _Requirements: 3.4_

  - [x] 6.4 Write integration test — live poll upstream non-2xx returns HTTP 502
    - Mock upstream to return HTTP 500
    - Call poll handler in live mode; assert HTTP 502 response with `status: "FAILED"`
    - _Requirements: 3.5_

- [x] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All three new routes use `import "server-only"` is not required (they are route handlers), but must include `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"`
- `healthCheck()` is imported from `@/lib/tinyfish/client` — do not duplicate the misconfigured message logic
- No in-process run store anywhere — TinyFish `run_id` is the `runId` throughout
- SSE live mode is a raw passthrough — do not parse or re-validate individual events
- Property tests use `fast-check` with Vitest; tag each with the comment format shown above
- The goal string edit in task 5.1 is the only change to `client.ts`; all other functions are untouched
