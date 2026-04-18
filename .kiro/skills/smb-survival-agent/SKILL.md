---
name: smb-survival-agent
description: Build and operate the OpsPilot Rescue hackathon product: an autonomous SMB survival agent focused on collections, financing scout, and vendor or insurance optimization.
---

# SMB Survival Agent Skill

## Mission

Ship and improve a single focused product:

**OpsPilot Rescue**

an autonomous SMB survival agent for the fintech hackathon track.

## Core pillars

1. Collections
2. Financing Scout
3. Vendor / Insurance Optimization

## Priority order

1. Financing Scout is the only required live external lane.
2. Collections proves the internal rescue story.
3. Vendor / Insurance optimization is supporting proof, not a parallel hero build.

## Operating rules

- preserve deterministic finance logic
- keep invoice totals, ledger truth, invoice status truth, and deterministic transitions out of AI mutation
- prefer additive changes
- keep TinyFish mock mode available
- optimize for judge comprehension over feature breadth

## Tool sequence

When working on a task:

1. read `.claude/README.md` and follow its canonical read order
2. identify which survival pillar the task supports
3. confirm whether the task changes deterministic truth or only agent behavior
4. implement the smallest credible change
5. verify lint, typecheck, tests, and demo path

## First files to inspect

### TinyFish work

- `src/lib/tinyfish/client.ts`
- `src/lib/tinyfish/mock-data.ts`
- `src/lib/tinyfish/schemas.ts`
- `src/app/api/tinyfish/demo-run/route.ts`
- `src/app/api/tinyfish/health/route.ts`

### Rescue and workflow UI

- `src/app/rescue/page.tsx`
- `src/app/rescue/RescueClient.tsx`
- `src/app/workflow/page.tsx`
- `src/app/integrations/page.tsx`
- `src/app/dashboard/page.tsx`

### Docs and setup

- `docs/rescue-demo-runbook.md`
- `docs/kiro-tinyfish-setup.md`
- `docs/apprunner-deploy.md`

## Source of truth

- `.claude` is canonical for product intent, execution plan, and guardrails
- `.kiro/steering` is a mirror for quick orientation only
- archived docs under `.claude/archive/` are non-canonical and should not drive implementation

## Fallback behavior

If live integrations are uncertain:

- switch to mock mode
- keep outputs deterministic
- preserve the product story

## Demo-safe constraints

- the app must never require unverified live TinyFish endpoints to demo
- the audit trail must remain visible
- the system should always be able to explain what the agent did
