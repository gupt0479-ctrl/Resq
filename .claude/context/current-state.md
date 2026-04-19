# Current State

Updated: 2026-04-18

## Submission posture

The repo is already in the right product shell for **OpsPilot Rescue**, an
autonomous SMB survival agent. The main work is no longer inventing the
product; it is tightening the hero flow, stabilizing TinyFish financing output,
and removing agent-doc noise.

## What is already real and reusable

- Supabase-backed invoices and finance transactions
- deterministic invoice generation and mark-paid flows
- rescue queue route and rescue run route
- receivables investigation with TinyFish-backed external signals
- workflow timeline and integrations page
- AI action logging via `ai_actions`
- Kiro workspace MCP config, steering mirror, and shared workspace skill
- test, lint, and build pipeline

## What the winning demo must show

`cash stress -> rescue queue -> survival scan -> financing options -> vendor/insurance proof -> auditable timeline`

## Current priorities

1. freeze the financing scout contract
2. keep the rescue queue as the main working surface
3. keep collections as supporting proof
4. keep vendor/insurance as believable supporting output
5. clean `.claude` so agents read one coherent story
6. keep `.kiro/steering` as a thin mirror only
7. keep Kiro hooks/specs and AWS docs minimal, real, and team-usable

## Current blockers

- do not let multiple TinyFish client variants coexist
- do not let archived `.claude` files remain in the active read path
- do not let Kiro workspace guidance drift away from `.claude` canon
- do not present AWS as a core feature before the survival scan is solid

## Accepted demo gaps

- no real money movement
- no real lending origination
- no production-grade vendor procurement flow
- no authenticated browser-heavy financing workflow unless it becomes trivial
- some legacy restaurant model names may remain behind the scenes

## Do not rebuild

- invoice calculation logic
- finance transaction creation
- webhook dedupe and dispatch
- stable Supabase schema contracts
- basic route/service/query layering

## Canonical references

- Product truth: `PRD.md`
- Architecture: `context/architecture.md`
- Execution plan: `context/12hour-execution.md`
- Demo operations: `../docs/rescue-demo-runbook.md`
