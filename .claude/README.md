# OpsPilot Project Memory

This folder is the repo-local memory and execution guide for OpsPilot.

It is written to be tool-agnostic. Any assistant, extension, or editor automation should be able to read these files directly and recover project context without depending on Claude-specific agent or skill mechanics.

## How To Use This Folder

1. Read `PRD.md` for the full product brief.
2. Read `context/current-state.md` to understand what is already implemented and how it compares to `origin/main`.
3. If you are about to pull or merge, read `context/remote-main-and-merge.md`.
4. Read `context/keyword-map.md` and then jump to the most relevant playbook for the current prompt.
5. Before editing, read the matching file under `checklists/`.
6. After finishing a substantial change, update `decisions/decision-log.md` or append to `PRD.md` if the change affects long-term product truth.

## Folder Layout

- `PRD.md`
  Product source of truth. Never delete or replace content; only append clarifications.
- `context/`
  Stable project memory: architecture, current implementation, keyword routing, **remote merge posture**, and **external review cross-checks**.
- `playbooks/`
  Task-specific guidance for backend, Supabase, finance, UI, AI, and integrations.
- `checklists/`
  Short operational checklists to run before or after changes.
- `workflows/`
  Canonical demo workflow and build order.
- `decisions/`
  Running log of engineering decisions and lessons learned.

## Global Rules

- Postgres/Supabase is the system of record.
- Route handlers and services own deterministic business logic.
- AI may summarize, classify, draft, or prioritize. AI must not own invoice totals, status transitions, or ledger mutations.
- Webhooks and integrations must reuse the same service layer as first-party routes.
- UI labels should stay restaurant-specific even if internal table names remain generic.
- Prefer improving existing files and contracts over adding parallel patterns.
