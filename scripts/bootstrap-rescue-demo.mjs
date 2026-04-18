#!/usr/bin/env node
// Rescue-demo bootstrap helper. Pure Node, zero deps.
// Usage:
//   node scripts/bootstrap-rescue-demo.mjs
//   node scripts/bootstrap-rescue-demo.mjs --probe

const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
]

const OPTIONAL_VARS = [
  "DEMO_ORG_ID",
  "ANTHROPIC_API_KEY",
  "INTEGRATIONS_WEBHOOK_SECRET",
  "CRON_SECRET",
  "DEMO_MODE",
  "TINYFISH_API_KEY",
  "TINYFISH_BASE_URL",
  "TINYFISH_ENABLED",
  "TINYFISH_USE_MOCKS",
  "TINYFISH_HEALTH_PATH",
  "TINYFISH_SEARCH_PATH",
  "TINYFISH_FETCH_PATH",
  "TINYFISH_AGENT_PATH",
  "AWS_REGION",
  "AWS_S3_BUCKET",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
]

const PROBE_BASE = process.env.DEMO_BASE_URL?.trim() || "http://localhost:3000"

function pad(s, n) {
  return String(s).padEnd(n)
}

function report(vars, label) {
  console.log(`\n-- ${label} --`)
  for (const name of vars) {
    const raw = process.env[name]
    const present = raw !== undefined && raw.trim().length > 0
    const status = present ? "PASS" : label === "Required" ? "FAIL" : "skip"
    const preview = present
      ? (name.includes("KEY") || name.includes("SECRET")
        ? "<redacted>"
        : raw.length > 40 ? raw.slice(0, 37) + "..." : raw)
      : "-"
    console.log(`  ${pad(status, 4)}  ${pad(name, 32)}  ${preview}`)
  }
}

async function probe(path, init) {
  const url = `${PROBE_BASE}${path}`
  try {
    const res  = await fetch(url, { ...init, cache: "no-store" })
    const text = await res.text()
    let body
    try { body = JSON.parse(text) } catch { body = text }
    console.log(`  [${res.status}] ${path}`)
    console.log("  " + JSON.stringify(body, null, 2).split("\n").join("\n  "))
    return res.ok
  } catch (err) {
    console.log(`  [ERR] ${path}  ${err?.message ?? err}`)
    console.log(`  Manual: curl -s ${url}`)
    return false
  }
}

async function main() {
  const args = new Set(process.argv.slice(2))
  console.log("OpsPilot rescue-demo bootstrap")
  report(REQUIRED_VARS, "Required")
  report(OPTIONAL_VARS, "Optional")

  const missingRequired = REQUIRED_VARS.filter((n) => !process.env[n]?.trim())
  if (missingRequired.length > 0) {
    console.log(`\nMissing required vars: ${missingRequired.join(", ")}`)
    console.log("Copy .env.example to .env.local and fill them before probing.")
  }

  console.log("\nNext steps:")
  console.log("  1. Apply Supabase SQL in order (see docs/rescue-demo-runbook.md section 4).")
  console.log("  2. npm install && npm run dev")
  console.log("  3. Re-run with --probe once the dev server is up.")

  if (!args.has("--probe")) return

  console.log(`\n-- Probing ${PROBE_BASE} --`)
  await probe("/api/tinyfish/health")
  await probe("/api/tinyfish/demo-run", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ scenario: "full_survival_scan" }),
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
