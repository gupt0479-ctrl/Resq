#!/usr/bin/env bash
# Demo-day smoke checklist (requires .env.local + applied migrations + seed).
#
# Hard gates (always enforced):     lint, typecheck, unit tests, build
# Soft gates (print guidance only): route probes against local dev server
#
# The soft gates never fail the script. If the dev server isn't running, the
# script prints the exact curl to run manually and continues.

set -euo pipefail
cd "$(dirname "$0")/.."

BASE_URL="${DEMO_BASE_URL:-http://localhost:3000}"

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

# ─── Route probes (soft-fail) ──────────────────────────────────────────────

probe_get() {
  local path="$1"
  local url="$BASE_URL$path"
  local out
  echo "-- GET $path"
  if out="$(curl -fsS -m 5 "$url" 2>/dev/null)"; then
    echo "   OK: $(echo "$out" | head -c 400)"
  else
    echo "   skip (server not reachable). Manual:"
    echo "     curl -s $url | jq"
  fi
}

probe_post() {
  local path="$1"
  local body="$2"
  local url="$BASE_URL$path"
  local out
  echo "-- POST $path  body=$body"
  if out="$(curl -fsS -m 10 -X POST -H 'Content-Type: application/json' -d "$body" "$url" 2>/dev/null)"; then
    local mode scenario
    mode="$(echo "$out"     | sed -n 's/.*"mode"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)"
    scenario="$(echo "$out" | sed -n 's/.*"scenario"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)"
    echo "   OK: scenario=${scenario:-?}  mode=${mode:-?}"
    echo "   $(echo "$out" | head -c 400)"
  else
    echo "   skip (server not reachable or non-2xx). Manual:"
    echo "     curl -s -X POST $url -H 'Content-Type: application/json' -d '$body' | jq"
  fi
}

echo ""
echo "== Route probes (soft-fail; skipped if dev server not running) =="
probe_get  "/api/tinyfish/health"
probe_post "/api/tinyfish/demo-run" '{"scenario":"full_survival_scan"}'
probe_get  "/api/finance/summary"
probe_get  "/api/integrations"

echo ""
echo "Done."
echo "Manual demo follow-ups:"
echo "  - POST /api/feedback/submit"
echo "  - POST /api/review"
echo "  - webhook feedback.received"
echo "  - POST /api/ai/manager-summary with CRON_SECRET"
