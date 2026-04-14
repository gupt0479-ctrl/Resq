"use client"

import { useState } from "react"
import {
  Star,
  Flag,
  ShieldAlert,
  Clock,
  Send,
  Phone,
  ThumbsUp,
  ThumbsDown,
  Minus,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  CheckCircle2,
  CheckCheck,
  Pencil,
  X,
  RefreshCw,
  ArrowUpDown,
  Bell,
  MessageSquare,
  Mail,
} from "lucide-react"
import type { FeedbackCardRow, FeedbackTableRow, PendingFollowUpRow } from "@/lib/queries/feedback"

// ── Types ──────────────────────────────────────────────────────────────────────

type ToneKey = "professional" | "warm" | "firm" | "brief"
type ToneVariants = Record<ToneKey, string>

type ExtendedFeedbackCard = FeedbackCardRow & {
  topics?: string[]
  toneVariants?: ToneVariants
  churnRisk?: "low" | "medium" | "high"
  recoveryAction?: { type: string; priority: string; channel: string }
  internalNote?: string
}

type ModalState = {
  cardId: string
  guestName: string
  source: string
  draftReply: string
  toneVariants?: ToneVariants
  activeTab: "reply" | "recovery"
}

type SortKey = "guest" | "score" | "source" | "sentiment" | "date"
type SortDir = "asc" | "desc"
type TabId = "flagged" | "appointments" | "pending" | "all"

// ── Mock data (TODO: replace with Supabase query) ──────────────────────────────

const CELEBRITY_CARDS: ExtendedFeedbackCard[] = [
  {
    id: "celeb-justin",
    guest: "Justin Bieber",
    score: 1,
    source: "internal",
    comment:
      "My appetite went away when I saw my ex Selena Gomez walk in. Couldn't even finish the Wagyu. Not the restaurant's fault but still 2 stars.",
    sentiment: "negative",
    urgency: 3,
    safetyFlag: false,
    replyDraft:
      "Justin, we're so sorry the evening didn't go as planned. We'd love to make it up to you — your next visit is on us.",
    followUpStatus: "none",
    dateLabel: "Apr 14, 2026",
    approveLabel: "Approve Reply",
    draftTitle: "AI-drafted reply",
    canApproveReply: false,
    pendingActionId: null,
    topics: ["food_quality", "ambiance"],
    churnRisk: "low",
    recoveryAction: { type: "comp_offer", priority: "normal", channel: "email" },
    internalNote:
      "Guest distracted by personal situation. Food was not the issue. Low recovery risk.",
    toneVariants: {
      professional:
        "Dear Mr. Bieber, we regret that your experience was affected by circumstances outside our control. We would welcome the opportunity to host you again.",
      warm:
        "Justin, we completely understand — some evenings just don't go as planned. We'd love to make your next visit a truly special one, just for you.",
      firm:
        "We appreciate your feedback. The kitchen performed to standard that evening. We hope to see you again under better circumstances.",
      brief: "Sorry it wasn't perfect, Justin. Next one's on us.",
    },
  },
  {
    id: "celeb-gordon",
    guest: "Gordon Ramsay",
    score: 3,
    source: "google",
    comment:
      "The wagyu was cooked correctly — medium rare, good crust. But the sauce was BLAND. Absolute disaster. The service recovered well though. 3 stars, could be 4 if the kitchen sorts itself out.",
    sentiment: "neutral",
    urgency: 3,
    safetyFlag: false,
    replyDraft:
      "Chef Ramsay, we genuinely appreciate the honest feedback. We are reviewing the sauce preparation immediately. We hope to earn that 4th star on your next visit.",
    followUpStatus: "none",
    dateLabel: "Apr 14, 2026",
    approveLabel: "Approve Reply",
    draftTitle: "AI-drafted public reply",
    canApproveReply: true,
    pendingActionId: null,
    topics: ["food_quality", "service_speed"],
    churnRisk: "medium",
    recoveryAction: { type: "personal_call", priority: "high", channel: "phone" },
    internalNote:
      "High profile Google review — respond within the hour. Kitchen lead must see this today. This is actually useful critique — act on it.",
    toneVariants: {
      professional:
        "Thank you for your detailed feedback, Chef Ramsay. We take culinary critique seriously and are reviewing our sauce preparations immediately.",
      warm:
        "Chef Ramsay, your feedback means the world to us. We are taking your notes straight to the kitchen — we want to earn that 4th star.",
      firm:
        "We acknowledge your feedback. Our kitchen team is reviewing the sauce profile. We stand by our wagyu preparation and hope to demonstrate improvement on your next visit.",
      brief: "Noted on the sauce. Kitchen is on it. Hope to earn star 4 next time, Chef.",
    },
  },
  {
    id: "celeb-elon",
    guest: "Elon Musk",
    score: 2,
    source: "yelp",
    comment:
      "Waited 47 minutes for a table I reserved 3 weeks ago. Time is the most valuable resource and this restaurant has no respect for it. Food was fine. Management needs first principles thinking.",
    sentiment: "negative",
    urgency: 4,
    safetyFlag: false,
    replyDraft:
      "Elon, a 47-minute wait for a confirmed reservation is completely unacceptable and we own that fully. We'd love the opportunity to restore your confidence in us.",
    followUpStatus: "none",
    dateLabel: "Apr 14, 2026",
    approveLabel: "Approve Reply",
    draftTitle: "AI-drafted public reply",
    canApproveReply: true,
    pendingActionId: null,
    topics: ["service_speed", "wait_time", "staff_attitude"],
    churnRisk: "high",
    recoveryAction: { type: "comp_offer", priority: "high", channel: "email" },
    internalNote:
      "Public Yelp review — needs response within the hour. Reservation system failure, not a staffing issue. Escalate to manager now.",
    toneVariants: {
      professional:
        "We sincerely apologize for the wait time, Mr. Musk. A 47-minute delay for a confirmed reservation is unacceptable and we are reviewing our reservation management process immediately.",
      warm:
        "Elon, we are truly sorry. Your time is valuable and we failed to respect that. We want to make this right personally.",
      firm:
        "The wait time you experienced was unacceptable. We have identified the reservation system failure and are correcting it. We hope you will give us another chance.",
      brief: "47 minutes is inexcusable. We own it. Let us make it right.",
    },
  },
]

