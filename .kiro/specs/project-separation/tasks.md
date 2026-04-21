# Tasks: Project Separation — OpsPilot ↔ Resq

## Overview

Implementation tasks for fully separating OpsPilot and Resq into independent products, hardening Resq auth, and adding real multi-tenant data isolation. Tasks are grouped by phase and marked with ownership: Kiro (this workspace), Codex (cross-repo execution), or Manual (dashboard/service config). Tasks marked with `*` are optional.

## Tasks

### Phase 1: Snapshot Preservation

- [ ] 1. Create git tags and snapshot documentation
  - [x] 1.1 Generate tag commands: `git tag opspilot-hackathon-2026-04-14 6a62eb1` and `git tag resq-pivot-start-2026-04-17 a629668` (Kiro)
  - [ ] 1.2 Push tags to GitHub remote (Manual: `git push origin --tags`)
  - [x] 1.3 Document preserved artifacts (seed.sql, DEMO.md at tag) in a `docs/separation-history.md` file (Kiro)

### Phase 2: Repository Topology

- [ ] 2. Fix git remotes and write topology document
  - [ ] 2.1 Update Resq local remote: `git remote set-url origin git@github.com:gupt0479-ctrl/Resq.git` (Manual)
  - [ ] 2.2 Verify Resq remote points to correct repo (Manual: `git remote -v`)
  - [ ] 2.3 Update opspilot local remote if needed (Manual, in opspilot directory)
  - [x] 2.4 Write `docs/repo-topology.md` defining canonical repos, Lovable mappings, and Vercel project mappings (Kiro)

### Phase 3: OpsPilot Restoration

- [ ] 3. Restore OpsPilot repo from hackathon snapshot
  - [x] 3.1 Generate restoration runbook with exact git commands (Kiro)
  - [ ] 3.2 Execute restoration: clone from tag, reset to main, push to opspilot repo (Manual/Codex)
  - [ ] 3.3 Verify restored tree has no Resq-era artifacts (Codex)
  - [ ] 3.4 Add post-restore cleanup commit updating README for standalone OpsPilot (Codex)

### Phase 4: Resq Branding Completion

- [ ] 4. Remove all remaining OpsPilot references from Resq
  - [x] 4.1 Add historical annotation headers to `.kiro/specs/loading-screen-catchphrases/requirements.md`, `design.md`, `tasks.md` (Kiro)
  - [x] 4.2 Add historical annotation headers to `.kiro/specs/tinyfish-portal-login/requirements.md`, `design.md` (Kiro)
  - [x] 4.3 Add historical annotation header to `.kiro/specs/tinyfish-sse-async-harness/requirements.md` (Kiro)
  - [ ] 4.4 Audit and scrub `Resq-lovable` repo for OpsPilot Rescue branding (Codex)
  - [x] 4.5 Run final `grep -ri "opspilot" src/` verification — must return zero matches (Kiro)

### Phase 5: Secure OAuth Callback

- [ ] 5. Replace client-side OAuth callback with server-side route handler
  - [x] 5.1 Install `@supabase/ssr` dependency: `npm install @supabase/ssr` (Kiro)
  - [x] 5.2 Create `src/app/auth/callback/route.ts` with server-side code exchange using `createServerClient` and `exchangeCodeForSession` (Kiro)
  - [x] 5.3 Delete `src/app/auth/callback/page.tsx` (Kiro)
  - [x] 5.4 Update login page Google OAuth `redirectTo` to use `/auth/callback` (verify it already does) (Kiro)
  - [ ] 5.5 Verify Google OAuth flow end-to-end in browser (Manual)

### Phase 6: Secure Middleware

