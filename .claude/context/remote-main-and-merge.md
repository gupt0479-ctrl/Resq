# Remote `main` vs This Checkout

Use this before pulling, rebasing, or opening a PR so you know what will collide and what is safe to merge.

## Facts From Git (local refs, no network required)

| Ref | Tip commit | Role |
|-----|------------|------|
| `HEAD` on `mcp-bridges` | `4c43603` | Merge PR #11 — inventory + shipments on **in-memory** `src/lib/data/*` |
| `origin/main` (stale OK) | `a0f7f9d` | Eight commits ahead: PRs #12–#15 plus Supabase-backed inventory/shipment edits |

Merge-base of `HEAD` and `origin/main` is **`4c43603`**. Everything on `origin/main` after that is linear history your branch has **not** integrated yet.

## What `origin/main` Changed (high conflict risk)

These paths were edited on `main` after your branch tip and will almost certainly conflict if you merge or rebase without a plan:

- `src/app/api/inventory/**` (routes, predictions, alerts)
- `src/app/api/shipments/**`
- `src/app/inventory/page.tsx`, `src/app/shipments/page.tsx`
- `src/components/inventory/*` (including **new** `edit-item-dialog.tsx` on main)
- **Removed** on main: `src/lib/data/inventory.ts`, `menu-inventory-usage.ts`, large chunks of `menu-items.ts`, `reservations.ts`, `shipments.ts`
- **Added** on main: `src/lib/supabase/client.ts`, `src/lib/supabase/queries.ts`

Your **committed** tree still uses `@/lib/data/shipments` and related static modules. `origin/main` replaced reads/writes with Supabase queries and the anon `supabase` export.

## What Your Working Tree Adds (mostly untracked)

Until you `git add` / commit, teammates do **not** see:

- `supabase/` (migrations + seed)
- Most of `.claude/` (only `.claude/PRD.md` is tracked today)
- `src/lib/db/`, `src/lib/services/`, `src/lib/queries/`, `src/lib/domain/`, new dashboard/finance/invoice API routes and pages

That is **orthogonal** file growth in many places, but **the same** hot files listed above are also modified locally (sidebar, layout, types, globals) — those are merge-touch points.

## Recommended Sync Strategies

1. **Stash or commit** all local work first. Never merge with a dirty tree you cannot replay.
2. **Prefer one integration commit**: `git fetch origin && git merge origin/main` (or rebase if your team agrees), then resolve conflicts once.
3. **Pick a data story** for inventory/shipments:
   - **A.** Adopt main’s Supabase layer for inventory/shipments and port any UI/API ideas from static data.
   - **B.** Keep static demo data for those slices only if the team explicitly wants that — then you must not merge main’s deletions blindly.
4. After merge: run `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack` (see `current-state.md`).

## `package.json` Drift

On **`origin/main`**, `src/lib/inventory/generate-predictions.ts` imports `@anthropic-ai/sdk` but **`package.json` there does not list that dependency** — installs/builds can fail there.

Your **local modified** `package.json` adds `@anthropic-ai/sdk`; that aligns dependency with the import and is the right direction when you commit.
