# OpsPilot Rescue Agent Brief

## Current mission

Hackathon execution mode for O1 Summit 2026.

The product to ship is:

`Autonomous SMB survival agent = collections + financing scout + vendor/insurance optimization`

The product must feel clearly fintech, clearly agentic, and clearly worth
paying for.

## Read order

1. `.claude/PRD.md`
2. `.claude/context/current-state.md`
3. `.claude/context/6hour-status.md`
4. `docs/rescue-demo-runbook.md`
5. Relevant playbook / checklist

## Product boundaries

AI may:

- investigate
- compare
- prioritize
- summarize
- recommend next-best actions
- trigger demo-safe agent workflows

AI must not own:

- invoice totals
- invoice status truth
- finance ledger truth
- deterministic money mutation rules

## What is already valuable

- invoice and finance foundations
- Supabase data model
- integrations shell
- AI action logging
- dashboard shell and workflow timeline

## What is no longer the main story

- reservation management
- restaurant operations as the core pitch
- feedback recovery as the headline feature
- broad ops dashboards

## Priorities

1. Demo-critical survival-agent surfaces
2. TinyFish scaffolding and reliability
3. Demo data consistency
4. Deployment and submission readiness
5. Documentation accuracy

## Do not spend time on

- large schema renames
- broad refactors
- polishing non-demo routes
- speculative features outside the three core survival pillars

## Verification baseline

```bash
npm run lint
npx tsc --noEmit
npm run test
npm run build
bash scripts/demo-smoke.sh
```