- [ ] 6. Replace cookie-based middleware with Supabase SSR session validation
  - [x] 6.1 Rewrite `src/middleware.ts` to use `createServerClient` from `@supabase/ssr` with `getUser()` validation (Kiro)
  - [x] 6.2 Update middleware matcher from `/((?!_next|favicon.ico|api).*)` to `/((?!_next|favicon.ico).*)` to include API routes (Kiro)
  - [x] 6.3 Add `PUBLIC_API_PATHS` allowlist for `/api/integrations/webhooks` and `/api/cron` (Kiro)
  - [x] 6.4 Return `401 JSON` for unauthenticated `/api` requests instead of redirect (Kiro)
  - [x] 6.5 Remove `setAuthCookie()` function and `sb-logged-in` cookie logic from `src/app/login/page.tsx` (Kiro)
  - [ ] 6.6 Verify cookie spoof no longer grants access: set `sb-logged-in=1` manually, confirm redirect to `/login` (Manual)

### Phase 7: API Authorization Helpers

- [x] 7. Create session user and org resolution helpers
  - [x] 7.1 Create `src/lib/auth/get-session-user.ts` with `getSessionUser()` function using `@supabase/ssr` cookie-based client (Kiro)
  - [x] 7.2 Verify `getSessionUser()` returns the authenticated user from Supabase session cookies (Kiro)
  - [x] 7.3 Run `npm run build` to confirm no type errors from auth changes (Kiro)

### Phase 8: Organization Membership Model

- [ ] 8. Create org membership schema and auto-provisioning
  - [x] 8.1 Create `supabase/migrations/008_org_memberships.sql` with `organization_memberships` table (Kiro)
  - [x] 8.2 Add `organizationMemberships` table definition to `src/lib/db/schema.ts` (Kiro)
  - [x] 8.3 Create `src/lib/auth/get-user-org.ts` with `getUserOrg()` helper that resolves user → org membership (Kiro)
  - [x] 8.4 Add `handle_new_user()` trigger function to `008_org_memberships.sql` that auto-creates org + membership on signup (Kiro)
  - [ ] 8.5 Apply migration to Supabase project (Manual)

### Phase 9: Replace DEMO_ORG_ID With Real Org Scoping

- [x] 9. Replace all DEMO_ORG_ID usages with authenticated org context
  - [x] 9.1 Replace `DEMO_ORG_ID` in `src/app/api/invoices/route.ts` with `getUserOrg()` (Kiro)
  - [x] 9.2 Replace `DEMO_ORG_ID` in `src/app/api/invoices/[id]/route.ts`, `mark-paid/route.ts`, `remind/route.ts`, `send/route.ts`, `generate/route.ts` (Kiro)
  - [x] 9.3 Replace `DEMO_ORG_ID` in `src/app/api/finance/summary/route.ts` and `transactions/route.ts` (Kiro)
  - [x] 9.4 Replace `DEMO_ORG_ID` in `src/app/api/cash/summary/route.ts`, `forecast/route.ts`, `invoices/route.ts`, `analyze/route.ts` (Kiro)
  - [x] 9.5 Replace `DEMO_ORG_ID` in `src/app/api/rescue/[invoiceId]/run/route.ts` (Kiro)
  - [x] 9.6 Replace `DEMO_ORG_ID` in `src/app/api/agent/recovery/route.ts` (Kiro)
  - [x] 9.7 Replace `DEMO_ORG_ID` in `src/app/api/feedback/route.ts` and `src/app/api/review/route.ts` (Kiro)
  - [x] 9.8 Replace `DEMO_ORG_ID` in `src/app/api/kyc/alerts/route.ts` (Kiro)
  - [x] 9.9 Replace `DEMO_ORG_ID` in `src/app/api/dashboard/summary/route.ts` (Kiro)
  - [x] 9.10 Replace `DEMO_ORG_ID` in `src/app/api/tinyfish/demo-run/route.ts` (Kiro)
  - [x] 9.11 Replace `DEMO_ORG_ID` in `src/app/api/receivables/send-reminder/route.ts` and `investigate/route.ts` (Kiro)
  - [x] 9.12 Replace `DEMO_ORG_ID` in server components: `src/app/finance/page.tsx`, `src/app/feedback/page.tsx`, `src/app/integrations/page.tsx` (Kiro)
  - [x] 9.13 Remove `DEMO_ORG_ID` export from `src/lib/db/index.ts` and `src/lib/db/supabase-server.ts` (keep in `src/lib/env.ts` for fallback/demo mode only) (Kiro)
  - [x] 9.14 Run `npm run build` to confirm no broken imports after DEMO_ORG_ID removal (Kiro)

