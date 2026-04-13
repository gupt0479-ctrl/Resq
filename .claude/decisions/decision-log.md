# Decision Log

Append short entries here when the project learns something important. Keep it factual and concrete.

## 2026-04-11 - Deterministic Foundation First

- Decision: treat Supabase/Postgres as the source of truth for the restaurant workflow before building heavier AI behavior.
- Why: the demo must prove a real operational system, especially around invoices and finance.

## 2026-04-11 - Query Layer As UI Contract

- Decision: use `src/lib/queries/*` as the preferred place for UI-facing read-model shaping.
- Why: pages and routes were starting to duplicate mapping logic, which increases drift and repeated mistakes.

## 2026-04-11 - Webhooks Must Reuse Services

- Decision: integration webhooks must store raw payloads, dedupe retries, and dispatch through the same service layer as UI actions.
- Why: direct webhook mutations create split-brain business logic and undermine auditability.

## 2026-04-11 - Avoid Network-Dependent Fonts In Verification Paths

- Decision: do not rely on external Google font fetching for baseline builds.
- Why: verification environments may block network access and create false-negative build failures.

## 2026-04-12 - Document Remote Divergence And Audit Cross-Checks

- Decision: keep `context/remote-main-and-merge.md` and `context/external-review-codex-2026-04.md` updated when `origin/main` moves or when external reviews reference specific SHAs.
- Why: this checkout mixes a pre-merge branch tip, large untracked feature work, and an eight-commit `main` fork for inventory/shipments; without written merge targets, teammates duplicate work or resolve the wrong conflicts.
