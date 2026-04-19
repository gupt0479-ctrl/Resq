#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

changed_files="$(git status --porcelain | awk '{print $2}')"
if [[ -z "${changed_files}" ]]; then
  exit 0
fi

needs_demo_check=0
while IFS= read -r file; do
  case "$file" in
    src/lib/tinyfish/*|src/app/api/tinyfish/*|src/app/api/rescue/*|src/app/workflow/*|src/app/integrations/*|src/app/dashboard/*|docs/rescue-demo-runbook.md|docs/kiro-tinyfish-setup.md|docs/apprunner-deploy.md|scripts/demo-smoke.sh)
      needs_demo_check=1
      ;;
  esac
done <<< "$changed_files"

if [[ "$needs_demo_check" -eq 1 ]]; then
  cat <<'EOF'
Demo-safety reminder:
- Keep /api/tinyfish/demo-run stable and judge-facing.
- Keep /api/tinyfish/health honest about mock vs misconfigured vs live config.
- Preserve mode, degradedFromLive, and warning semantics.
- Run: npm run lint && npx tsc --noEmit && npm run test && npm run build
- If the dev server is available, also run: bash scripts/demo-smoke.sh
EOF
fi
