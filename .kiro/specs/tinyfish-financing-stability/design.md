# Design: TinyFish Financing Lane Stability

## Scope

Tighten the existing TinyFish adapter and its docs without broadening product
scope.

## Key decisions

- use official TinyFish surfaces only: Search, Fetch, Agent
- use `X-API-Key` for REST auth and keep MCP auth separate
- validate the financing output contract in shared schemas
- keep fallback behavior explicit instead of silently mixing live and fixture data

## Verification

- `npm run lint`
- `npx tsc --noEmit`
- `npm run test`
- `npm run build`
- `bash scripts/demo-smoke.sh` when the local dev server is running
