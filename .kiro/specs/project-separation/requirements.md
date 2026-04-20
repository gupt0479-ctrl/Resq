# Requirements: Project Separation — OpsPilot ↔ Resq

## Introduction

This feature covers the complete separation of two products that currently share a single codebase and repository history. **OpsPilot** was a restaurant/SMB operations tool (inventory, reservations, invoices, MCP bridges) built April 10–14, 2026 for the O1 Summit hackathon. **Resq** is a fintech CFO survival workspace (cash truth, 13-week forecast, action queue) that evolved from the same codebase starting April 17, 2026.

The goal is to produce two fully independent projects — each with its own repository, deployment pipeline, branding, and authentication — that appear and function as completely separate products.

### Ground Truth (verified against local repo state)

- Last pure OpsPilot commit: `6a62eb1` (2026-04-14) — "Landing page ui fix"
- Pivot begins: `a629668` (2026-04-17) — "OpsPilot Rescue — cashflow recovery agent and dashboard pivot"
- Timeline gap: ~3 days (April 14–17), not a week
- Current local Resq remote still points to `git@github.com:gupt0479-ctrl/opspilot.git`
- The `/auth/callback` route EXISTS as a client-side page (`src/app/auth/callback/page.tsx`), but it is NOT a secure server-side route handler
- The middleware excludes ALL `/api` routes from auth protection
- The server Supabase client uses the service role key (bypasses RLS)
- The schema is organization-based (`organization_id` on all tables), NOT user-based
- All business data uses a hardcoded `DEMO_ORG_ID` — no per-user or per-org isolation exists

## Glossary

- **OpsPilot**: The original restaurant/SMB operations product (inventory, reservations, invoices, AI agents)
- **Resq**: The fintech CFO survival workspace (cash truth, forecast, action queue, collections recovery)
- **Hackathon Snapshot**: The codebase state at commit `6a62eb1` representing what was shown to judges
- **DEMO_ORG_ID**: Hardcoded organization UUID used across all queries — `00000000-0000-0000-0000-000000000001`
- **Service Role Client**: The Supabase admin client in `supabase-server.ts` that bypasses RLS
- **Org Membership**: The target access model where `auth.users` are linked to `organizations` via a membership table

## Requirements

### Requirement 1: Snapshot Preservation and Evidence Anchoring

**User Story:** As the project owner, I want the hackathon state permanently tagged and preserved so I have a defensible "this is what we showed" anchor before any history rewriting or repo splitting.

#### Acceptance Criteria

1. A git tag `opspilot-hackathon-2026-04-14` SHALL be created at commit `6a62eb1`.
2. An optional tag `resq-pivot-start-2026-04-17` SHOULD be created at commit `a629668`.
3. Any demo artifacts, seed files, or archived notes relevant to the hackathon presentation SHALL be identified and documented.

#### Ownership
- **Kiro**: Generate tag commands and documentation
- **Manual**: Push tags to GitHub remote

---

### Requirement 2: Repository Topology Correction

**User Story:** As the project owner, I want each local clone to point to the correct GitHub remote so that pushes go to the right repository and there is no ambiguity.

#### Acceptance Criteria

1. The local `Resq` directory SHALL have its git remote `origin` updated to point to the Resq GitHub repo (e.g., `gupt0479-ctrl/Resq`).
2. The local `opspilot` directory SHALL have its git remote `origin` pointing to `gupt0479-ctrl/opspilot`.
3. Neither local clone SHALL reference the other product's remote.
4. A topology document SHALL define: which repo is canonical for each product, what each Lovable repo maps to, and what each Vercel project maps to.

#### Ownership
- **Kiro**: Generate exact git remote commands, write topology document
- **Codex**: Verify branch state and remote configuration
- **Manual**: Execute git remote commands, confirm GitHub repo names are final

---

### Requirement 3: OpsPilot Repository Restoration

**User Story:** As the project owner, I want the `opspilot` GitHub repo to contain the exact codebase from the hackathon state so it functions as a standalone product.

