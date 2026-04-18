# Current State

Updated: 2026-04-17

## Submission posture

The repo is in active pivot mode from the earlier restaurant-oriented OpsPilot
demo into **OpsPilot Rescue**, an autonomous SMB survival agent.

## What is already real and reusable

- Supabase-backed invoices and finance transactions
- deterministic invoice generation and mark-paid flows
- integration connector and webhook infrastructure
- AI action logging via `ai_actions`
- dashboard shell, finance page, invoice page, workflow timeline
- test, lint, and build pipeline

## What is currently being changed

- product narrative and documentation
- navigation and page emphasis
- TinyFish scaffolding and mock/live configuration
- rescue-focused demo seed data
- AWS/Kiro sponsor-readiness artifacts

## Working demo target

The must-win story is:

`cash stress -> survival scan -> financing options -> vendor/insurance savings -> auditable agent output`

## Verified baseline

The historical baseline was already passing:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run test`
- `npm run build`

Re-run these after each major batch of changes.

## What still matters before submission

1. finish documentation and handoff cleanup
2. finish TinyFish scaffolding with reliable mock mode
3. finalize survival-demo seed and runbook
4. wire the rescue-specific UI around the new agent outputs
5. rehearse private and public demo scripts
6. prepare a backup recording

## Accepted demo gaps

- no real money movement
- no real lending origination
- no production-grade vendor procurement workflow
- no full insurance binding flow
- some legacy restaurant model names may remain behind the scenes

## Do not rebuild

- invoice calculation logic
- finance transaction creation
- webhook dedupe and dispatch
- stable Supabase schema contracts
- basic route/service/query layering

## Canonical references

- Product truth: `PRD.md`
- Fast handoff: `context/6hour-status.md`
- Architecture: `context/architecture.md`
- Demo operations: `../docs/rescue-demo-runbook.md`
