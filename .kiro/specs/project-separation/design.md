# Design: Project Separation — OpsPilot ↔ Resq

## Overview

This design covers the complete separation of OpsPilot and Resq into two independent products, plus the auth and tenancy hardening needed to make Resq production-ready. The work is organized into 10 phases that can be executed sequentially, with clear ownership boundaries between Kiro (this workspace), Codex (cross-repo), and Manual (dashboard/service configuration).

The design is intentionally phased so that each phase produces a stable, testable state. Phases 1–4 are separation work. Phases 5–7 are auth and tenancy hardening. Phases 8–10 are deployment and verification.

---

## Phase 1: Snapshot Preservation (Req 1)

### Design

Create git tags at the two boundary commits to permanently anchor the hackathon state before any repo manipulation.

### Commands (Kiro generates, Manual executes)

```bash
# In the Resq directory (which has the full history)
git tag opspilot-hackathon-2026-04-14 6a62eb1
git tag resq-pivot-start-2026-04-17 a629668
git push origin opspilot-hackathon-2026-04-14
git push origin resq-pivot-start-2026-04-17
```

### Artifacts to preserve
- `supabase/seed.sql` — demo data shown to judges
- `DEMO.md` — demo script (already updated to Resq, but exists in git history at the tag)
- Any screenshots or presentation media outside git (Manual responsibility)

---

## Phase 2: Repository Topology (Req 2)

### Current State (verified)

```
Local Resq  → origin: git@github.com:gupt0479-ctrl/opspilot.git  ← WRONG
Local opspilot → origin: https://github.com/gupt0479-ctrl/opspilot.git
```

### Target State

```
Local Resq     → origin: git@github.com:gupt0479-ctrl/Resq.git
Local opspilot → origin: git@github.com:gupt0479-ctrl/opspilot.git
```

### Topology Map

| Product | App Repo | Lovable Repo | Vercel Project | Supabase Project |
|---------|----------|-------------|----------------|-----------------|
| OpsPilot | `gupt0479-ctrl/opspilot` | `gupt0479-ctrl/ai-operations-companion` | TBD (Manual) | TBD (Manual) |
| Resq | `gupt0479-ctrl/Resq` | `gupt0479-ctrl/Resq-lovable` | TBD (Manual) | TBD (Manual) |

### Commands

```bash
# In ~/projects/hackathon/Resq
git remote set-url origin git@github.com:gupt0479-ctrl/Resq.git

# In ~/projects/hackathon/opspilot (if it exists locally)
git remote set-url origin git@github.com:gupt0479-ctrl/opspilot.git
```

### Prerequisite (Manual)
- Ensure `gupt0479-ctrl/Resq` GitHub repo exists. If the current repo was renamed from `opspilot` to `Resq`, the URL should already work. Verify at `https://github.com/gupt0479-ctrl/Resq`.

---

## Phase 3: OpsPilot Restoration (Req 3)

### Design

Extract the hackathon-state codebase from the tagged commit and push it to the `opspilot` repo as a clean `main` branch.

### Commands (Codex or Manual)

```bash
# Option A: From the Resq directory (has full history)
cd ~/projects/hackathon
git clone --no-checkout ~/projects/hackathon/Resq opspilot-restore
cd opspilot-restore
git checkout opspilot-hackathon-2026-04-14
git checkout -b main
git remote remove origin
git remote add origin git@github.com:gupt0479-ctrl/opspilot.git
git push -u origin main --force
```

### Post-Restore Verification
- `npm install && npm run build` succeeds (with correct env vars)
- No Resq-era files present (no `src/lib/services/forecast-engine.ts`, no `cash_forecast_snapshots` references, no "Resq" branding)
- Landing page shows OpsPilot restaurant/SMB operations branding

---

## Phase 4: Resq Branding Completion (Req 4)

### Current Status
Step 1 rename is ~95% complete. Remaining items:

