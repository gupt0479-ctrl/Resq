# OpsPilot Rescue Demo Runbook

This runbook is the operational source of truth for rehearsing and submitting
the O1 Summit 2026 hackathon demo.

The product being demoed is:

**Autonomous SMB survival agent**

with three visible capabilities:

1. Collections and receivables recovery
2. Financing scout
3. Vendor / insurance optimization

## 1. Demo strategy

The winning story is not “we built a dashboard.” The winning story is:

1. the business is under cash pressure
2. the system runs a survival scan
3. the agent gathers or compares external options
4. the product produces concrete next actions
5. the operator sees an auditable path to survival

## 2. Environment setup

Copy `.env.example` to `.env.local`.

### Minimum required

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DEMO_ORG_ID=00000000-0000-0000-0000-000000000001
```

### Recommended hackathon-safe TinyFish mode

```env
TINYFISH_ENABLED=false
TINYFISH_USE_MOCKS=true
DEMO_MODE=true
```

### Live TinyFish mode

Only enable after verifying the real TinyFish API details:

```env
TINYFISH_ENABLED=true
TINYFISH_USE_MOCKS=false
TINYFISH_API_KEY=...
TINYFISH_AGENT_BASE_URL=https://agent.tinyfish.ai
TINYFISH_SEARCH_BASE_URL=https://api.search.tinyfish.ai
TINYFISH_FETCH_BASE_URL=https://api.fetch.tinyfish.ai
TINYFISH_AGENT_PATH=/v1/automation/run
```

Notes:

- TinyFish MCP auth in Kiro/Claude/Cursor is separate from app runtime auth.
- MCP uses OAuth 2.1 against `https://agent.tinyfish.ai/mcp`.
- App runtime uses `TINYFISH_API_KEY` over the official REST surfaces.

## 3. SQL apply order

Run these in order:

1. `supabase/migrations/0001_core_ledger.sql`
2. `supabase/migrations/0002_appointments_extras.sql`
3. `supabase/migrations/002_invoice_reminders.sql`
4. `supabase/migrations/0003_inventory_shipments.sql`
5. `supabase/migrations/004_feedback_domain.sql`
6. `supabase/seed.sql`
7. `supabase/seed_survival_demo.sql`

Optional only if a surface still needs it:

8. `supabase/seed_feedback_addon.sql`

## 4. Local run

```bash
npm install
npm run dev
```

Optional deploy path:

- for the smallest AWS story, use `docs/apprunner-deploy.md`

## 5. Health probes

### TinyFish health

```bash
curl -s http://localhost:3000/api/tinyfish/health | jq
```

This route is a mode/config probe. It tells you whether the app is in
`mock`, `misconfigured`, or `live` configuration state. Degraded-from-live
truth is surfaced on executed runs, not on this probe.

### Financing scout

```bash
curl -s -X POST http://localhost:3000/api/tinyfish/demo-run \
  -H "Content-Type: application/json" \
  -d '{"scenario":"financing"}' | jq
```

Check:

- `data.mode`
- `data.degradedFromLive`
- `data.warning`
- `data.result.outputs.offers`

### Full survival scan

```bash
curl -s -X POST http://localhost:3000/api/tinyfish/demo-run \
  -H "Content-Type: application/json" \
  -d '{"scenario":"full_survival_scan"}' | jq
```

Supported scenarios:

- `financing`
- `vendor`
- `insurance`
- `full_survival_scan`

Current live scope:

- financing is the only required live external lane
- vendor and insurance may remain fixture-backed during hybrid live mode

## 6. Canonical private-demo script

### Opening

“Small businesses do not usually fail because they lack dashboards. They fail
because cash arrives late while costs rise, and the owner has no time to check
every system manually.”

### Sequence

1. Open the landing page or dashboard.
2. Show cash stress / receivables pressure.
3. Open the rescue queue or agent surface.
4. Run the survival scan.
5. Show financing options.
6. Show vendor or insurance optimization output.
7. Show the agent run timeline / audit trail.

### Closing

“This is not another dashboard. It is an autonomous survival copilot for small
businesses under financial pressure.”

## 7. Public-demo script

Compress to:

1. pain
2. one trigger
3. one autonomous workflow
4. one clear outcome

Do not explain internal architecture unless asked.

## 8. Fallback policy

If anything external is unstable:

1. switch TinyFish to mock mode
2. restart the app
3. rerun `/api/tinyfish/health`
4. rerun `/api/tinyfish/demo-run`
5. proceed with deterministic fixtures

The demo should never depend on an unverified live external endpoint.

## 9. Verification before submission

```bash
npm run lint
npx tsc --noEmit
npm run test
npm run build
bash scripts/demo-smoke.sh
```

## 10. Submission checklist

- [ ] product reads as fintech
- [ ] product reads as agentic
- [ ] one survival scan works end to end
- [ ] mock mode fallback is available
- [ ] backup recording exists
- [ ] main stage / HDMI fallback plan exists
