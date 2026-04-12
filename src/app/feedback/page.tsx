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

// TODO: replace with Supabase query
const MOCK_FLAGGED = [
  {
    id: "fb-1",
    guest: "Priya Nair",
    score: 2,
    source: "internal",
    comment:
      "Server brought wrong dish despite my nut allergy being on file. I had a reaction. Unacceptable.",
    sentiment: "negative",
    urgency: 5,
    safety_flag: true,
    reply_draft:
      "Priya, we are deeply sorry for what happened during your visit. This falls far below our standards, especially given your allergy on file. The owner would like to call you personally — please expect a call today.",
    approveLabel: "Approve & Send",
    date: "Apr 11, 2026",
  },
  {
    id: "fb-2",
    guest: "Priya Nair",
    score: 1,
    source: "google",
    comment:
      "Still waiting on a response about my allergy complaint from last week. Extremely disappointed.",
    sentiment: "negative",
    urgency: 5,
    safety_flag: true,
    reply_draft:
      "We sincerely apologize, Priya. We take allergy incidents with the utmost seriousness and our owner is reaching out to you directly today. This is not the Ember Table experience.",
    approveLabel: "Approve & Post",
    date: "Apr 12, 2026",
  },
]

// TODO: replace with Supabase query
const MOCK_PENDING = [
  {
    id: "pa-1",
    guest: "Sofia Morales",
    type: "return_visit_nudge",
    message:
      "Hi Sofia, we've been thinking of you! Come back and try our new seasonal menu — we'd love to welcome you back with a complimentary appetizer on us.",
  },
]

// TODO: replace with Supabase query
const MOCK_ALL_FEEDBACK = [
  { id: "f1", guest: "Priya Nair", score: 2, source: "internal", sentiment: "negative", follow_up: "callback_needed", date: "Apr 11" },
  { id: "f2", guest: "Priya Nair", score: 1, source: "google", sentiment: "negative", follow_up: "callback_needed", date: "Apr 12" },
  { id: "f3", guest: "Marcus Webb", score: 5, source: "internal", sentiment: "positive", follow_up: "thankyou_sent", date: "Apr 9" },
  { id: "f4", guest: "Daniel Kim", score: 5, source: "opentable", sentiment: "positive", follow_up: "thankyou_sent", date: "Apr 10" },
  { id: "f5", guest: "Rachel Tran", score: 4, source: "internal", sentiment: "positive", follow_up: "thankyou_sent", date: "Apr 5" },
  { id: "f6", guest: "Jordan Ellis", score: 3, source: "yelp", sentiment: "neutral", follow_up: "none", date: "Apr 8" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function sourceStyle(source: string) {
  switch (source) {
    case "internal":  return "bg-teal-100 text-teal-700"
    case "google":    return "bg-red-100 text-red-600"
    case "yelp":      return "bg-red-100 text-red-600"
    case "opentable": return "bg-orange-100 text-orange-700"
    default:          return "bg-muted text-muted-foreground"
  }
}

function sentimentStyle(sentiment: string) {
  switch (sentiment) {
    case "positive": return "bg-emerald-100 text-emerald-700"
    case "negative": return "bg-red-100 text-red-600"
    default:         return "bg-yellow-100 text-yellow-700"
  }
}

function followUpBadge(status: string) {
  switch (status) {
    case "thankyou_sent":    return <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">Thank you sent</Badge>
    case "callback_needed":  return <Badge variant="destructive" className="text-[10px]">Callback needed</Badge>
    default:                 return <Badge variant="outline" className="text-[10px]">None</Badge>
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

// ── Page ─────────────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Customer Service</h1>
        <p className="text-xs text-muted-foreground">
          AI-analyzed guest reviews · recovery drafts · follow-up tracking
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Avg rating this week", value: "3.2 ★", color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
          { label: "Flagged reviews", value: "2", color: "text-red-600", bg: "bg-red-50 border-red-100" },
          { label: "Pending approvals", value: "1", color: "text-orange-600", bg: "bg-orange-50 border-orange-100" },
          { label: "Happy guests this week", value: "3", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Flagged reviews */}
      <Card>
        <CardHeader className="border-b border-border pb-3 pt-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Flagged Reviews — Immediate Attention
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {MOCK_FLAGGED.map((review) => (
            <div key={review.id} className="overflow-hidden rounded-xl border border-red-200 ring-1 ring-red-300">
              {/* Safety banner */}
              <div className="flex items-center gap-2 bg-red-600 px-4 py-1.5 text-xs font-semibold text-white">
                <AlertTriangle className="h-3.5 w-3.5" />
                Safety flag — immediate attention required
              </div>
              <div className="p-4">
                {/* Header row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">{review.guest}</span>
                  <Stars count={review.score} />
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${sourceStyle(review.source)}`}>
                    {review.source}
                  </span>
                  <span className="text-xs text-muted-foreground">{review.date}</span>
                  <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                    Urgency 5/5
                  </span>
                </div>

                {/* Comment */}
                <blockquote className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground italic">
                  "{review.comment}"
                </blockquote>

                {/* Sentiment */}
                <div className="mt-3 flex gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${sentimentStyle(review.sentiment)}`}>
                    {review.sentiment}
                  </span>
                </div>

                {/* Reply draft */}
                <div className="mt-3 rounded-lg border border-border bg-card p-3">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    AI-drafted reply
                  </p>
                  <p className="text-xs text-foreground leading-relaxed">
                    {review.reply_draft}
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-3">
                  <ReviewActions approveLabel={review.approveLabel} />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pending approvals */}
      <Card>
        <CardHeader className="border-b border-border pb-3 pt-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {MOCK_PENDING.map((item) => (
            <div key={item.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">{item.guest}</span>
                <Badge variant="outline" className="text-[10px]">
                  {item.type.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-foreground leading-relaxed">
                "{item.message}"
              </p>
              <div className="mt-3">
                <DismissActions approveLabel="Approve & Send" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* All feedback table */}
      <Card>
        <CardHeader className="border-b border-border pb-3 pt-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            All Feedback — {MOCK_ALL_FEEDBACK.length} reviews
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
              {MOCK_ALL_FEEDBACK.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.guest}</TableCell>
                  <TableCell><Stars count={f.score} /></TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sourceStyle(f.source)}`}>
                      {f.source}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${sentimentStyle(f.sentiment)}`}>
                      {f.sentiment}
                    </span>
                  </TableCell>
                  <TableCell>{followUpBadge(f.follow_up)}</TableCell>
                  <TableCell className="text-muted-foreground">{f.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