// TODO: replace with Supabase query
const MOCK_APPOINTMENTS = [
  { id: "a1", guest: "Marcus Webb",  date: "Apr 14", time: "7:00 PM", covers: 2, status: "completed", followUp: "thankyou_sent" },
  { id: "a2", guest: "Priya Nair",   date: "Apr 13", time: "2:00 PM", covers: 4, status: "completed", followUp: "callback_needed" },
  { id: "a3", guest: "Daniel Kim",   date: "Apr 14", time: "8:00 PM", covers: 4, status: "confirmed", followUp: "none" },
  { id: "a4", guest: "Rachel Tran",  date: "Apr 12", time: "3:00 PM", covers: 2, status: "completed", followUp: "resolved" },
  { id: "a5", guest: "James Okafor", date: "Apr 15", time: "6:30 PM", covers: 6, status: "scheduled", followUp: "none" },
] as const

// TODO: replace with Supabase query
const AUTO_SENT_ITEMS = [
  { id: "as1", guest: "Sofia Morales", type: "thank_you",    time: "9:14 AM", preview: "Thank you for dining with us, Sofia — we loved having you!" },
  { id: "as2", guest: "Marcus Webb",   type: "confirmation", time: "8:02 AM", preview: "Your reservation for tonight at 7 PM is confirmed." },
]

const TONE_LABELS: Record<ToneKey, string> = {
  professional: "Professional",
  warm:         "Warm",
  firm:         "Firm",
  brief:        "Brief",
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function StarsRow({ count, size = "sm" }: { count: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-4 w-4" : "h-3 w-3"
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${cls} ${i < count ? "fill-amber-400 text-amber-400" : "fill-transparent text-muted-foreground/30"}`}
        />
      ))}
    </span>
  )
}

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, string> = {
    google:    "bg-red-500/15 text-red-500 border border-red-500/30",
    yelp:      "bg-red-500/15 text-red-500 border border-red-500/30",
    internal:  "bg-teal-500/15 text-teal-500 border border-teal-500/30",
    opentable: "bg-blue-500/15 text-blue-500 border border-blue-500/30",
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${map[source] ?? "bg-muted text-muted-foreground border border-border"}`}>
      {source}
    </span>
  )
}

