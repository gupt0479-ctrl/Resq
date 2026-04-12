# Current State

Single source of truth for **what exists in this repo right now** and **how it relates to `origin/main`**. Update this after every major merge or when you commit large untracked work.

## Git posture (authoritative)

- **Branch:** `mcp-bridges` at commit `4c43603` (merge of PR #11 — static `src/lib/data/*` for inventory/shipments).
- **`origin/main`:** `a0f7f9d`, **8 commits ahead** of that tip (PRs #12–#15 and follow-up edits). Your checkout has **not** merged those commits.
- **Tracked vs untracked:** Only `.claude/PRD.md` is tracked under `.claude/`. The rest of `.claude/`, `supabase/`, and most new `src/lib/*` + API/pages from the “ledger + dashboard” slice are **untracked** until you add and commit them.

## Two parallel backend stories (until you merge)

1. **Committed `mcp-bridges` tip:** Inventory and shipments APIs/pages use **in-memory** modules under `src/lib/data/`.
2. **`origin/main`:** Same surface area moved to **`src/lib/supabase/client.ts`** + **`queries.ts`**; static data files removed or reduced; new UI such as inventory edit dialog.
3. **Local uncommitted/untracked work:** Appointments, invoices, finance, integrations, dashboard APIs and pages; **`src/lib/db/supabase-server.ts`** (service role); domain + services + query modules; `supabase/migrations` + `seed.sql`.

Until you integrate `origin/main`, treat these as **three layers** that must be reconciled, not one stack.

## Verified commands (this environment, latest run)

All succeeded on the current working tree:

- `npm run lint`
- `npx tsc --noEmit`
- `npx next build --webpack`

Plain `next build` (Turbopack) may fail in some sandboxes; prefer `--webpack` for CI parity when needed.

## Product and PRD alignment

- **PRD / architecture** describe **Ember Table** as the demo restaurant; several UI strings and data files still say **Bistro Nova** — cosmetic drift, not a runtime bug.
- See `context/external-review-codex-2026-04.md` for a line-by-line cross-check of a recent external audit against `origin/main` and this tree.

## Merge and teammate sync

Read **`context/remote-main-and-merge.md`** before `git merge origin/main` or `git rebase` — it lists files that will conflict and recommended ordering.

## High-priority follow-through

- Merge or rebase **`origin/main`** with a deliberate choice for inventory/shipment data layer (Supabase vs static).
- Commit `.claude/` and `supabase/` when stable so teammates and CI see the same docs and schema.
- Add automated tests once the team picks a runner; today there is **no** `npm test` script.

## What not to rebuild

See `context/architecture.md` and `decisions/decision-log.md`. In short: one ledger/invoice pipeline, one Supabase access pattern for server mutations, no duplicate webhook write paths.
