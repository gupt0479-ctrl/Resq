#!/usr/bin/env bash
# Demo-day smoke checklist (requires .env.local + applied migrations + seed).
set -euo pipefail
cd "$(dirname "$0")/.."
echo "== Lint =="
npm run lint
echo "== Typecheck =="
npx tsc --noEmit
echo "== Unit tests =="
npm test
echo "== Production build (webpack) =="
npx next build --webpack
echo "== Optional: DB repro script (needs Supabase env) =="
node scripts/repro-dashboard-data.mjs || true
echo "Done. Manual: POST /api/feedback/submit, POST /api/review, webhook feedback.received, POST /api/ai/manager-summary with CRON_SECRET."
