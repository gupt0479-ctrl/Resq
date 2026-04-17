# 6-Hour Status

Updated: 2026-04-17

## TL;DR

Do not build a broad SMB platform. Build one strong agentic fintech demo:

**Autonomous SMB survival agent**

with three visible pillars:

1. collections
2. financing scout
3. vendor / insurance optimization

## What matters right now

1. keep the deterministic finance backbone intact
2. finish TinyFish mock/live scaffolding
3. keep demo data and documentation perfectly aligned
4. narrow every visible story toward cash survival

## Core demo that must work

1. show cash pressure
2. run the survival scan
3. show financing options
4. show vendor or insurance savings opportunities
5. show the audit trail proving autonomous work

## Important files

```text
src/lib/services/invoices.ts
src/lib/services/finance.ts
src/lib/services/integrations.ts
src/lib/services/ai-actions.ts
src/lib/queries/dashboard.ts
src/lib/tinyfish/client.ts
src/app/api/tinyfish/health/route.ts
src/app/api/tinyfish/demo-run/route.ts
supabase/seed.sql
supabase/seed_survival_demo.sql
docs/rescue-demo-runbook.md
```

## Environment checklist

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEMO_ORG_ID`
- `TINYFISH_ENABLED`
- `TINYFISH_USE_MOCKS`
- `DEMO_MODE`

Live-only:

- `TINYFISH_API_KEY`
- `TINYFISH_BASE_URL`
- `TINYFISH_*_PATH`

## Final verification

```bash
npm run lint
npx tsc --noEmit
npm run test
npm run build
bash scripts/demo-smoke.sh
```

## Known acceptable gaps

- TinyFish may run in mock mode
- external financing sources may be normalized fixtures
- vendor and insurance flows may remain demo-safe and non-binding