#### Acceptance Criteria

1. The `opspilot` repo SHALL contain the code from commit `6a62eb1` as its `main` branch.
2. The restored codebase SHALL NOT contain any Resq-era artifacts (cash truth, forecast engine, rescue queue, fintech branding).
3. The restored codebase SHALL build successfully with `npm run build` (given correct env vars).
4. A post-restore cleanup commit MAY be added to update README and remove any stale references.

#### Ownership
- **Kiro**: Generate restoration runbook with exact commands
- **Codex**: Verify the restored tree matches the hackathon product domain, check for accidental Resq artifacts
- **Manual**: Push restored code to GitHub, connect Vercel project

---

### Requirement 4: Resq Branding Completion

**User Story:** As the project owner, I want zero active OpsPilot branding in the Resq codebase so the two products appear completely independent.

#### Acceptance Criteria

1. All source code files (`src/**`) SHALL reference "Resq" and NOT "OpsPilot" in any user-visible string.
2. All configuration files (package.json, Dockerfile, AGENTS.md, agent configs, hooks) SHALL reference "Resq".
3. All documentation files (README, docs/*, DEMO.md, CLAUDE.md) SHALL reference "Resq".
4. Historical `.kiro/specs/` documents MAY retain "OpsPilot" references but SHALL be prefixed with a note: "Historical pre-Resq artifact".
5. The `Resq-lovable` repo SHALL be audited and scrubbed of remaining "OpsPilot Rescue" branding.
6. SQL migration comments and seed data metadata keys MAY retain historical names where changing them would break existing deployed data.

#### Ownership
- **Kiro**: Execute remaining code renames (Step 1 is ~90% complete)
- **Codex**: Full-codebase search and verification, Lovable repo audit
- **Manual**: Update Lovable project titles, GitHub repo descriptions

#### Current Status
Step 1 (rename) is substantially complete. Remaining items:
- `.kiro/specs/` historical docs need annotation headers
- `Resq-lovable` repo needs branding audit
- `package-lock.json` updated via `npm install`

---

### Requirement 5: Secure OAuth Callback Route

**User Story:** As a Resq user signing in with Google, I want the OAuth callback to be handled securely on the server so my session is properly established and cannot be spoofed.

#### Acceptance Criteria

1. The `/auth/callback` route SHALL be implemented as a Next.js Route Handler (`route.ts`), NOT a client-side page.
2. The route handler SHALL exchange the OAuth code for a Supabase session server-side.
3. The route handler SHALL set a secure, httpOnly session cookie (NOT the current `sb-logged-in=1` cookie).
4. The existing client-side `page.tsx` callback SHALL be removed or replaced.
5. On successful auth, the user SHALL be redirected to `/dashboard`.
6. On failed auth, the user SHALL be redirected to `/login` with an error parameter.

#### Ownership
- **Kiro**: Implement the route handler and remove the client page
- **Codex**: Verify the implementation handles edge cases (expired codes, CSRF)

---

### Requirement 6: Secure Page Middleware

**User Story:** As a Resq user, I want the application to verify my actual Supabase session on every request so that authentication cannot be bypassed by setting a cookie manually.

#### Acceptance Criteria

1. The middleware SHALL validate the Supabase session token on every protected request, NOT just check for a cookie value.
2. The `sb-logged-in=1` cookie SHALL be removed as the source of auth truth.
3. The middleware SHALL use `@supabase/ssr` for proper server-side session handling.
4. Invalid or expired sessions SHALL redirect to `/login`.
5. The middleware SHALL handle session refresh transparently.

#### Ownership
- **Kiro**: Implement SSR-based middleware
- **Codex**: Verify cookie bypass is no longer possible

---

### Requirement 7: API Route Authorization

**User Story:** As a Resq user, I want all API routes to require authentication so that unauthenticated requests cannot access or modify business data.

#### Acceptance Criteria

1. The middleware matcher SHALL be updated to include `/api` routes (currently excluded by `/((?!_next|favicon.ico|api).*)`).
2. Alternatively, each API route handler SHALL independently verify the user session before processing.
3. Public API routes (if any, e.g., webhooks) SHALL be explicitly allowlisted.
4. Unauthenticated API requests SHALL return `401 Unauthorized`.

#### Ownership
- **Kiro**: Update middleware matcher or add per-route auth checks
- **Codex**: Audit all API routes for authorization gaps

---

### Requirement 8: Organization Membership Model

**User Story:** As a Resq user, I want my data scoped to my organization so that I cannot see another user's business data, and so the app stops using a hardcoded demo org for everyone.

#### Acceptance Criteria

1. An `organization_memberships` table SHALL be created linking `auth.users.id` to `organization_id` with a role field.
2. New user signups SHALL auto-create an organization and membership record.
3. All queries currently using `DEMO_ORG_ID` SHALL be replaced with the authenticated user's active organization.
4. A request helper SHALL resolve the current user's organization from their session.
5. The service-role Supabase client SHALL only be used for privileged backend jobs (webhooks, cron), NOT for user-facing data access.
6. A user-session Supabase client SHALL be created for request-scoped auth.

#### Ownership
- **Kiro**: Design migration, implement helpers, update queries
- **Codex**: Audit all DEMO_ORG_ID usage (30+ locations identified), verify isolation
- **Manual**: Decide if Resq is single-user-per-business or multi-user-team

---

### Requirement 9: Row-Level Security (RLS)

**User Story:** As a Resq user, I want database-level enforcement that prevents cross-tenant data access even if application code has a bug.

#### Acceptance Criteria

1. RLS policies SHALL be created on all organization-scoped tables.
2. Policies SHALL use the authenticated user's JWT claims to determine organization access.
3. The service-role client SHALL explicitly bypass RLS only where documented and justified.
4. A test SHALL verify that user A cannot query user B's organization data.

#### Ownership
- **Kiro**: Write migration SQL and RLS policies
- **Codex**: Verify direct API and DB access patterns don't bypass tenant scoping
- **Manual**: Apply migrations to Supabase project

---

### Requirement 10: Deployment Pipeline Separation

**User Story:** As the project owner, I want OpsPilot and Resq to deploy independently with separate secrets, services, and infrastructure.

#### Acceptance Criteria

1. Each project SHALL have its own Vercel project linked to its own GitHub repo.
2. Each project SHALL have its own Supabase project (or clearly separated schemas).
3. Environment variables SHALL be enumerated per project with no cross-contamination.
4. A deployment checklist SHALL cover: Supabase auth redirect URLs, Google OAuth origins, Vercel env vars, Stripe webhooks, Resend sender/domain, TinyFish keys, S3 bucket names.

#### Ownership
- **Kiro**: Generate deployment checklists and env var inventories
- **Codex**: Enumerate actual env vars used by each codebase
- **Manual**: Create Vercel projects, Supabase projects, configure OAuth, DNS, Stripe, Resend, TinyFish, AWS

---

### Requirement 11: Lovable Repository Separation

**User Story:** As the project owner, I want the Lovable design repos to clearly belong to their respective products with no cross-branding.

#### Acceptance Criteria

1. `ai-operations-companion` SHALL remain the OpsPilot Lovable repo.
2. `Resq-lovable` SHALL be scrubbed of all "OpsPilot Rescue" branding.
3. A mapping document SHALL define which Lovable repo maps to which product repo.

#### Ownership
- **Codex**: Audit `Resq-lovable` for remaining OpsPilot branding
- **Manual**: Update Lovable project titles and sync targets

---

### Requirement 12: Auth Verification Matrix

**User Story:** As the project owner, I want a comprehensive verification that auth works correctly across all flows before any public deployment.

#### Acceptance Criteria

The following SHALL all pass:
1. Email signup creates account and sends confirmation
2. Email signin with valid credentials reaches dashboard
3. Email signin with invalid credentials shows error
4. Google OAuth completes full flow and reaches dashboard
5. Logout clears session and redirects to login
6. Unauthenticated page access redirects to login
7. Unauthenticated API request returns 401
8. User A cannot see User B / Org B data
9. Expired session redirects to login (not infinite loop)

#### Ownership
- **Kiro**: Write test cases
- **Codex**: Execute verification
- **Manual**: Test Google OAuth in browser

---

## Subscription & Tool Allocation

| Tool | Best Use in This Project |
|------|------------------------|
| **Kiro** | Specs, task breakdowns, code changes in Resq workspace, runbooks, deployment checklists, hooks |
| **Codex** | Repo archaeology, exact git commands, auth implementation, API audit, full-codebase branding scrub, verification |
| **Cursor** ($50 credits) | Heavy multi-file editing sessions (auth refactor, DEMO_ORG_ID replacement across 30+ files) |
| **Lovable** (100 credits) | UI iteration on both products' landing pages and dashboards |
| **Vercel** ($30 v0 credits) | Deploy both projects, use v0 for rapid UI prototyping |
| **GitHub Copilot** | Inline code completion during auth and org-membership implementation |
| **TinyFish** (1650 credits) | Already integrated in Resq for web automation — continue using |
| **Stripe** ($250 credits) | Resq payment/billing features |
| **Claude Pro** (1 month) | Complex reasoning tasks, architecture decisions |
| **AWS** ($25 credits) | Resq infrastructure if needed |

## What Kiro Can Do vs Cannot Do

### Kiro CAN:
- All code changes within this Resq workspace (rename, auth, middleware, routes, migrations)
- Create and manage specs, tasks, hooks, steering files
- Generate exact git commands and runbooks
- Run tests and validate builds
- Write deployment checklists and documentation

### Kiro CANNOT:
- Execute git push/pull to GitHub (requires your SSH/token auth)
- Create or configure Vercel projects
- Create or configure Supabase projects or apply migrations to remote
- Configure Google OAuth credentials/redirect URIs
- Set up DNS/custom domains
- Manage Lovable dashboard settings
- Configure Stripe webhooks, Resend domains, or TinyFish API keys in external dashboards
- Access or modify the `opspilot` local repo (different workspace)
- Access or modify the `Resq-lovable` repo (different workspace)

### Codex CAN (that Kiro cannot):
- Inspect and modify multiple repos simultaneously
- Execute git operations with your credentials
- Run commands across different local directories
- Perform full-codebase verification across both repos
- Access the `opspilot` and `Resq-lovable` repos directly

## Recommended Execution Order

1. **Phase 1**: Freeze — Tag hackathon state (Req 1)
2. **Phase 2**: Topology — Fix remotes (Req 2)
3. **Phase 3**: Restore — OpsPilot repo from snapshot (Req 3)
4. **Phase 4**: Branding — Complete Resq cleanup (Req 4)
5. **Phase 5**: Auth — Secure callback, middleware, API routes (Reqs 5, 6, 7)
6. **Phase 6**: Tenancy — Org membership model (Req 8)
7. **Phase 7**: RLS — Database-level isolation (Req 9)
8. **Phase 8**: Deploy — Separate pipelines (Req 10)
9. **Phase 9**: Lovable — Design repo separation (Req 11)
10. **Phase 10**: Verify — Full auth and isolation matrix (Req 12)

## Correctness Properties

1. **Branding Isolation**: `grep -ri "opspilot" src/` returns zero matches in the Resq codebase (excluding historical annotations).
2. **Auth Cookie Independence**: Setting `sb-logged-in=1` manually in browser does NOT grant access to protected routes.
3. **API Auth Enforcement**: `curl` to any `/api/*` endpoint without a valid session token returns 401.
4. **Tenant Isolation**: Authenticated user A querying any data endpoint returns ONLY data belonging to their organization.
5. **Build Independence**: Both `opspilot` and `resq` repos build successfully with `npm run build` given their respective env vars.
6. **Remote Correctness**: `git remote -v` in each local clone shows only that product's GitHub URL.
