# OpsPilot Rescue Canonical Agent Docs

This folder is the **only canonical agent-facing source of truth** for the hackathon build.

If a file is not in the read order below, it is either:

- non-canonical support material
- human reference only
- archived historical context that agents should ignore unless explicitly asked

## Canonical read order

1. `PRD.md` — canonical product spec including pain points and positioning
2. `context/product-vision.md` — expanded problem space and roadmap context
3. `context/current-state.md`
4. `context/architecture.md`
5. `context/12hour-execution.md`
6. `playbooks/tinyfish-and-agent.md`
7. `playbooks/backend-and-api.md`
8. `playbooks/ui-and-demo.md`
9. `playbooks/supabase-and-data.md`
10. `checklists/change-gate.md`
11. `checklists/demo-readiness.md`
12. `decisions/decision-log.md`

## Setup companions

Read these when the task touches local operations rather than product doctrine:

- `../docs/rescue-demo-runbook.md`
- `../docs/kiro-tinyfish-setup.md`
- `../docs/apprunner-deploy.md`

## Rules for agents

- Build **one sharp agentic fintech product**, not a broad SMB suite.
- Treat `.claude` as canonical and `.kiro/steering` as a thin mirror only.
- Ignore `.claude/archive/` unless a human explicitly asks for historical context.
- Preserve deterministic finance and invoice truth.
- Keep TinyFish mock mode available at all times.
- Prefer the narrowest implementation that strengthens the 90-second and 5-minute demo.

## Current winner story

OpsPilot Rescue helps a small business survive cash pressure by:

1. exposing overdue receivables and rescue risk
2. running a survival scan
3. surfacing financing options with source links and warnings
4. adding vendor or insurance savings proof
5. logging an auditable agent timeline

## What agents should not do

- Do not use archived docs as active requirements.
- Do not broaden scope beyond collections, financing scout, and vendor/insurance optimization.
- Do not treat Kiro steering files as a second source of truth.