### 4a: Historical Spec Annotation
Add a header to each `.kiro/specs/` file that still references OpsPilot:

```markdown
> **Historical Note:** This spec was written during the OpsPilot → Resq transition. References to "OpsPilot" are historical.
```

Files to annotate:
- `.kiro/specs/loading-screen-catchphrases/requirements.md`
- `.kiro/specs/loading-screen-catchphrases/design.md`
- `.kiro/specs/loading-screen-catchphrases/tasks.md`
- `.kiro/specs/tinyfish-portal-login/requirements.md`
- `.kiro/specs/tinyfish-portal-login/design.md`
- `.kiro/specs/tinyfish-sse-async-harness/requirements.md`

### 4b: Lovable Repo Audit (Codex)
- Audit `Resq-lovable` for remaining "OpsPilot Rescue" branding
- Key file: `src/pages/Landing.tsx` (confirmed by Codex to still have OpsPilot references)

### 4c: Metadata Cleanup
- `scripts/setup-stripe-test-data.mjs` still has `opspilot_test: 'true'` in Stripe metadata — this is safe to leave since changing it could break existing Stripe test data lookups

---

## Phase 5: Secure Auth — OAuth Callback (Req 5)

### Current State

`src/app/auth/callback/page.tsx` is a client-side `"use client"` component that:
1. Calls `supabaseBrowser.auth.getSession()` on the client
2. Sets a `sb-logged-in=1` cookie manually
3. Redirects to `/dashboard`

This is insecure because the OAuth code exchange happens client-side and the session cookie is a plain boolean.

### Target Design

Replace with a server-side Route Handler using `@supabase/ssr`:

**New file: `src/app/auth/callback/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", request.url))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url))
  }

  return NextResponse.redirect(new URL(next, request.url))
}
```

**Delete: `src/app/auth/callback/page.tsx`**

### New Dependency
```
npm install @supabase/ssr
```

---

## Phase 6: Secure Auth — Middleware (Req 6)

### Current State

```typescript
// src/middleware.ts
const loggedIn = req.cookies.get("sb-logged-in")?.value === "1"
```

This checks a manually-set cookie. Anyone can set `sb-logged-in=1` in their browser and bypass auth.

The matcher also excludes `/api` routes:
```typescript
matcher: ["/((?!_next|favicon.ico|api).*)"]
```

### Target Design

Replace with `@supabase/ssr` session validation:

**New `src/middleware.ts`:**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

const PUBLIC_PATHS = ["/", "/login", "/auth"]
const PUBLIC_API_PATHS = ["/api/integrations/webhooks", "/api/cron"]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public pages
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next()
  }

  // Allow public API routes (webhooks, cron)
  if (PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Create response to pass through cookie updates
  let response = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
}
```

Key changes:
- Validates actual Supabase session via `getUser()`, not a cookie boolean
- Includes `/api` routes in the matcher (removes the `|api` exclusion)
- Explicitly allowlists webhook and cron routes
- Passes cookie updates through for session refresh
- Returns 401 JSON for unauthenticated API requests

### Login Page Update

Remove the `setAuthCookie()` function from `src/app/login/page.tsx`. The `@supabase/ssr` cookies handle session persistence automatically.

---

## Phase 7: Secure Auth — API Authorization (Req 7)

### Design

With the middleware now covering `/api` routes, most API authorization is handled. However, routes that need the authenticated user's identity for org scoping need a helper.

**New file: `src/lib/auth/get-session-user.ts`**

```typescript
import "server-only"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

