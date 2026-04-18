# OpsPilot Project Memory

This folder is the agent handoff layer for OpsPilot.

## Read this folder in order

1. `PRD.md` — canonical product spec including pain points and positioning
2. `context/product-vision.md` — expanded problem space and roadmap context
3. `context/current-state.md`
4. `context/6hour-status.md`
5. `context/keyword-map.md`
6. The matching `playbooks/`, `workflows/`, or `checklists/` file

## Folder purpose

- `PRD.md`
  Canonical product truth. Preserve history and append clarifications.
- `context/`
  Current implementation state, architecture, routing map, and merge notes.
- `playbooks/`
  Task-specific guidance by domain.
- `checklists/`
  Short execution and quality gates.
- `workflows/`
  Canonical demo and operating flows.
- `decisions/`
  Material engineering and product decisions.

## Project rules

- Supabase is the system of record
- Services own deterministic business logic
- Queries own read-model shaping
- AI may summarize, classify, draft, and prioritize
- AI must not own money, status transitions, or ledger truth
- Webhooks must reuse the same services as UI actions

## Deadline posture

Treat the project as demo-ready with limited remaining time. Optimize for:

1. Reliability
2. Clarity
3. Fast handoff
4. Minimal-risk polish