### Phase 10: Row-Level Security

- [ ] 10. Create RLS policies for tenant isolation
  - [x] 10.1 Create `supabase/migrations/009_rls_policies.sql` enabling RLS on all org-scoped tables (Kiro)
  - [x] 10.2 Add RLS policies using `organization_memberships` lookup for: `customers`, `staff`, `services`, `appointments`, `appointment_events`, `invoices`, `invoice_items`, `finance_transactions`, `integration_connectors`, `integration_sync_events`, `ai_summaries`, `ai_actions`, `feedback`, `follow_up_actions`, `invoice_recovery_actions`, `client_credit_scores`, `stripe_events`, `client_reminders`, `cash_obligations`, `cash_forecast_snapshots` (Kiro)
  - [x] 10.3 Add RLS policy on `organizations` table allowing access only to orgs the user is a member of (Kiro)
  - [x] 10.4 Add RLS policy on `organization_memberships` allowing users to see only their own memberships (Kiro)
  - [ ] 10.5 Apply RLS migration to Supabase project (Manual)
  - [x] 10.6 Write a property-based test verifying cross-org data isolation (Kiro)

### Phase 11: Deployment Separation

- [ ] 11. Create deployment checklists and separate pipelines
  - [x] 11.1 Write `docs/resq-deploy-checklist.md` with all Resq env vars and service configurations (Kiro)
  - [x] 11.2 Write `docs/opspilot-deploy-checklist.md` with all OpsPilot env vars and service configurations (Kiro)
  - [ ] 11.3 Create Vercel project for Resq linked to `gupt0479-ctrl/Resq` (Manual)
  - [ ] 11.4 Create Vercel project for OpsPilot linked to `gupt0479-ctrl/opspilot` (Manual)
  - [ ] 11.5 Create separate Supabase projects for each product (Manual)
  - [ ] 11.6 Configure Supabase Auth settings: site URL, redirect URLs, Google OAuth (Manual)
  - [ ] 11.7 Set environment variables in each Vercel project (Manual)
  - [ ] 11.8 Configure Stripe webhook endpoint for Resq (Manual)
  - [ ] 11.9 Configure Resend sender domain for Resq (Manual)

### Phase 12: Lovable Separation & Final Verification

- [ ] 12. Verify complete separation and auth correctness
  - [ ] 12.1 Audit `Resq-lovable` for remaining OpsPilot branding and scrub (Codex)
  - [ ] 12.2 Update Lovable project titles and sync targets (Manual)
  - [ ] 12.3 Verify email signup creates account and sends confirmation (Manual)
  - [ ] 12.4 Verify email signin with valid credentials reaches dashboard (Manual)
  - [ ] 12.5 Verify email signin with invalid credentials shows error (Manual)
  - [ ] 12.6 Verify Google OAuth completes full flow to dashboard (Manual)
  - [ ] 12.7 Verify logout clears session and redirects to login (Manual)
  - [ ] 12.8 Verify unauthenticated page access redirects to login (Manual)
  - [ ] 12.9 Verify unauthenticated API request returns 401 (Manual)
  - [ ] 12.10 Verify User A cannot see User B / Org B data (Manual)
  - [ ] 12.11 Verify expired session redirects to login without infinite loop (Manual)
  - [ ] 12.12 Run `npm run build` on both repos to confirm independent builds (Codex)
  - [ ] 12.13 Run `git remote -v` on both local clones to confirm correct remotes (Manual)
