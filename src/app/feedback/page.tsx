import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AlertTriangle, Star } from "lucide-react"
import { ReviewActions, DismissActions } from "@/components/feedback/review-actions"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { getLedgerSchemaHealth } from "@/lib/db/ledger-schema"
import { getFeedbackPageData } from "@/lib/queries/feedback"
import { isSupabaseConfigured } from "@/lib/env"
import { LedgerSchemaBanner } from "@/components/ops/ledger-schema-banner"

export const dynamic = "force-dynamic"

function sourceStyle(source: string) {
  switch (source) {
    case "internal":
      return "bg-teal-100 text-teal-700"
    case "google":
      return "bg-red-100 text-red-600"
    case "yelp":
      return "bg-red-100 text-red-600"
    case "opentable":
      return "bg-orange-100 text-orange-700"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function sentimentStyle(sentiment: string) {
  switch (sentiment) {
    case "positive":
      return "bg-emerald-100 text-emerald-700"
    case "negative":
      return "bg-red-100 text-red-600"
    default:
      return "bg-yellow-100 text-yellow-700"
  }
}

function followUpBadge(status: string) {
  switch (status) {
    case "thankyou_sent":
      return (
        <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">
          Thank you sent
        </Badge>
      )
    case "callback_needed":
      return (
        <Badge variant="destructive" className="text-[10px]">
          Callback needed
        </Badge>
      )
    case "resolved":
      return (
        <Badge variant="outline" className="text-[10px]">
          Resolved
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-[10px]">
          None
        </Badge>
      )
  }
}

function Stars({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < count ? "fill-amber-400 stroke-amber-400" : "fill-muted stroke-muted-foreground/30"}`}
        />
      ))}
    </span>
  )
}

export default async function FeedbackPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="m-8 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm">
        <p className="font-semibold text-amber-800">
          Supabase not configured - connect a project to see feedback data.
        </p>
      </div>
    )
  }

  const client = createServerSupabaseClient()
  const schema = await getLedgerSchemaHealth(client)
  if (!schema.ok) {
    return <LedgerSchemaBanner message={schema.message} />
  }

  let pageData
  try {
    pageData = await getFeedbackPageData(client, DEMO_ORG_ID)
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

  const statCards = [
    {
      label: "Avg rating this week",
      value: stats.avgRatingWeek != null ? String(stats.avgRatingWeek) + " / 5" : "--",
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-100",
    },
    {
      label: "Flagged reviews",
      value: String(stats.flaggedCount),
      color: "text-red-600",
      bg: "bg-red-50 border-red-100",
    },
    {
      label: "Pending decisions",
      value: String(stats.pendingApprovals),
      color: "text-orange-600",
      bg: "bg-orange-50 border-orange-100",
    },
    {
      label: "Happy guests this week",
      value: String(stats.happyGuestsWeek),
      color: "text-emerald-700",
      bg: "bg-emerald-50 border-emerald-100",
    },
  ]

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Customer Service</h1>
        <p className="text-xs text-muted-foreground">
          AI-analyzed guest reviews, recovery drafts, and follow-up tracking
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Workflow approvals in this demo update OpsPilot state only. They do not send emails or post public replies automatically.
        </p>
      </div>

      {emptyContext ? (
        <div
          className={`rounded-xl border p-4 text-sm ${
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
              The linked database has no rows in the <code className="rounded bg-white/60 px-1">feedback</code> table.
              Apply migration{" "}
              <code className="rounded bg-white/60 px-1">supabase/migrations/004_feedback_domain.sql</code>, then either
              run the full <code className="rounded bg-white/60 px-1">supabase/seed.sql</code> or, if the rest of the demo
              data is already there, run only{" "}
              <code className="rounded bg-white/60 px-1">supabase/seed_feedback_addon.sql</code> in the SQL editor. After
              rows exist, reload this page.
            </p>
          ) : (
            <p className="mt-2 text-xs leading-relaxed">
              Feedback exists for another <code className="rounded bg-white/60 px-1">organization_id</code>. Set{" "}
              <code className="rounded bg-white/60 px-1">DEMO_ORG_ID</code> in{" "}
              <code className="rounded bg-white/60 px-1">.env.local</code> to match your seed (default Ember Table org is{" "}
              <code className="rounded bg-white/60 px-1">00000000-0000-0000-0000-000000000001</code>), then restart the
              dev server.
            </p>
          )}
          {emptyDiagnostics ? (
            <div className="mt-3 rounded-md border border-black/10 bg-white/50 p-3 text-[11px] leading-relaxed">
              <p className="font-semibold text-foreground">What this app sees (same keys as the server)</p>
              <p className="mt-1 font-mono text-muted-foreground">
                Supabase host: <span className="text-foreground">{emptyDiagnostics.supabaseHost}</span>
              </p>
              <p className="mt-1 text-muted-foreground">
                Row counts - organizations:{" "}
                <span className="font-mono text-foreground">{emptyDiagnostics.organizationsCount ?? "--"}</span>
                {", customers (this org): "}
                <span className="font-mono text-foreground">{emptyDiagnostics.customersForOrgCount ?? "--"}</span>
                {", appointments (this org): "}
                <span className="font-mono text-foreground">{emptyDiagnostics.appointmentsForOrgCount ?? "--"}</span>
                {", feedback (all orgs): "}
                <span className="font-mono text-foreground">{emptyDiagnostics.feedbackGlobalCount ?? "--"}</span>
              </p>
              <p className="mt-2 text-muted-foreground">
                In the Supabase dashboard, open <strong>Settings &gt; API</strong> and confirm the <strong>Project URL</strong>{" "}
                hostname matches the host above. If you ran SQL on a different project, the editor would succeed while
                this app still shows zeros.
              </p>
              {(emptyDiagnostics.organizationsCount ?? 0) === 0 ? (
                <p className="mt-2 text-muted-foreground">
                  Organizations count is zero here - either the linked project is empty, or the URL in{" "}
                  <code className="rounded bg-white/60 px-1">.env.local</code> does not match the project where you ran{" "}
                  <code className="rounded bg-white/60 px-1">seed.sql</code>.
                </p>
              ) : null}
              {(emptyDiagnostics.customersForOrgCount ?? 0) > 0 &&
              (emptyDiagnostics.appointmentsForOrgCount ?? 0) === 0 &&
              (emptyDiagnostics.feedbackGlobalCount ?? 0) === 0 ? (
                <p className="mt-2 text-muted-foreground">
                  You have customers but no appointments for this org. The demo <code className="rounded bg-white/60 px-1">INSERT INTO feedback</code>{" "}
                  rows reference <code className="rounded bg-white/60 px-1">appointments</code>. Re-run the full{" "}
                  <code className="rounded bg-white/60 px-1">supabase/seed.sql</code> from the top (after{" "}
                  <code className="rounded bg-white/60 px-1">0001_core_ledger.sql</code>), not only the feedback section.
                </p>
              ) : null}
              {(emptyDiagnostics.customersForOrgCount ?? 0) > 0 &&
              (emptyDiagnostics.appointmentsForOrgCount ?? 0) > 0 &&
              (emptyDiagnostics.feedbackGlobalCount ?? 0) === 0 ? (
                <p className="mt-2 text-muted-foreground">
                  Core tables are seeded but <code className="rounded bg-white/60 px-1">feedback</code> really is empty
                  in Postgres (the SQL editor and this app use the same project when the host matches). The demo feedback
                  block may never have run, or a reset script dropped those rows. In the SQL editor, run the file{" "}
                  <code className="rounded bg-white/60 px-1">supabase/seed_feedback_addon.sql</code> from the repo, then
                  run <code className="rounded bg-white/60 px-1">select count(*) from feedback;</code> again - you
                  should see <strong>4</strong>. Reload this page.
                </p>
              ) : null}
              {emptyDiagnostics.snapshotErrors.length > 0 ? (
                <p className="mt-2 font-mono text-destructive text-[10px]">
                  {emptyDiagnostics.snapshotErrors.join(" | ")}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="border-b border-border pb-3 pt-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Flagged Reviews - Immediate Attention
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {flagged.length === 0 ? (
            <p className="text-sm text-muted-foreground">No flagged reviews in queue.</p>
          ) : (
            flagged.map((review) => (
              <div
                key={review.id}
                className="overflow-hidden rounded-xl border border-red-200 ring-1 ring-red-300"
              >
                {review.safetyFlag ? (
                  <div className="flex items-center gap-2 bg-red-600 px-4 py-1.5 text-xs font-semibold text-white">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Safety flag - immediate attention required
                  </div>
                ) : null}
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{review.guest}</span>
                    <Stars count={review.score} />
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${sourceStyle(review.source)}`}
                    >
                      {review.source}
                    </span>
                    <span className="text-xs text-muted-foreground">{review.dateLabel}</span>
                    <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      Urgency {review.urgency}/5
                    </span>
                  </div>

                  <blockquote className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground italic">
                    &ldquo;{review.comment}&rdquo;
                  </blockquote>

                  <div className="mt-3 flex gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${sentimentStyle(review.sentiment)}`}
                    >
                      {review.sentiment}
                    </span>
                  </div>

                  <div className="mt-3 rounded-lg border border-border bg-card p-3">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {review.draftTitle}
                    </p>
                    <p className="text-xs text-foreground leading-relaxed">{review.replyDraft}</p>
                  </div>
                  <div className="mt-3">
                    {review.canApproveReply ? (
                      <>
                        <ReviewActions feedbackId={review.id} approveLabel={review.approveLabel} />
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Approving marks the draft reviewed inside OpsPilot. Posting still happens outside the app.
                        </p>
                      </>
                    ) : review.pendingActionId ? (
                      <p className="text-[11px] text-muted-foreground">
                        This review has a manager follow-up plan below. Approve or dismiss that plan in Pending Manager Decisions.
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        This card is advisory only in the current demo workflow.
                      </p>
                    )}
                  </div>
                  </div>
                </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border pb-3 pt-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Pending Manager Decisions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {pendingActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending follow-up actions.</p>
          ) : (
            pendingActions.map((item) => (
              <div key={item.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">{item.guest}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {item.type.replace(/_/g, " ")}
                  </Badge>
                </div>
                {item.message ? (
                  <p className="mt-2 text-xs text-foreground leading-relaxed">
                    &ldquo;{item.message}&rdquo;
                  </p>
                ) : null}
                <div className="mt-3">
                  <DismissActions followUpActionId={item.id} approveLabel="Approve Plan" />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border pb-3 pt-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            All Feedback - {allFeedback.length} reviews
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allFeedback.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.guest}</TableCell>
                  <TableCell>
                    <Stars count={f.score} />
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sourceStyle(f.source)}`}
                    >
                      {f.source}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${sentimentStyle(f.sentiment)}`}
                    >
                      {f.sentiment}
                    </span>
                  </TableCell>
                  <TableCell>{followUpBadge(f.followUpStatus)}</TableCell>
                  <TableCell className="text-muted-foreground">{f.dateLabel}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