function UrgencyBadge({ urgency }: { urgency: number }) {
  const cls =
    urgency >= 5 ? "bg-red-500/15 text-red-600 border border-red-500/30 animate-pulse" :
    urgency >= 4 ? "bg-orange-500/15 text-orange-600 border border-orange-500/30" :
    urgency >= 3 ? "bg-amber-500/15 text-amber-600 border border-amber-500/30" :
                   "bg-muted text-muted-foreground border border-border"
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      Urgency {urgency}/5
    </span>
  )
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  if (sentiment === "positive")
    return <span className="flex items-center gap-1 text-xs text-green-500"><ThumbsUp className="h-3 w-3" />positive</span>
  if (sentiment === "negative")
    return <span className="flex items-center gap-1 text-xs text-red-500"><ThumbsDown className="h-3 w-3" />negative</span>
  return <span className="flex items-center gap-1 text-xs text-amber-500"><Minus className="h-3 w-3" />neutral</span>
}

function ChurnBadge({ risk }: { risk: "low" | "medium" | "high" }) {
  if (risk === "high")   return <span className="flex items-center gap-1 text-xs text-red-500"><TrendingUp className="h-3 w-3" />high risk</span>
  if (risk === "medium") return <span className="flex items-center gap-1 text-xs text-amber-500"><Minus className="h-3 w-3" />medium risk</span>
  return <span className="flex items-center gap-1 text-xs text-green-500"><TrendingDown className="h-3 w-3" />low risk</span>
}

function AppointmentStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmed:  "bg-blue-500/15 text-blue-600 border border-blue-500/30",
    seated:     "bg-green-500/15 text-green-600 border border-green-500/30",
    scheduled:  "bg-muted text-muted-foreground border border-border",
    completed:  "bg-teal-500/15 text-teal-600 border border-teal-500/30",
    no_show:    "bg-red-500/15 text-red-500 border border-red-500/30",
    in_progress:"bg-purple-500/15 text-purple-600 border border-purple-500/30",
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${map[status] ?? "bg-muted text-muted-foreground border border-border"}`}>
      {status.replace("_", " ")}
    </span>
  )
}

// ── Edit Draft Modal ───────────────────────────────────────────────────────────

function EditDraftModal({
  modal,
  onClose,
  onSent,
}: {
  modal: ModalState
  onClose: () => void
  onSent: (cardId: string) => void
}) {
  const [activeTab, setActiveTab] = useState<"reply" | "recovery">(modal.activeTab)
  const [draftText, setDraftText] = useState(modal.draftReply)
  const [textOpacity, setTextOpacity] = useState(1)
  const [activeTone, setActiveTone] = useState<ToneKey | null>(null)
  const [sent, setSent] = useState(false)

  const CHAR_LIMIT = 500
  const len = draftText.length
  const charClass = len > CHAR_LIMIT ? "text-red-500" : len > CHAR_LIMIT * 0.9 ? "text-amber-500" : "text-green-500"

  function handleTone(key: ToneKey) {
    const next = modal.toneVariants?.[key]
    if (!next) return
    setActiveTone(key)
    setTextOpacity(0)
    setTimeout(() => {
      setDraftText(next)
      setTextOpacity(1)
    }, 150)
  }

  function handleSend() {
    setSent(true)
    setTimeout(() => {
      onSent(modal.cardId)
      onClose()
    }, 800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-foreground">{modal.guestName}</span>
              <SourceBadge source={modal.source} />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">Claude Sonnet drafted this reply</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Inner tabs */}
        <div className="flex border-b border-border px-6">
          {(["reply", "recovery"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === t
                  ? "border-blue-500 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "reply" ? "Public Reply" : "Recovery Message"}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {/* Tone pills */}
          {modal.toneVariants && (
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TONE_LABELS) as ToneKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => handleTone(key)}
                  className={`rounded-full px-3 py-1 text-sm border transition-colors cursor-pointer ${
                    activeTone === key
                      ? "bg-blue-500/15 text-blue-600 border-blue-500/40"
                      : "bg-muted border-border text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {TONE_LABELS[key]}
                </button>
              ))}
            </div>
          )}

          {/* Textarea */}
          <div style={{ opacity: textOpacity, transition: "opacity 150ms ease" }}>
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={6}
              className="w-full resize-vertical rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[140px]"
            />
          </div>
          <p className={`text-right text-xs ${charClass}`}>{len} / {CHAR_LIMIT}</p>

          {/* Footer buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSend}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                sent
                  ? "bg-green-500 text-white"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {sent ? <><CheckCircle className="h-4 w-4" />Sent!</> : <><Send className="h-4 w-4" />Send Now</>}
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Save Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Flagged Card ───────────────────────────────────────────────────────────────

function FlaggedCard({
  card,
  isApproved,
  onApprove,
  onEdit,
}: {
  card: ExtendedFeedbackCard
  isApproved: boolean
  onApprove: (id: string) => void
  onEdit: (card: ExtendedFeedbackCard) => void
}) {
  const isPublic = card.source === "google" || card.source === "yelp"

  return (
    <div
      className={`rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${
        isApproved
          ? "bg-green-500/5 border-green-500/30"
          : "bg-card border-border"
      }`}
    >
      {/* Safety banner */}
      {card.safetyFlag && (
        <div className="flex items-center gap-2 bg-red-500 px-4 py-2 text-xs font-semibold text-white">
          <ShieldAlert className="h-3.5 w-3.5 animate-pulse" />
          Safety flag — immediate attention required
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Top row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-foreground">{card.guest}</span>
            <SourceBadge source={card.source} />
          </div>
          <div className="flex items-center gap-2">
            <UrgencyBadge urgency={card.urgency} />
            <span className="text-xs text-muted-foreground">{card.dateLabel}</span>
          </div>
        </div>

        {/* Stars */}
        <div className="flex items-center gap-2">
          <StarsRow count={card.score} />
          <span className="text-xs text-muted-foreground">{card.score}/5</span>
        </div>

        {/* Comment block */}
        <div className="relative bg-muted/50 rounded-xl p-4">
          <span className="absolute left-3 top-1 text-4xl leading-none text-blue-500/30 select-none">&ldquo;</span>
          <p className="pt-4 text-sm italic text-foreground leading-relaxed">{card.comment}</p>
          <p className="mt-2 text-right text-[10px] text-muted-foreground">via {card.source}</p>
        </div>

        {/* Three-column detail row */}
        <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted/30 p-3">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Sentiment</p>
            <SentimentBadge sentiment={card.sentiment} />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Topics</p>
            <div className="flex flex-wrap gap-1">
              {(card.topics ?? []).slice(0, 3).map((t) => (
                <span key={t} className="rounded-full border border-border bg-muted px-2 py-0.5 text-[9px] text-muted-foreground capitalize">
                  {t.replace(/_/g, " ")}
                </span>
              ))}
              {(card.topics ?? []).length > 3 && (
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[9px] text-muted-foreground">
                  +{card.topics!.length - 3}
                </span>
              )}
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Churn risk</p>
            {card.churnRisk ? <ChurnBadge risk={card.churnRisk} /> : <span className="text-xs text-muted-foreground">—</span>}
          </div>
        </div>

        {/* AI Reply Draft */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">AI drafted reply</span>
              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[9px] font-semibold text-blue-600 border border-blue-500/30">
                Claude Sonnet
              </span>
            </div>
            {isPublic && (
              <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[9px] font-semibold text-red-500 border border-red-500/30">
                Public reply
              </span>
            )}
          </div>
          <div className="border-l-4 border-l-blue-500 rounded-xl bg-blue-500/5 border border-blue-500/20 p-4">
            <p className="text-sm italic text-foreground leading-relaxed">{card.replyDraft ?? "Draft will appear after AI analysis completes."}</p>
            <p className="mt-2 text-[10px] text-muted-foreground">Recommended before posting — manager review</p>
          </div>
        </div>

        {/* Recovery action */}
        {card.recoveryAction && (
          <div>
            <p className="mb-2 text-xs font-semibold text-foreground">Manager action</p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-muted border border-border px-2 py-0.5 text-[10px] text-muted-foreground capitalize">
                {card.recoveryAction.type.replace(/_/g, " ")}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                card.recoveryAction.priority === "high"
                  ? "bg-orange-500/15 text-orange-600 border-orange-500/30"
                  : "bg-muted text-muted-foreground border-border"
              }`}>
                {card.recoveryAction.priority}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-muted border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                {card.recoveryAction.channel === "email" ? <Mail className="h-2.5 w-2.5" /> : <Phone className="h-2.5 w-2.5" />}
                {card.recoveryAction.channel}
              </span>
            </div>
          </div>
        )}

        {/* Internal note */}
        {card.internalNote && (
          <div className="border-l-2 border-l-muted-foreground/30 pl-3">
            <p className="text-[10px] text-muted-foreground/60 mb-0.5">Private · not visible to guest</p>
            <p className="text-xs italic text-muted-foreground">{card.internalNote}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <button
            onClick={() => onApprove(card.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              isApproved
                ? "bg-green-500 text-white"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isApproved ? <CheckCircle className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
            {isApproved ? "Sent" : "Approve & Send"}
          </button>
          <button
            onClick={() => onEdit(card)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Draft
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
            <CheckCheck className="h-3.5 w-3.5" />
            Mark Resolved
          </button>
          <button className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground/60 hover:bg-muted transition-colors">
            <X className="h-3.5 w-3.5" />
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function FeedbackPageClient({
  stats,
  flagged,
  pendingActions,
  allFeedback,
}: {
  stats: {
    avgRatingWeek: number | null
    flaggedCount: number
    pendingApprovals: number
    happyGuestsWeek: number
  }
  flagged: FeedbackCardRow[]
  pendingActions: PendingFollowUpRow[]
  allFeedback: FeedbackTableRow[]
}) {
  const [activeTab, setActiveTab]     = useState<TabId>("flagged")
  const [modal, setModal]             = useState<ModalState | null>(null)
  const [approved, setApproved]       = useState<Set<string>>(new Set())
  const [approvedPending, setApprovedPending] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey]         = useState<SortKey>("date")
  const [sortDir, setSortDir]         = useState<SortDir>("desc")
  const [autoSentOpen, setAutoSentOpen] = useState(false)

  // Merge celebrity cards first, then DB flagged
  const allFlagged: ExtendedFeedbackCard[] = [
    ...CELEBRITY_CARDS,
    ...flagged,
  ]

  // Derived stats
  const safetyFlagCount  = allFlagged.filter((c) => c.safetyFlag).length
  const urgency5Count    = allFlagged.filter((c) => c.urgency === 5).length
  const callbacksNeeded  = allFeedback.filter((f) => f.followUpStatus === "callback_needed").length
  const autoSentCount    = AUTO_SENT_ITEMS.length

  const avgRatingNum = stats.avgRatingWeek ?? 0

  // Stat cards config
  const statCards = [
    {
      label: "Avg rating", value: stats.avgRatingWeek != null ? String(stats.avgRatingWeek) : "--",
      icon: <Star className="h-4 w-4 text-blue-500" />, border: "border-t-blue-500", shadow: "shadow-blue-500/10",
      isRating: true,
    },
    {
      label: "Flagged reviews", value: String(allFlagged.length),
      icon: <Flag className="h-4 w-4 text-red-500" />, border: "border-t-red-500", shadow: "shadow-red-500/10",
      isRating: false,
    },
    {
      label: "Safety flags", value: String(safetyFlagCount),
      icon: <ShieldAlert className="h-4 w-4 text-red-600" />, border: "border-t-red-600", shadow: "shadow-red-600/10",
      isRating: false,
    },
    {
      label: "Pending approvals", value: String(stats.pendingApprovals),
      icon: <Clock className="h-4 w-4 text-amber-500" />, border: "border-t-amber-500", shadow: "shadow-amber-500/10",
      isRating: false,
    },
    {
      label: "Auto-sent today", value: String(autoSentCount),
      icon: <Send className="h-4 w-4 text-green-500" />, border: "border-t-green-500", shadow: "shadow-green-500/10",
      isRating: false,
    },
    {
      label: "Callbacks needed", value: String(callbacksNeeded),
      icon: <Phone className="h-4 w-4 text-orange-500" />, border: "border-t-orange-500", shadow: "shadow-orange-500/10",
      isRating: false,
    },
  ]

  // Sort allFeedback
  const sorted = [...allFeedback].sort((a, b) => {
    let av: string | number = ""
    let bv: string | number = ""
    if (sortKey === "guest")     { av = a.guest;     bv = b.guest }
    if (sortKey === "score")     { av = a.score;     bv = b.score }
    if (sortKey === "source")    { av = a.source;    bv = b.source }
    if (sortKey === "sentiment") { av = a.sentiment; bv = b.sentiment }
    if (sortKey === "date")      { av = a.dateLabel; bv = b.dateLabel }
    if (av < bv) return sortDir === "asc" ? -1 : 1
    if (av > bv) return sortDir === "asc" ? 1 : -1
    return 0
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  function handleApprove(id: string) {
    setApproved((prev) => new Set([...prev, id]))
  }

  function handleEdit(card: ExtendedFeedbackCard) {
    setModal({
      cardId:     card.id,
      guestName:  card.guest,
      source:     card.source,
      draftReply: card.replyDraft ?? "",
      toneVariants: card.toneVariants,
      activeTab:  "reply",
    })
  }

  function handleModalSent(cardId: string) {
    handleApprove(cardId)
  }

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "flagged",      label: "Flagged",          count: allFlagged.length },
    { id: "appointments", label: "Appointments",      count: MOCK_APPOINTMENTS.length },
    { id: "pending",      label: "Pending Approval",  count: pendingActions.length },
    { id: "all",          label: "All Feedback",      count: allFeedback.length },
  ]

  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div
        className="space-y-5 p-6 min-h-screen bg-background"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--muted-foreground) / 0.06) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Customer Service</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {/* Claude pill */}
              <span className="flex items-center gap-1.5 rounded-full bg-teal-500/15 border border-teal-500/30 px-3 py-1 text-xs font-medium text-teal-600">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                Claude Sonnet · Active
              </span>
              {/* Scope pill */}
              <span className="rounded-full bg-blue-500/15 border border-blue-500/30 px-3 py-1 text-xs font-medium text-blue-600">
                Reviews · Appointments · Follow-ups
              </span>
              {/* Urgency pill */}
              {urgency5Count > 0 && (
                <span className="animate-pulse rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-600">
                  {urgency5Count} urgent · needs attention
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
            Last analyzed: 2 minutes ago
          </div>
        </div>

        {/* ── Stat cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={`relative overflow-hidden rounded-xl border-t-2 border border-border bg-card p-4 shadow-lg ${card.border} ${card.shadow}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-bold text-foreground tabular-nums">{card.value}</p>
                  {card.isRating && stats.avgRatingWeek != null && (
                    <div className="mt-1">
                      <StarsRow count={Math.round(avgRatingNum)} size="md" />
                    </div>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground leading-snug">{card.label}</p>
                </div>
                <div className="shrink-0 mt-0.5">{card.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tab bar ───────────────────────────────────────────────────────── */}
        <div className="sticky top-16 z-10 -mx-6 bg-background/80 backdrop-blur-md border-b border-border px-6 py-0">
          <div className="flex gap-0 overflow-x-auto">
            {tabs.map((tab) => {
              const isFlagged  = tab.id === "flagged"
              const isPending  = tab.id === "pending"
              const badgeCls   = isFlagged && tab.count > 0 ? "bg-red-500 text-white" :
                                 isPending && tab.count > 0 ? "bg-amber-500 text-white" :
                                 "bg-muted text-muted-foreground"
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-500 text-foreground font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${badgeCls}`}>
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Tab content ───────────────────────────────────────────────────── */}
        {activeTab === "flagged" && (
          <div className="space-y-4">
            {allFlagged.length === 0 ? (
              <p className="text-sm text-muted-foreground">No flagged reviews in queue.</p>
            ) : (
              allFlagged.map((card) => (
                <FlaggedCard
                  key={card.id}
                  card={card}
                  isApproved={approved.has(card.id)}
                  onApprove={handleApprove}
                  onEdit={handleEdit}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "appointments" && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {["Guest", "Date", "Time", "Covers", "Status", "Follow-up", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_APPOINTMENTS.map((appt) => (
                    <tr key={appt.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{appt.guest}</td>
                      <td className="px-4 py-3 text-muted-foreground">{appt.date}</td>
                      <td className="px-4 py-3 text-muted-foreground">{appt.time}</td>
                      <td className="px-4 py-3 text-muted-foreground">{appt.covers}</td>
                      <td className="px-4 py-3"><AppointmentStatusBadge status={appt.status} /></td>
                      <td className="px-4 py-3">
                        {appt.followUp === "thankyou_sent" && (
                          <span className="text-[10px] font-medium text-teal-600">Thank you sent</span>
                        )}
                        {appt.followUp === "callback_needed" && (
                          <span className="text-[10px] font-medium text-red-500">Callback needed</span>
                        )}
                        {appt.followUp === "resolved" && (
                          <span className="text-[10px] font-medium text-muted-foreground">Resolved</span>
                        )}
                        {appt.followUp === "none" && (
                          <span className="text-[10px] text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            title="Send Reminder"
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <Bell className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Post-visit Follow-up"
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Send Confirmation"
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "pending" && (
          <div className="space-y-4">
            {pendingActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending follow-up actions.</p>
            ) : (
              pendingActions.map((item) => {
                const isApprovedItem = approvedPending.has(item.id)
                const borderAccent = "border-l-4 border-l-blue-500"
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border border-border bg-card p-5 ${borderAccent} transition-all duration-200 ${
                      isApprovedItem ? "bg-green-500/5 border-green-500/30" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="font-semibold text-foreground">{item.guest}</span>
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground capitalize">
                        {item.type.replace(/_/g, " ")}
                      </span>
                      <span className="rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                        normal priority
                      </span>
                      <span className="flex items-center gap-1 rounded-full bg-muted border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                        <Mail className="h-2.5 w-2.5" />email
                      </span>
                    </div>
                    {item.message && (
                      <div className="rounded-xl bg-muted/50 border border-border p-4 mb-3">
                        <p className="text-sm text-foreground">{item.message}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs text-muted-foreground">Queued · Will send via email</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setApprovedPending((prev) => new Set([...prev, item.id]))}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                            isApprovedItem
                              ? "bg-green-500 text-white"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {isApprovedItem ? <><CheckCircle className="h-3 w-3" />Sent</> : <><Send className="h-3 w-3" />Approve & Send</>}
                        </button>
                        <button className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground/60 hover:bg-muted transition-colors">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {activeTab === "all" && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {(
                        [
                          { key: "guest" as SortKey,     label: "Guest" },
                          { key: "score" as SortKey,     label: "Score" },
                          { key: "source" as SortKey,    label: "Source" },
                          { key: "sentiment" as SortKey, label: "Sentiment" },
                          { key: null,                   label: "Follow-up" },
                          { key: "date" as SortKey,      label: "Date" },
                        ] as Array<{ key: SortKey | null; label: string }>
                      ).map(({ key, label }) => (
                        <th
                          key={label}
                          onClick={() => key && toggleSort(key)}
                          className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap ${key ? "cursor-pointer hover:text-foreground select-none" : ""}`}
                        >
                          <span className="flex items-center gap-1">
                            {label}
                            {key && <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100" />}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((f) => (
                      <tr key={f.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{f.guest}</td>
                        <td className="px-4 py-3">
                          <StarsRow count={f.score} />
                        </td>
                        <td className="px-4 py-3"><SourceBadge source={f.source} /></td>
                        <td className="px-4 py-3"><SentimentBadge sentiment={f.sentiment} /></td>
                        <td className="px-4 py-3">
                          {f.followUpStatus === "thankyou_sent" && <span className="text-[10px] font-medium text-teal-600">Thank you sent</span>}
                          {f.followUpStatus === "callback_needed" && <span className="text-[10px] font-medium text-red-500">Callback needed</span>}
                          {f.followUpStatus === "resolved" && <span className="text-[10px] font-medium text-muted-foreground">Resolved</span>}
                          {f.followUpStatus === "none" && <span className="text-[10px] text-muted-foreground/50">—</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{f.dateLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Auto-sent collapsible */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <button
                onClick={() => setAutoSentOpen((o) => !o)}
                className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-semibold text-foreground">Sent automatically today</span>
                  <span className="rounded-full bg-green-500/15 border border-green-500/30 px-2 py-0.5 text-[10px] font-bold text-green-600">
                    {AUTO_SENT_ITEMS.length}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{autoSentOpen ? "Hide" : "Show"}</span>
              </button>
              {autoSentOpen && (
                <div className="border-t border-border divide-y divide-border/50">
                  {AUTO_SENT_ITEMS.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 px-5 py-3">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{item.guest}</span>
                          <span className="rounded-full bg-muted border border-border px-2 py-0.5 text-[9px] text-muted-foreground capitalize">
                            {item.type.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{item.time}</span>
                        </div>
                        <p className="mt-0.5 text-xs italic text-muted-foreground truncate">{item.preview}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Draft Modal ───────────────────────────────────────────────── */}
      {modal && (
        <EditDraftModal
          modal={modal}
          onClose={() => setModal(null)}
          onSent={handleModalSent}
        />
      )}
    </>
  )
}
