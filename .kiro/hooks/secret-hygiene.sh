#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

changed_files="$(git status --porcelain | awk '{print $2}' | tr '\n' ' ')"
if [[ -z "${changed_files// }" ]]; then
  exit 0
fi

targets=()
for file in $changed_files; do
  case "$file" in
    .env.example|.mcp.json|.kiro/settings/mcp.json|docs/*|.claude/*|src/lib/env.ts|src/lib/aws/*|src/app/api/*)
      if [[ -f "$file" ]]; then
        targets+=("$file")
      fi
      ;;
  esac
done

if [[ ${#targets[@]} -eq 0 ]]; then
  exit 0
fi

if grep -nE 'sk-[A-Za-z0-9_-]{10,}|AKIA[0-9A-Z]{16}|aws_secret_access_key\s*[:=]\s*["'\''][^"'\'']+|api[_-]?key\s*[:=]\s*["'\''][^"'\'']+' "${targets[@]}" \
  | grep -vE 'your_|example|process\.env|TINYFISH_API_KEY=$|AWS_ACCESS_KEY_ID=$|AWS_SECRET_ACCESS_KEY=$|NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key|SUPABASE_SERVICE_ROLE_KEY=your_service_role_key' \
  >/tmp/resq-secret-scan.out 2>/dev/null; then
  echo "Potential secret or credential leak detected in changed files:" >&2
  cat /tmp/resq-secret-scan.out >&2
  exit 1
fi

exit 0
