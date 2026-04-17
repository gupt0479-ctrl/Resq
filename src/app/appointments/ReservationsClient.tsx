"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { AppointmentResponse } from "@/lib/schemas/appointment"
import type { AppointmentStatus } from "@/lib/constants/enums"
import { APPOINTMENT_STATUS_LABEL } from "@/lib/constants/enums"

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusBadge(status: AppointmentStatus) {
  const map: Record<AppointmentStatus, string> = {
    confirmed:   "bg-blue-100 text-blue-800",
    completed:   "bg-green-100 text-green-700",
    cancelled:   "bg-zinc-100 text-zinc-500",
    no_show:     "bg-red-100 text-red-700",
    scheduled:   "bg-slate-100 text-slate-700",
    in_progress: "bg-amber-100 text-amber-800",
    rescheduled: "bg-purple-100 text-purple-700",
  }
  return map[status] ?? "bg-zinc-100 text-zinc-600"
}

function occasionBadge(occasion: string | null | undefined) {
  if (!occasion) return null
  const map: Record<string, string> = {
    birthday:    "bg-pink-100 text-pink-700",
    anniversary: "bg-amber-100 text-amber-700",
  }
  return map[occasion.toLowerCase()] ?? "bg-indigo-100 text-indigo-700"
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

// ─── Types ──────────────────────────────────────────────────────────────────

type LineItem  = { description: string; qty: number; unitPrice: number }
type MenuItem  = { id: string; name: string; category: string; price: number }

interface ParsedResult {
  intent: string
  confidence: "high" | "medium" | "low"
  raw_interpretation: string
  clarification_needed?: string | null
  starts_at?: string | null
  ends_at?: string | null
}

interface CompleteResult {
  invoiceId: string
  followUpMessage: string
}

const STATUSES: Array<{ value: string; label: string }> = [
  { value: "all",         label: "All" },
  { value: "confirmed",   label: "Confirmed" },
  { value: "scheduled",   label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed",   label: "Completed" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "cancelled",   label: "Cancelled" },
  { value: "no_show",     label: "No-show" },
]

const OCCASIONS = ["", "birthday", "anniversary", "business", "proposal", "other"]

// ─── Component ──────────────────────────────────────────────────────────────

export function ReservationsClient({
  initialAppointments,
}: {
  initialAppointments: AppointmentResponse[]
}) {
  const [appointments, setAppointments] = useState(initialAppointments)
  const [statusFilter, setStatusFilter] = useState("all")
  const router = useRouter()

  // AI
  const [aiInput, setAiInput] = useState("")
  const [aiResult, setAiResult] = useState<ParsedResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  // AI booking flow
  const [aiGuestForm, setAiGuestForm] = useState({ name: "", email: "", covers: 2 })
  const [aiBookingState, setAiBookingState] = useState<"idle" | "form" | "loading" | "success" | "error">("idle")
  const [aiBookingError, setAiBookingError] = useState("")

  // Modals
  type ModalType = "complete" | "new" | "reschedule" | "followup" | null
  const [modal, setModal] = useState<ModalType>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [inlineFollowUp, setInlineFollowUp] = useState<Record<string, string>>({})

  // Complete modal
  const [completeNotes, setCompleteNotes] = useState("")
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: "", qty: 1, unitPrice: 0 }])
  const [completeResult, setCompleteResult] = useState<CompleteResult | null>(null)

  // Menu items for line item dropdown
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  useEffect(() => {
    fetch("/api/menu-items")
      .then(r => r.json())
      .then(d => { if (d.data) setMenuItems(d.data) })
      .catch(() => {})
  }, [])

  // New booking modal
  const [bookForm, setBookForm] = useState({
    customerName: "", customerEmail: "", covers: 2, startsAt: "", occasion: "", notes: "",
  })
  const [bookError, setBookError] = useState("")

  // Reschedule modal
  const [rescheduleAt, setRescheduleAt] = useState("")

  const selectedAppt = appointments.find(a => a.id === selectedId) ?? null
  const filtered = statusFilter === "all"
    ? appointments
    : appointments.filter(a => a.status === statusFilter)

  // ── AI ──────────────────────────────────────────────────────────────────

  const handleAI = useCallback(async () => {
    if (!aiInput.trim()) return
    setAiLoading(true)
    setAiResult(null)
    setAiBookingState("idle")
    setAiBookingError("")
    try {
      const res = await fetch("/api/appointments/parse-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ natural_language: aiInput }),
      })
      const data = await res.json()
      const parsed: ParsedResult = data.parsed
      setAiResult(parsed)
      // If the AI understood a booking request, show the follow-up form
      if (
        parsed?.intent === "book" &&
        (parsed.confidence === "high" || parsed.confidence === "medium") &&
        parsed.starts_at
      ) {
        const coversMatch = parsed.raw_interpretation?.match(/\bfor (\d+)\b/i)
        setAiGuestForm({ name: "", email: "", covers: coversMatch ? parseInt(coversMatch[1]) : 2 })
        setAiBookingState("form")
      }
    } finally {
      setAiLoading(false)
    }
  }, [aiInput])

  const handleAIBook = useCallback(async () => {
    if (!aiResult?.starts_at || !aiGuestForm.name.trim() || !aiGuestForm.email.trim()) return
    setAiBookingState("loading")
    setAiBookingError("")
    try {
      const ends_at = aiResult.ends_at ??
        new Date(new Date(aiResult.starts_at).getTime() + 2 * 3600 * 1000).toISOString()
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name:  aiGuestForm.name.trim(),
          customer_email: aiGuestForm.email.trim(),
          party_size:     aiGuestForm.covers,
          starts_at:      aiResult.starts_at,
          ends_at,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg: string = data.error ?? "Booking failed"
        setAiBookingError(
          msg.toLowerCase().includes("overlap") || msg.toLowerCase().includes("conflict")
            ? "That time slot is already booked — please try a different time."
            : msg
        )
        setAiBookingState("error")
        return
      }
      setAiBookingState("success")
      const listRes = await fetch("/api/appointments?limit=100")
      const listData = await listRes.json()
      if (listData.data) setAppointments(listData.data)
      router.refresh()
    } catch {
      setAiBookingError("Network error — please try again.")
      setAiBookingState("error")
    }
  }, [aiResult, aiGuestForm, router])

  // ── Complete ─────────────────────────────────────────────────────────────

  const openComplete = (id: string) => {
    setSelectedId(id)
    setCompleteNotes("")
    setLineItems([{ description: "", qty: 1, unitPrice: 0 }])
    setCompleteResult(null)
    setModal("complete")
  }

  const handleComplete = useCallback(async () => {
    if (!selectedId) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/appointments/${selectedId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: completeNotes,
          lineItems: lineItems.filter(li => li.description.trim() && li.unitPrice > 0),
        }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? "Error completing"); return }
      setCompleteResult({ invoiceId: data.data.invoiceId, followUpMessage: data.data.followUpMessage })
      setAppointments(prev =>
        prev.map(a => a.id === selectedId ? { ...a, status: "completed" as AppointmentStatus, followUpSent: true } : a)
      )
    } finally {
      setActionLoading(false)
    }
  }, [selectedId, completeNotes, lineItems])

  // ── Cancel ───────────────────────────────────────────────────────────────

  const handleCancel = useCallback(async (id: string) => {
    if (!confirm("Cancel this reservation?")) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/appointments/${id}/cancel`, { method: "PATCH" })
      if (res.ok) {
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: "cancelled" as AppointmentStatus } : a))
      }
    } finally {
      setActionLoading(false)
    }
  }, [])

  // ── Reschedule ───────────────────────────────────────────────────────────

  const openReschedule = (id: string) => {
    setSelectedId(id)
    setRescheduleAt("")
    setModal("reschedule")
  }

  const handleReschedule = useCallback(async () => {
    if (!selectedId || !rescheduleAt) return
    setActionLoading(true)
    try {
      const startsAt = new Date(rescheduleAt).toISOString()
      const endsAt   = new Date(new Date(rescheduleAt).getTime() + 2 * 3600 * 1000).toISOString()
      const res = await fetch(`/api/appointments/${selectedId}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt, endsAt }),
      })
      if (res.ok) {
        setAppointments(prev =>
          prev.map(a => a.id === selectedId ? { ...a, status: "rescheduled" as AppointmentStatus, startsAt, endsAt } : a)
        )
        setModal(null)
      }
    } finally {
      setActionLoading(false)
    }
  }, [selectedId, rescheduleAt])

  // ── Follow-up ────────────────────────────────────────────────────────────

  const handleFollowUp = useCallback(async (id: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/appointments/${id}/followup`, { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, followUpSent: true } : a))
        setInlineFollowUp(prev => ({ ...prev, [id]: data.data.followUpMessage }))
      }
    } finally {
      setActionLoading(false)
    }
  }, [])

  // ── New Booking ──────────────────────────────────────────────────────────

  const handleBook = useCallback(async () => {
    setBookError("")
    if (!bookForm.customerName || !bookForm.customerEmail || !bookForm.startsAt) {
      setBookError("Name, email and date/time are required.")
      return
    }
    setActionLoading(true)
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name:  bookForm.customerName,
          customer_email: bookForm.customerEmail,
          party_size:     bookForm.covers,
          starts_at:      new Date(bookForm.startsAt).toISOString(),
          ends_at:        new Date(new Date(bookForm.startsAt).getTime() + 2 * 3600 * 1000).toISOString(),
          occasion:       bookForm.occasion || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setBookError(data.error ?? "Booking failed"); return }

      // Refresh list from API
      const listRes = await fetch("/api/appointments?limit=100")
      const listData = await listRes.json()
      if (listData.data) setAppointments(listData.data)
      setModal(null)
      router.refresh()
    } finally {
      setActionLoading(false)
    }
  }, [bookForm])

  // ── Line item helpers ────────────────────────────────────────────────────

  const addLineItem = () => setLineItems(prev => [...prev, { description: "", qty: 1, unitPrice: 0 }])
  const removeLineItem = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i))
  const updateLineItem = (i: number, field: keyof LineItem, value: string | number) =>
    setLineItems(prev => prev.map((li, idx) => idx === i ? { ...li, [field]: value } : li))

  const lineTotal = lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0)

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5">

      {/* ── AI Input Box ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-md bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">AI</div>
          <h2 className="text-sm font-semibold text-foreground">Booking Assistant</h2>
          <span className="text-xs text-muted-foreground">— type any request in natural language</span>
        </div>
        <div className="flex gap-2">
          <textarea
            className="flex-1 min-h-[60px] resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            placeholder="e.g. &quot;Book a table for 4 this Saturday at 7pm&quot; or &quot;Cancel James&apos;s reservation&quot;"
            value={aiInput}
            onChange={e => setAiInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAI() }}
          />
          <Button onClick={handleAI} disabled={aiLoading || !aiInput.trim()} className="self-end">
            {aiLoading ? "…" : "Interpret"}
          </Button>
        </div>

        {aiResult && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-3">
            {/* ── Parse result row ── */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-foreground">Intent:</span>
                <span className="capitalize font-semibold text-primary">{aiResult.intent}</span>
                <span className="text-muted-foreground">·</span>
                <span className="font-medium text-foreground">Confidence:</span>
                <span className={`font-semibold capitalize ${
                  aiResult.confidence === "high" ? "text-green-600" :
                  aiResult.confidence === "medium" ? "text-amber-600" : "text-red-600"
                }`}>{aiResult.confidence}</span>
              </div>
              <p className="text-xs text-muted-foreground italic">{aiResult.raw_interpretation}</p>
              {aiResult.clarification_needed && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                  {aiResult.clarification_needed}
                </p>
              )}
            </div>

            {/* ── Follow-up booking flow ── */}
            {aiBookingState !== "idle" && (
              <div className="border-t border-border pt-3">
                {aiBookingState === "success" ? (
                  <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2.5">
                    <p className="text-sm font-semibold text-green-800">Booking confirmed ✓</p>
                    <p className="text-xs text-green-700 mt-0.5">
                      {aiGuestForm.name} · {aiGuestForm.covers} attendee{aiGuestForm.covers !== 1 ? "s" : ""} · {aiResult.starts_at ? fmtDate(aiResult.starts_at) : ""}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      Complete the booking — just need your contact details:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Your name *"
                        value={aiGuestForm.name}
                        onChange={e => setAiGuestForm(f => ({ ...f, name: e.target.value }))}
                        disabled={aiBookingState === "loading"}
                      />
                      <Input
                        type="email"
                        placeholder="Email address *"
                        value={aiGuestForm.email}
                        onChange={e => setAiGuestForm(f => ({ ...f, email: e.target.value }))}
                        disabled={aiBookingState === "loading"}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Party size</span>
                        <Input
                          type="number" min={1} max={50}
                          value={aiGuestForm.covers}
                          onChange={e => setAiGuestForm(f => ({ ...f, covers: Number(e.target.value) }))}
                          disabled={aiBookingState === "loading"}
                          className="w-16"
                        />
                      </div>
                      <Button
                        onClick={handleAIBook}
                        disabled={aiBookingState === "loading" || !aiGuestForm.name.trim() || !aiGuestForm.email.trim()}
                        className="flex-1"
                      >
                        {aiBookingState === "loading" ? "Booking…" : "Complete Booking"}
                      </Button>
                    </div>
                    {aiBookingState === "error" && aiBookingError && (
                      <p className="text-xs text-destructive">{aiBookingError}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Bookings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {appointments.length} total · {appointments.filter(a => a.status === "confirmed" || a.status === "scheduled").length} upcoming
          </p>
        </div>
        <Button onClick={() => { setBookForm({ customerName: "", customerEmail: "", covers: 2, startsAt: "", occasion: "", notes: "" }); setBookError(""); setModal("new") }}>
          + New Booking
        </Button>
      </div>

      {/* ── Status Filter Tabs ────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map(s => {
          const count = s.value === "all" ? appointments.length : appointments.filter(a => a.status === s.value).length
          if (s.value !== "all" && count === 0) return null
          return (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s.label} ({count})
            </button>
          )
        })}
      </div>

      {/* ── Reservations Table ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            {statusFilter === "all" ? "All Bookings" : APPOINTMENT_STATUS_LABEL[statusFilter as AppointmentStatus]} ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No bookings found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground text-left">
                    <th className="pb-2 pr-4 font-medium">Customer</th>
                    <th className="pb-2 pr-4 font-medium">Experience</th>
                    <th className="pb-2 pr-4 font-medium">Party Size</th>
                    <th className="pb-2 pr-4 font-medium">Date & Time</th>
                    <th className="pb-2 pr-4 font-medium">Server</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(appt => (
                    <tr key={appt.id} className="py-2 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">{appt.customerName}</span>
                          {appt.occasion ? (
                            <span className={`self-start rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${occasionBadge(appt.occasion) ?? ""}`}>
                              {appt.occasion}
                            </span>
                          ) : appt.notes ? (
                            <span className="text-[11px] text-muted-foreground leading-tight">{appt.notes}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{appt.serviceName}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{appt.covers}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">{fmtDate(appt.startsAt)}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{appt.staffName ?? "—"}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge(appt.status)}`}>
                          {APPOINTMENT_STATUS_LABEL[appt.status]}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <div className="flex flex-col gap-1">
                          {/* Confirmed / Scheduled / In-progress → Complete + Reschedule + Cancel */}
                          {(appt.status === "confirmed" || appt.status === "scheduled" || appt.status === "in_progress") && (
                            <div className="flex gap-1">
                              <Button size="xs" onClick={() => openComplete(appt.id)} disabled={actionLoading}>
                                Complete
                              </Button>
                              <Button size="xs" variant="outline" onClick={() => openReschedule(appt.id)} disabled={actionLoading}>
                                Reschedule
                              </Button>
                              <Button size="xs" variant="destructive" onClick={() => handleCancel(appt.id)} disabled={actionLoading}>
                                Cancel
                              </Button>
                            </div>
                          )}

                          {/* Completed → follow-up */}
                          {appt.status === "completed" && (
                            <div className="flex flex-col gap-1">
                              {appt.followUpSent ? (
                                <span className="text-[10px] text-green-600 font-medium">✓ Follow-up sent</span>
                              ) : (
                                <Button size="xs" variant="outline" onClick={() => handleFollowUp(appt.id)} disabled={actionLoading}>
                                  Send Follow-up
                                </Button>
                              )}
                              {inlineFollowUp[appt.id] && (
                                <p className="text-[10px] text-muted-foreground italic max-w-[240px] leading-relaxed">
                                  {inlineFollowUp[appt.id]}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Complete Modal ────────────────────────────────────────────────── */}
      <Dialog open={modal === "complete"} onClose={() => { setModal(null); setCompleteResult(null) }}>
        <DialogHeader>
          <DialogTitle>
            {completeResult ? "Booking Completed" : `Complete — ${selectedAppt?.customerName ?? ""}`}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {completeResult ? (
            /* Success state */
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
                <p className="font-semibold mb-1">Invoice generated ✓</p>
                <p className="text-xs text-green-700 font-mono">{completeResult.invoiceId}</p>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs font-semibold text-blue-800 mb-1.5">AI Follow-up Message</p>
                <p className="text-sm text-blue-900 leading-relaxed italic">&ldquo;{completeResult.followUpMessage}&rdquo;</p>
              </div>
            </div>
          ) : (
            /* Form state */
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Notes (optional)</label>
                <textarea
                  className="w-full min-h-[72px] resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring"
                  placeholder="Any notes about this visit…"
                  value={completeNotes}
                  onChange={e => setCompleteNotes(e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Line Items</label>
                  <button onClick={addLineItem} className="text-xs text-primary hover:underline">+ Add item</button>
                </div>
                {/* Column headers */}
                <div className="mb-1 grid grid-cols-[1fr_56px_80px_20px] gap-2 px-0.5">
                  <span className="text-[10px] font-medium text-muted-foreground">Product / Description</span>
                  <span className="text-[10px] font-medium text-muted-foreground text-center">Qty</span>
                  <span className="text-[10px] font-medium text-muted-foreground text-right">Amount ($)</span>
                  <span />
                </div>
                <div className="space-y-2">
                  {lineItems.map((li, i) => {
                    // Group menu items by category for <optgroup>
                    const categories = Array.from(new Set(menuItems.map(m => m.category)))
                    return (
                    <div key={i} className="grid grid-cols-[1fr_56px_80px_20px] gap-2 items-center">
                      <select
                        value={li.description}
                        onChange={e => {
                          const chosen = menuItems.find(m => m.name === e.target.value)
                          if (chosen) {
                            setLineItems(prev => prev.map((l, idx) =>
                              idx === i ? { ...l, description: chosen.name, unitPrice: chosen.price } : l
                            ))
                          } else {
                            updateLineItem(i, "description", e.target.value)
                          }
                        }}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">e.g. Wagyu Ribeye</option>
                        {categories.map(cat => (
                          <optgroup key={cat} label={cat}>
                            {menuItems.filter(m => m.category === cat).map(m => (
                              <option key={m.id} value={m.name}>{m.name} — ${m.price}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <Input
                        type="number" min={1} placeholder="Qty"
                        value={li.qty}
                        onChange={e => updateLineItem(i, "qty", Number(e.target.value))}
                        className="w-full text-center"
                      />
                      <Input
                        type="number" min={0} step={0.01} placeholder="0.00"
                        value={li.unitPrice === 0 ? "" : li.unitPrice}
                        onChange={e => updateLineItem(i, "unitPrice", Number(e.target.value))}
                        className="w-full text-right"
                      />
                      {lineItems.length > 1 ? (
                        <button onClick={() => removeLineItem(i)} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
                      ) : <span />}
                    </div>
                    )
                  })}
                </div>
                {lineTotal > 0 && (
                  <p className="text-xs text-muted-foreground mt-2 text-right">
                    Subtotal: <span className="font-semibold text-foreground">${lineTotal.toFixed(2)}</span>
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to use the default service price.
                </p>
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setModal(null); setCompleteResult(null) }}>
            {completeResult ? "Close" : "Cancel"}
          </Button>
          {!completeResult && (
            <Button onClick={handleComplete} disabled={actionLoading}>
              {actionLoading ? "Completing…" : "Complete & Generate Invoice"}
            </Button>
          )}
        </DialogFooter>
      </Dialog>

      {/* ── New Booking Modal ─────────────────────────────────────────────── */}
      <Dialog open={modal === "new"} onClose={() => setModal(null)}>
        <DialogHeader><DialogTitle>New Booking</DialogTitle></DialogHeader>
        <DialogBody>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Customer Name *</label>
                <Input
                  placeholder="Full name"
                  value={bookForm.customerName}
                  onChange={e => setBookForm(f => ({ ...f, customerName: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Email *</label>
                <Input
                  type="email"
                  placeholder="customer@example.com"
                  value={bookForm.customerEmail}
                  onChange={e => setBookForm(f => ({ ...f, customerEmail: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Party Size *</label>
                <Input
                  type="number" min={1} max={50}
                  value={bookForm.covers}
                  onChange={e => setBookForm(f => ({ ...f, covers: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Occasion</label>
                <select
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm focus-visible:outline-none focus-visible:border-ring"
                  value={bookForm.occasion}
                  onChange={e => setBookForm(f => ({ ...f, occasion: e.target.value }))}
                >
                  {OCCASIONS.map(o => (
                    <option key={o} value={o}>{o ? o.charAt(0).toUpperCase() + o.slice(1) : "None"}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Date & Time *</label>
              <Input
                type="datetime-local"
                value={bookForm.startsAt}
                onChange={e => setBookForm(f => ({ ...f, startsAt: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Notes</label>
              <textarea
                className="w-full min-h-[60px] resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring"
                placeholder="Any special requests…"
                value={bookForm.notes}
                onChange={e => setBookForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
            {bookError && <p className="text-xs text-destructive">{bookError}</p>}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
          <Button onClick={handleBook} disabled={actionLoading}>
            {actionLoading ? "Booking…" : "Book Appointment"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── Reschedule Modal ──────────────────────────────────────────────── */}
      <Dialog open={modal === "reschedule"} onClose={() => setModal(null)}>
        <DialogHeader>
          <DialogTitle>Reschedule — {selectedAppt?.customerName ?? ""}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Current: <span className="font-medium text-foreground">{selectedAppt ? fmtDate(selectedAppt.startsAt) : ""}</span>
            </p>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">New Date & Time</label>
              <Input
                type="datetime-local"
                value={rescheduleAt}
                onChange={e => setRescheduleAt(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">Duration will remain 2 hours.</p>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
          <Button onClick={handleReschedule} disabled={actionLoading || !rescheduleAt}>
            {actionLoading ? "Saving…" : "Reschedule"}
          </Button>
        </DialogFooter>
      </Dialog>

    </div>
  )
}
