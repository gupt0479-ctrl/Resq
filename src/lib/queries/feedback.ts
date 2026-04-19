import { db } from "@/lib/db"
import {
  feedback,
  customers,
  organizations,
  appointments,
  followUpActions,
} from "@/lib/db/schema"
import {
  eq,
  and,
  or,
  gte,
  desc,
  count,
  inArray,
  notInArray,
} from "drizzle-orm"
import type { FeedbackFollowUpStatus } from "@/lib/constants/enums"
import { DATABASE_URL } from "@/lib/env"

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
  draftTitle:     string
  canApproveReply: boolean
  pendingActionId: string | null
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

export type FeedbackEmptyContext =
  | { kind: "no_feedback_rows" }
  | { kind: "wrong_organization" }

/** Populated when the feedback list is empty — same counts the app sees (service role). */
export type FeedbackEmptyDiagnostics = {
  dbHost:                   string
  organizationsCount:       number | null
  customersForOrgCount:     number | null
  appointmentsForOrgCount:  number | null
  feedbackGlobalCount:      number | null
  /** Errors while counting (e.g. missing table). */
  snapshotErrors:           string[]
}

export type FeedbackPageData = {
  stats: {
    avgRatingWeek:      number | null
    flaggedCount:       number
    pendingApprovals:   number
    happyGuestsWeek:    number
  }
  flagged:         FeedbackCardRow[]
  pendingActions:  PendingFollowUpRow[]
  allFeedback:     FeedbackTableRow[]
  /** Set when `allFeedback` is empty — explains DB vs org configuration. */
  emptyContext: FeedbackEmptyContext | null
  /** Row-count snapshot when list is empty (verify .env project vs SQL editor). */
  emptyDiagnostics: FeedbackEmptyDiagnostics | null
}

function formatShortDate(iso: string | Date) {
  try {
    const d = typeof iso === "string" ? new Date(iso) : iso
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return String(iso).slice(0, 10)
  }
}

function isOpenFeedbackRow(r: { followUpStatus: string }) {
  return r.followUpStatus !== "resolved" && r.followUpStatus !== "thankyou_sent"
}

/** Flagged queue: open items with safety OR urgency>=4 OR explicit flagged. */
function isFlaggedQueueRow(r: {
  flagged: boolean
  safetyFlag: boolean
  urgency: number
  followUpStatus: string
}) {
  return isOpenFeedbackRow(r) && (r.flagged || r.safetyFlag || r.urgency >= 4)
}

