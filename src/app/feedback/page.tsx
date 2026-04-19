import { DEMO_ORG_ID } from "@/lib/db"
import { getLedgerSchemaHealth } from "@/lib/db/ledger-schema"
import { listFeedbackQuery } from "@/lib/queries/feedback"
import { isDatabaseConfigured } from "@/lib/env"
import { LedgerSchemaBanner } from "@/components/ops/ledger-schema-banner"
import { FeedbackPageClient } from "@/components/feedback/FeedbackPageClient"

export const dynamic = "force-dynamic"

export default async function FeedbackPage() {
  if (!isDatabaseConfigured()) {
    return (
      <div className="m-8 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm">
        <p className="font-semibold text-amber-800">
          Supabase not configured — connect a project to see feedback data.
        </p>
      </div>
    )
  }

  const schema = await getLedgerSchemaHealth()
  if (!schema.ok) {
    return <LedgerSchemaBanner message={schema.message} />
  }

  let pageData
  try {
    pageData = await listFeedbackQuery(DEMO_ORG_ID)
  } catch {
    return (
      <div className="m-8 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm">
        <p className="font-semibold text-amber-800">
          Feedback tables not found. Apply migration{" "}
          <code className="rounded bg-muted px-1">004_feedback_domain.sql</code> and re-run seed.
        </p>
      </div>
    )
  }

  const { stats, flagged, pendingActions, allFeedback, emptyContext, emptyDiagnostics } = pageData

  return (
    <>
      {/* Empty-state diagnostics (server-rendered, only shown when no data) */}
      {emptyContext && (
        <div
          className={`m-6 rounded-xl border p-4 text-sm ${
            emptyContext.kind === "no_feedback_rows"
              ? "border-amber-200 bg-amber-50 text-amber-950"
              : "border-orange-200 bg-orange-50 text-orange-950"
          }`}
        >
          <p className="font-semibold">
            {emptyContext.kind === "no_feedback_rows"
              ? "No feedback rows in Supabase yet"
              : "No feedback for this organization ID"}
          </p>
          {emptyContext.kind === "no_feedback_rows" ? (
            <p className="mt-2 text-xs leading-relaxed">
              Apply migration{" "}
              <code className="rounded bg-white/60 px-1">supabase/migrations/004_feedback_domain.sql</code>, then run{" "}
              <code className="rounded bg-white/60 px-1">supabase/seed_feedback_addon.sql</code> in the SQL editor.
              After rows exist, reload this page.
            </p>
          ) : (
            <p className="mt-2 text-xs leading-relaxed">
              Feedback exists for another <code className="rounded bg-white/60 px-1">organization_id</code>. Set{" "}
              <code className="rounded bg-white/60 px-1">DEMO_ORG_ID</code> in{" "}
              <code className="rounded bg-white/60 px-1">.env.local</code> to match your seed (default:{" "}
              <code className="rounded bg-white/60 px-1">00000000-0000-0000-0000-000000000001</code>), then restart.
            </p>
          )}
          {emptyDiagnostics && (
            <div className="mt-3 rounded-md border border-black/10 bg-white/50 p-3 text-[11px] leading-relaxed">
              <p className="font-semibold text-foreground">What this app sees</p>
              <p className="mt-1 font-mono text-muted-foreground">
                DB host: <span className="text-foreground">{emptyDiagnostics.dbHost}</span>
              </p>
              <p className="mt-1 text-muted-foreground">
                Row counts — organizations:{" "}
                <span className="font-mono text-foreground">{emptyDiagnostics.organizationsCount ?? "--"}</span>
                {", customers (this org): "}
                <span className="font-mono text-foreground">{emptyDiagnostics.customersForOrgCount ?? "--"}</span>
                {", appointments (this org): "}
                <span className="font-mono text-foreground">{emptyDiagnostics.appointmentsForOrgCount ?? "--"}</span>
                {", feedback (all orgs): "}
                <span className="font-mono text-foreground">{emptyDiagnostics.feedbackGlobalCount ?? "--"}</span>
              </p>
              {emptyDiagnostics.snapshotErrors.length > 0 && (
                <p className="mt-2 font-mono text-destructive text-[10px]">
                  {emptyDiagnostics.snapshotErrors.join(" | ")}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <FeedbackPageClient
        stats={stats}
        flagged={flagged}
        pendingActions={pendingActions}
        allFeedback={allFeedback}
      />
    </>
  )
}
