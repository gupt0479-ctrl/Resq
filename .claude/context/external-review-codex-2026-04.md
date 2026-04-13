# Cross-Check: External PR Audit (Codex) vs Repository State

An external review treated **`origin/main`** at `a0f7f9d` as the reviewed tree and noted issues. Below is how each item maps to **this workspace** (committed + uncommitted) so you can prioritize without guessing.

## 1. Missing `@anthropic-ai/sdk` on `origin/main`

| Location | Status |
|----------|--------|
| `origin/main` `package.json` | **No** `@anthropic-ai/sdk` |
| `generate-predictions.ts` on main | **Imports** `@anthropic-ai/sdk` |
| **This working tree** `package.json` | **Includes** `@anthropic-ai/sdk` (local change; not necessarily committed) |

**Verdict:** The audit is correct for remote `main`. Your local dependency line is a valid fix to carry into the branch you eventually push.

## 2. Anon Supabase client in server routes

| Location | Status |
|----------|--------|
| `origin/main` | `src/lib/supabase/client.ts` + `queries.ts`; handlers import `supabase` for reads/writes |
| **This working tree** | New work uses **`src/lib/db/supabase-server.ts`** (service role, `server-only`) for appointments, invoices, finance, integrations, dashboard |

**Verdict:** Codex’s concern applies to **`origin/main`’s** inventory/shipment path. Your newer “mcp-bridges” stack already follows a stricter server pattern for the ledger slice. After merging `main`, **replace or wrap** `src/lib/supabase/client` usage in server routes rather than duplicating two patterns.

## 3. Hard-coded demo date `2026-04-11`

Still present in this tree in: inventory/shipments pages and components, `src/lib/data/shipments.ts`, prediction API routes, `reservations.ts`, and `supabase/seed.sql` (intentional anchor for deterministic seed).

**Verdict:** Audit is accurate. For product code, move to a single config or “as of” query param defaulting to **today** in dev only.

## 4. Shipment PATCH: no transaction, weak validation, no cache invalidation

Local `src/app/api/shipments/[id]/route.ts` mutates an in-memory array. `origin/main` performs multiple `supabase.from(...).update` calls without a transaction.

**Verdict:** Both are demo-weak; Codex described the **Supabase** variant correctly. Hardening = RPC/transaction + Zod + `revalidatePath`/`revalidateTag` where you use cached fetches.

## 5. Branding / currency / README

- **Bistro Nova** and **AUD** vs **USD** still appear across shipment vs inventory vs finance pages.
- README: your working tree has a large local README update; `origin/main` may still look like stock Next README — compare at merge time.

**Verdict:** Audit direction is right: centralize demo config.

## 6. Tests and CI

`package.json` scripts here: `dev`, `build`, `start`, `lint` only — **no `test` script**. CI likely lint/build only.

**Verdict:** No contradiction; add tests when the team agrees on a runner (Vitest/Jest) and highest-value contracts (invoice idempotency, webhook dedupe, inventory math).

## What This Does **Not** Prove

Git cannot show whether **Codex** vs **you** vs **another tool** authored uncommitted or untracked files. Use `git blame` on **committed** lines and your editor history for untracked folders. This file only ties **audit claims** to **observable tree + refs**.