export async function listFeedbackQuery(
  organizationId: string
): Promise<FeedbackPageData> {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekIso = weekAgo.toISOString()

  const rows = await db
    .select({
      id: feedback.id,
      customerId: feedback.customerId,
      guestNameSnapshot: feedback.guestNameSnapshot,
      score: feedback.score,
      source: feedback.source,
      comment: feedback.comment,
      sentiment: feedback.sentiment,
      urgency: feedback.urgency,
      safetyFlag: feedback.safetyFlag,
      flagged: feedback.flagged,
      replyDraft: feedback.replyDraft,
      followUpStatus: feedback.followUpStatus,
      managerSummary: feedback.managerSummary,
      receivedAt: feedback.receivedAt,
      customerFullName: customers.fullName,
    })
    .from(feedback)
    .leftJoin(customers, eq(feedback.customerId, customers.id))
    .where(eq(feedback.organizationId, organizationId))
    .orderBy(desc(feedback.receivedAt))
    .limit(200)

  const list = rows.map((r) => ({
    ...r,
    receivedAtStr: r.receivedAt.toISOString(),
  }))

  const guestName = (r: (typeof list)[0]) =>
    r.guestNameSnapshot ?? r.customerFullName ?? "Guest"

  let emptyContext: FeedbackEmptyContext | null = null
  let emptyDiagnostics: FeedbackEmptyDiagnostics | null = null

  if (list.length === 0) {
    const snapshotErrors: string[] = []

    let feedbackGlobalCount: number | null = null
    let organizationsCount: number | null = null
    let customersForOrgCount: number | null = null
    let appointmentsForOrgCount: number | null = null

    try {
      const [fbAll] = await db.select({ count: count() }).from(feedback)
      feedbackGlobalCount = Number(fbAll?.count ?? 0)
    } catch (e) {
      snapshotErrors.push(`feedback: ${e instanceof Error ? e.message : String(e)}`)
    }

    try {
      const [orgAll] = await db.select({ count: count() }).from(organizations)
      organizationsCount = Number(orgAll?.count ?? 0)
    } catch (e) {
      snapshotErrors.push(`organizations: ${e instanceof Error ? e.message : String(e)}`)
    }

    try {
      const [custOrg] = await db
        .select({ count: count() })
        .from(customers)
        .where(eq(customers.organizationId, organizationId))
      customersForOrgCount = Number(custOrg?.count ?? 0)
    } catch (e) {
      snapshotErrors.push(`customers: ${e instanceof Error ? e.message : String(e)}`)
    }

    try {
      const [apptOrg] = await db
        .select({ count: count() })
        .from(appointments)
        .where(eq(appointments.organizationId, organizationId))
      appointmentsForOrgCount = Number(apptOrg?.count ?? 0)
    } catch (e) {
      snapshotErrors.push(`appointments: ${e instanceof Error ? e.message : String(e)}`)
    }

    const globalCount = feedbackGlobalCount ?? 0
    emptyContext = globalCount === 0 ? { kind: "no_feedback_rows" } : { kind: "wrong_organization" }

    let dbHost = "(unset)"
    try {
      if (DATABASE_URL) dbHost = new URL(DATABASE_URL).hostname
    } catch {
      dbHost = "(invalid DATABASE_URL)"
    }

    emptyDiagnostics = {
      dbHost,
      organizationsCount,
      customersForOrgCount,
      appointmentsForOrgCount,
      feedbackGlobalCount,
      snapshotErrors,
    }
  }

  const weekDate = new Date(weekIso)
  const inWeek = list.filter((r) => r.receivedAt >= weekDate)
  const scores = inWeek.map((r) => r.score)
  const avgRatingWeek =
    scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null

  const [pendingCountResult] = await db
    .select({ count: count() })
    .from(followUpActions)
    .where(
      and(
        eq(followUpActions.organizationId, organizationId),
        eq(followUpActions.status, "pending")
      )
    )

  const pendingCount = Number(pendingCountResult?.count ?? 0)

  const pendingRows = await db
    .select({
      id: followUpActions.id,
      actionType: followUpActions.actionType,
      messageDraft: followUpActions.messageDraft,
      feedbackId: followUpActions.feedbackId,
    })
    .from(followUpActions)
    .where(
      and(
        eq(followUpActions.organizationId, organizationId),
        eq(followUpActions.status, "pending")
      )
    )
    .orderBy(desc(followUpActions.createdAt))
    .limit(20)

  const pendingFbIds = [...new Set(pendingRows.map((p) => p.feedbackId))]
  const pendingActionByFeedback = new Map<string, string>()
  for (const row of pendingRows) {
    if (!pendingActionByFeedback.has(row.feedbackId)) {
      pendingActionByFeedback.set(row.feedbackId, row.id)
    }
  }

  const guestByFeedback = new Map<string, string>()
  if (pendingFbIds.length) {
    const fbRows = await db
      .select({
        id: feedback.id,
        guestNameSnapshot: feedback.guestNameSnapshot,
        customerFullName: customers.fullName,
      })
      .from(feedback)
      .leftJoin(customers, eq(feedback.customerId, customers.id))
      .where(inArray(feedback.id, pendingFbIds))

    for (const fr of fbRows) {
      guestByFeedback.set(fr.id, fr.guestNameSnapshot ?? fr.customerFullName ?? "Guest")
    }
  }

  const flaggedItems = list.filter((r) =>
    isFlaggedQueueRow({
      flagged: r.flagged,
      safetyFlag: r.safetyFlag,
      urgency: r.urgency,
      followUpStatus: r.followUpStatus,
    })
  )

  const flaggedCount = flaggedItems.length
  const happyGuestsWeek = inWeek.filter((r) => r.score >= 4 && r.sentiment !== "negative").length

  const pendingActions: PendingFollowUpRow[] = pendingRows.map((p) => ({
    id:      p.id,
    guest:   guestByFeedback.get(p.feedbackId) ?? "Guest",
    type:    p.actionType,
    message: p.messageDraft ?? null,
  }))

  const flagged: FeedbackCardRow[] = flaggedItems
    .slice(0, 12)
    .map((r) => {
      const pendingActionId = pendingActionByFeedback.get(r.id) ?? null
      const isPublicSource = r.source === "google" || r.source === "yelp"
      const canApproveReply = isPublicSource && Boolean(r.replyDraft?.trim()) && !pendingActionId

      return {
        id:              r.id,
        guest:           guestName(r),
        score:           r.score,
        source:          r.source,
        comment:         r.comment,
        sentiment:       r.sentiment ?? "neutral",
        urgency:         r.urgency,
        safetyFlag:      r.safetyFlag,
        replyDraft:      r.replyDraft ?? r.managerSummary ?? "Draft will appear after AI analysis completes.",
        followUpStatus:  r.followUpStatus as FeedbackFollowUpStatus,
        dateLabel:       formatShortDate(r.receivedAt),
        approveLabel:    "Approve Reply",
        draftTitle:      isPublicSource ? "AI-drafted public reply" : "Manager summary",
        canApproveReply,
        pendingActionId,
      }
    })

  const allFeedback: FeedbackTableRow[] = list.map((r) => ({
    id:             r.id,
    guest:          guestName(r),
    score:          r.score,
    source:         r.source,
    sentiment:      r.sentiment ?? "neutral",
    followUpStatus: r.followUpStatus as FeedbackFollowUpStatus,
    dateLabel:      formatShortDate(r.receivedAt),
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
    emptyContext,
    emptyDiagnostics,
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
  organizationId: string
): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(feedback)
    .where(
      and(
        eq(feedback.organizationId, organizationId),
        notInArray(feedback.followUpStatus, ["resolved", "thankyou_sent"]),
        or(
          eq(feedback.flagged, true),
          eq(feedback.safetyFlag, true),
          gte(feedback.urgency, 4)
        )
      )
    )

  return Number(result?.count ?? 0)
}

export async function getFeedbackSpotlightForDashboard(
  organizationId: string,
  limit = 4
): Promise<DashboardFeedbackSpotlightItem[]> {
  const rows = await db
    .select({
      id: feedback.id,
      guestNameSnapshot: feedback.guestNameSnapshot,
      score: feedback.score,
      urgency: feedback.urgency,
      safetyFlag: feedback.safetyFlag,
      flagged: feedback.flagged,
      followUpStatus: feedback.followUpStatus,
      managerSummary: feedback.managerSummary,
      comment: feedback.comment,
      receivedAt: feedback.receivedAt,
      customerFullName: customers.fullName,
    })
    .from(feedback)
    .leftJoin(customers, eq(feedback.customerId, customers.id))
    .where(eq(feedback.organizationId, organizationId))
    .orderBy(desc(feedback.receivedAt))
    .limit(100)

  return rows
    .filter((r) =>
      isFlaggedQueueRow({
        flagged:         r.flagged,
        safetyFlag:      r.safetyFlag,
        urgency:         r.urgency,
        followUpStatus:  r.followUpStatus,
      })
    )
    .slice(0, limit)
    .map((r) => {
      const guest = r.guestNameSnapshot ?? r.customerFullName ?? "Guest"
      const summary =
        r.managerSummary ||
        (r.comment.slice(0, 120) || "Needs attention")
      return {
        id:         r.id,
        guestName:  guest,
        score:      r.score,
        summary,
        urgency:    r.urgency,
        safetyFlag: r.safetyFlag,
      }
    })
}

export async function getFeedbackPageData(
  organizationId: string
): Promise<FeedbackPageData> {
  return listFeedbackQuery(organizationId)
}