export async function getSessionUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}
```

### API Route Classification

| Category | Routes | Auth Strategy |
|----------|--------|--------------|
| **User-facing** | `/api/invoices/*`, `/api/finance/*`, `/api/cash/*`, `/api/rescue/*`, `/api/dashboard/*`, `/api/feedback/*`, `/api/receivables/*`, `/api/kyc/*`, `/api/agent/*`, `/api/tinyfish/*` | Middleware + org scoping via `getSessionUser()` |
| **Webhooks** | `/api/integrations/webhooks/*` | Allowlisted in middleware, verified by webhook signature |
| **Cron** | `/api/cron/*` | Allowlisted in middleware, verified by Vercel cron secret |
| **Internal** | `/api/review`, `/api/follow-ups` | Middleware auth |

---

## Phase 8: Organization Membership Model (Req 8)

### Current State

Every query uses `DEMO_ORG_ID` imported from `src/lib/db/index.ts` or `src/lib/env.ts`. There are 30+ locations. The schema already has `organization_id` on all business tables but no link between `auth.users` and `organizations`.

### Target Schema

**New migration: `supabase/migrations/008_org_memberships.sql`**

```sql
-- Resq · Organization Memberships
CREATE TABLE IF NOT EXISTS organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_org_memberships_user ON organization_memberships(user_id);
CREATE INDEX idx_org_memberships_org ON organization_memberships(organization_id);
```

### Drizzle Schema Addition

```typescript
// In src/lib/db/schema.ts
export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),  // references auth.users
    organizationId: uuid("organization_id").notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"),
    isDefault: boolean("is_default").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_org_memberships_user").on(table.userId),
    index("idx_org_memberships_org").on(table.organizationId),
    uniqueIndex("org_memberships_user_org").on(table.userId, table.organizationId),
  ],
)
```

### Org Resolution Helper

**New file: `src/lib/auth/get-user-org.ts`**

```typescript
import "server-only"
import { getSessionUser } from "./get-session-user"
import { db } from "@/lib/db"
import { organizationMemberships } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function getUserOrg() {
  const user = await getSessionUser()
  if (!user) return null

  const [membership] = await db
    .select()
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.userId, user.id),
        eq(organizationMemberships.isDefault, true),
      )
    )
    .limit(1)

  if (!membership) return null

  return {
    userId: user.id,
    organizationId: membership.organizationId,
    role: membership.role,
  }
}
```

### Signup Flow: Auto-Create Org

When a user signs up, a Supabase database trigger or a post-signup API call creates:
1. A new row in `organizations` with the user's email as the name
2. A new row in `organization_memberships` linking the user to that org as `owner`

**Preferred approach:** Supabase database function triggered on `auth.users` insert:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO organizations (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.id::text
  );

  INSERT INTO organization_memberships (user_id, organization_id, role, is_default)
  VALUES (
    NEW.id,
    (SELECT id FROM organizations WHERE slug = NEW.id::text),
    'owner',
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### DEMO_ORG_ID Replacement Strategy

Replace all 30+ `DEMO_ORG_ID` usages with `getUserOrg()`:

```typescript
// Before
import { DEMO_ORG_ID } from "@/lib/db"
const invoices = await listInvoicesQuery(DEMO_ORG_ID, { status, limit, offset })

// After
import { getUserOrg } from "@/lib/auth/get-user-org"
const ctx = await getUserOrg()
if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
const invoices = await listInvoicesQuery(ctx.organizationId, { status, limit, offset })
```

This is a large but mechanical change across ~20 API route files and ~5 page server components. Best done with Cursor ($50 credits) for multi-file editing or Codex for automated replacement.

### Supabase Client Split

| Client | File | Key | Use Case |
|--------|------|-----|----------|
| **Browser client** | `src/lib/db/supabase-browser.ts` | Anon key | Client-side auth only |
| **User session client** | `src/lib/auth/get-session-user.ts` | Anon key + cookies | Request-scoped user identity |
| **Admin client** | `src/lib/db/supabase-server.ts` | Service role key | Webhooks, cron, privileged ops only |

---

## Phase 9: Row-Level Security (Req 9)

### Design

RLS policies on all org-scoped tables. The user's JWT contains their `user_id`, and the `organization_memberships` table links them to their org.

**Migration: `supabase/migrations/009_rls_policies.sql`**

```sql
-- Enable RLS on all org-scoped tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_forecast_snapshots ENABLE ROW LEVEL SECURITY;
-- ... (all org-scoped tables)

-- Policy: users can only access their org's data
CREATE POLICY "Users access own org data" ON customers
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Repeat for each org-scoped table
```

### Important Note
The service-role client (`supabase-server.ts`) bypasses RLS by design. This is correct for webhooks and cron jobs. The user-session client respects RLS.

---

## Phase 10: Deployment Separation (Req 10)

### Resq Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database (Drizzle)
DATABASE_URL=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# AI
ANTHROPIC_API_KEY=

# TinyFish
TINYFISH_API_KEY=
TINYFISH_ENABLED=
TINYFISH_USE_MOCKS=

# Email
RESEND_API_KEY=

# AWS (optional)
AWS_REGION=
AWS_S3_BUCKET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# App
DEMO_MODE=false
```

### OpsPilot Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
GOOGLE_GENERATIVE_AI_API_KEY=

# App
DEMO_ORG_ID=00000000-0000-0000-0000-000000000001
```

### Manual Deployment Checklist

- [ ] Create Vercel project for Resq, link to `gupt0479-ctrl/Resq`
- [ ] Create Vercel project for OpsPilot, link to `gupt0479-ctrl/opspilot`
- [ ] Create separate Supabase projects for each
- [ ] Configure Supabase Auth settings per project (site URL, redirect URLs)
- [ ] Configure Google OAuth credentials per project (origins, redirect URIs)
- [ ] Set Stripe webhook endpoint to Resq's URL
- [ ] Configure Resend sender domain for Resq (`collections@resq.app`)
- [ ] Set TinyFish API key in Resq's Vercel env
- [ ] Verify each project builds and deploys independently

---

## Phase 11: Lovable Separation (Req 11) & Verification (Req 12)

### Lovable Mapping

| Lovable Repo | Product | Action |
|-------------|---------|--------|
| `ai-operations-companion` | OpsPilot | Keep as-is |
| `Resq-lovable` | Resq | Scrub OpsPilot branding (Codex) |

### Auth Verification Matrix

| Test | Method | Expected |
|------|--------|----------|
| Email signup | POST to Supabase auth | Account created, confirmation email sent |
| Email signin (valid) | Login page | Redirects to `/dashboard` |
| Email signin (invalid) | Login page | Shows error message |
| Google OAuth | Login page → Google → callback | Redirects to `/dashboard` |
| Logout | Clear session | Redirects to `/login` |
| Unauthenticated page | Visit `/dashboard` directly | Redirects to `/login` |
| Unauthenticated API | `curl /api/invoices` | Returns `401` |
| Cross-org isolation | User A queries | Only sees Org A data |
| Expired session | Wait for expiry | Redirects to `/login` (no loop) |
| Cookie spoof | Set `sb-logged-in=1` manually | Still redirected to `/login` |

---

## Correctness Properties (Property-Based Testing)

### P1: Branding Isolation
```
∀ file ∈ src/**/*.{ts,tsx}: "opspilot" ∉ lowercase(content(file))
```

### P2: Auth Cookie Independence
```
∀ request with cookie(sb-logged-in=1) AND no valid Supabase session:
  response.status ∈ {301, 302, 401}
```

### P3: API Auth Enforcement
```
∀ route ∈ /api/** \ PUBLIC_API_PATHS:
  request without valid session → response.status = 401
```

### P4: Tenant Isolation
```
∀ user_a, user_b where org(user_a) ≠ org(user_b):
  query(user_a, any_endpoint) ∩ data(org(user_b)) = ∅
```

### P5: Build Independence
```
∀ project ∈ {opspilot, resq}:
  npm run build → exit_code = 0
```

### P6: Remote Correctness
```
∀ local_clone ∈ {Resq, opspilot}:
  git_remote(origin) = github_url(product(local_clone))
```
