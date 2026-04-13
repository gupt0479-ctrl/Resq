import type { SupabaseClient } from "@supabase/supabase-js"
import type { FeedbackFollowUpStatus } from "@/lib/constants/enums"

export type FeedbackCardRow = {
  id:             string
  guest:          string
  score:          number
  source:         string
  comment:        string
  sentiment:      string
  urgency:        number
  safetyFlag:     boolean
  replyDraft:     string | null
  followUpStatus: FeedbackFollowUpStatus
  dateLabel:      string
  approveLabel:   string
}

export type FeedbackTableRow = {
  id:             string
  guest:          string
  score:          number
  source:         string
  sentiment:      string
  followUpStatus: FeedbackFollowUpStatus
  dateLabel:      string
}

export type PendingFollowUpRow = {
  id:           string
  guest:        string
  type:         string
  message:      string | null
}

export type FeedbackPageData = {
  stats: {
    avgRatingWeek:      number | null
    flaggedCount:     number
    pendingApprovals: number
    happyGuestsWeek:  number
  }
  flagged:        FeedbackCardRow[]
  pendingActions: PendingFollowUpRow[]
  allFeedback:    FeedbackTableRow[]
}

function formatShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return iso.slice(0, 10)
  }
}

/** Flagged queue: safety OR urgency>=4 OR explicit flagged */
function isFlaggedQueueRow(r: {
  flagged: boolean
  safety_flag: boolean
  urgency: number
}) {
  return r.flagged || r.safety_flag || r.urgency >= 4
}

export async function getFeedbackPageData(
  client: SupabaseClient,
  organizationId: string
): Promise<FeedbackPageData> {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekIso = weekAgo.toISOString()

  const { data: rows, error } = await client
    .from("feedback")
    .select(
      "id, customer_id, guest_name_snapshot, score, source, comment, sentiment, urgency, safety_flag, flagged, reply_draft, follow_up_status, manager_summary, received_at, customers ( full_name )"
    )
    .eq("organization_id", organizationId)
    .order("received_at", { ascending: false })
    .limit(200)

  if (error) throw new Error(error.message)

  const list = (rows ?? []) as Array<{
    id: string
    customer_id: string | null
    guest_name_snapshot: string | null
    score: number
    source: string
    comment: string
    sentiment: string | null
    urgency: number
    safety_flag: boolean
    flagged: boolean
    reply_draft: string | null
    follow_up_status: string
    manager_summary: string | null
    received_at: string
    customers: { full_name?: string } | null
  }>

  const guestName = (r: (typeof list)[0]) =>
    r.guest_name_snapshot ?? r.customers?.full_name ?? "Guest"

  const inWeek = list.filter((r) => r.received_at >= weekIso)
  const scores = inWeek.map((r) => r.score)
  const avgRatingWeek =
    scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null

  const flaggedCount = list.filter((r) => r.flagged || r.safety_flag).length
  const happyGuestsWeek = inWeek.filter((r) => r.score >= 4 && r.sentiment !== "negative").length

  const { count: pendingCount } = await client
    .from("follow_up_actions")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "pending")

  const { data: pendingRows } = await client
    .from("follow_up_actions")
    .select("id, action_type, message_draft, feedback_id")
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(20)

  const pendingFbIds = [...new Set((pendingRows ?? []).map((p) => p.feedback_id as string))]
  const guestByFeedback = new Map<string, string>()
  if (pendingFbIds.length) {
    const { data: fbRows } = await client
      .from("feedback")
      .select("id, guest_name_snapshot, customer_id, customers ( full_name )")
      .in("id", pendingFbIds)
    for (const fr of fbRows ?? []) {
      const r = fr as {
        id: string
        guest_name_snapshot: string | null
        customers: { full_name?: string } | null
      }
      guestByFeedback.set(
        r.id,
        r.guest_name_snapshot ?? r.customers?.full_name ?? "Guest"
      )
    }
  }

  const pendingActions: PendingFollowUpRow[] = (pendingRows ?? []).map((p) => ({
    id:      p.id as string,
    guest:   guestByFeedback.get(p.feedback_id as string) ?? "Guest",
    type:    p.action_type as string,
    message: (p.message_draft as string | null) ?? null,
  }))

  const flagged: FeedbackCardRow[] = list
    .filter(isFlaggedQueueRow)
    .slice(0, 12)
    .map((r) => ({
      id:             r.id,
      guest:          guestName(r),
      score:          r.score,
      source:         r.source,
      comment:        r.comment,
      sentiment:      r.sentiment ?? "neutral",
      urgency:        r.urgency,
      safetyFlag:     r.safety_flag,
      replyDraft:
        r.reply_draft ??
        r.manager_summary ??
        "Draft will appear after AI analysis completes.",
      followUpStatus: r.follow_up_status as FeedbackFollowUpStatus,
      dateLabel:      formatShortDate(r.received_at),
      approveLabel:
        r.source === "google" || r.source === "yelp" ? "Approve & Post" : "Approve & Send",
    }))

  const allFeedback: FeedbackTableRow[] = list.map((r) => ({
    id:             r.id,
    guest:          guestName(r),
    score:          r.score,
    source:         r.source,
    sentiment:      r.sentiment ?? "neutral",
    followUpStatus: r.follow_up_status as FeedbackFollowUpStatus,
    dateLabel:      formatShortDate(r.received_at),
  }))

  return {
    stats: {
      avgRatingWeek,
      flaggedCount,
      pendingApprovals: pendingCount ?? pendingActions.length,
      happyGuestsWeek,
    },
    flagged,
    pendingActions,
    allFeedback,
  }
}

export type DashboardFeedbackSpotlightItem = {
  id:          string
  guestName:   string
  score:       number
  summary:     string
  urgency:     number
  safetyFlag:  boolean
}

export async function countUnhappyGuestsForDashboard(
  client: SupabaseClient,
  organizationId: string
): Promise<number> {
  const { count, error } = await client
    .from("feedback")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .or("flagged.eq.true,urgency.gte.4")

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function getFeedbackSpotlightForDashboard(
  client: SupabaseClient,
  organizationId: string,
  limit = 4
): Promise<DashboardFeedbackSpotlightItem[]> {
  const { data, error } = await client
    .from("feedback")
    .select(
      "id, guest_name_snapshot, score, urgency, safety_flag, manager_summary, comment, customers ( full_name )"
    )
    .eq("organization_id", organizationId)
    .or("flagged.eq.true,safety_flag.eq.true,urgency.gte.4")
    .order("received_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return (data ?? []).map((r: Record<string, unknown>) => {
    const cust = r.customers as { full_name?: string } | null
    const guest = (r.guest_name_snapshot as string) ?? cust?.full_name ?? "Guest"
    const summary =
      (r.manager_summary as string) ||
      (String(r.comment ?? "").slice(0, 120) || "Needs attention")
    return {
      id:         r.id as string,
      guestName:  guest,
      score:      Number(r.score),
      summary,
      urgency:    Number(r.urgency ?? 0),
      safetyFlag: Boolean(r.safety_flag),
    }
  })
}
