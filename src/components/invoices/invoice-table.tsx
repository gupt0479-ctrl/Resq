"use client"

import React, { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { ChevronDown, ChevronRight, Check, Bell, Copy, CheckCheck, Loader2, Pencil, Plus, Trash2, X, Download, Mail, Phone, User } from "lucide-react"
import { InvestigationPanel } from "@/components/receivables/investigation-panel"

export interface LineItem {
  description: string
  qty: number
  amount: number
}

export interface InvoiceCustomer {
  name: string
  email?: string
  phone?: string
  visit_count?: number
}

export interface Invoice {
  id: string
  number: string
  customerName: string
  amount: number
  status: "paid" | "overdue" | "pending" | "draft" | "sent"
  date: string
  dueDate?: string
  reminderCount?: number
  lineItems: LineItem[]
  tax: number
  tip: number
  customer?: InvoiceCustomer
}

// ── PDF generation ────────────────────────────────────────────────────────────

async function downloadPDF(inv: Invoice) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ unit: "pt", format: "letter" })

  const L = 48   // left margin
  const R = 564  // right edge
  const W = R - L
  let y = 48

  // Header bar
  doc.setFillColor(30, 15, 8)
  doc.rect(0, 0, 612, 56, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text("RESQ", L, 36)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text("resq.app · Billing workspace", L, 48)

  y = 84
  // Invoice meta
  doc.setTextColor(30, 15, 8)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.text("Invoice", L, y)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(inv.number, R, y, { align: "right" })
  y += 16
  doc.text(`Due: ${inv.dueDate ?? inv.date}`, R, y, { align: "right" })
  doc.text(`Date: ${inv.date}`, L, y)

  y += 28
  // Customer block
  doc.setFillColor(248, 247, 245)
  doc.roundedRect(L, y, W, inv.customer ? 56 : 36, 4, 4, "F")
  y += 14
  doc.setTextColor(30, 15, 8)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("BILLED TO", L + 12, y)
  y += 14
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(40, 40, 40)
  doc.text(inv.customer?.name ?? inv.customerName, L + 12, y)
  if (inv.customer?.email) {
    y += 13
    doc.text(inv.customer.email, L + 12, y)
  }
  if (inv.customer?.phone) {
    y += 13
    doc.text(inv.customer.phone, L + 12, y)
  }

  y += 28
  // Line items table header
  doc.setFillColor(30, 15, 8)
  doc.rect(L, y, W, 20, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("ITEM", L + 8, y + 13)
  doc.text("QTY", L + 300, y + 13, { align: "center" })
  doc.text("AMOUNT", R - 8, y + 13, { align: "right" })
  y += 20

  // Line items rows
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  inv.lineItems.forEach((li, idx) => {
    const bg = idx % 2 === 0 ? [255, 255, 255] : [250, 249, 247]
    doc.setFillColor(bg[0], bg[1], bg[2])
    doc.rect(L, y, W, 22, "F")
    doc.setTextColor(40, 40, 40)
    doc.text(li.description, L + 8, y + 14)
    doc.setTextColor(100, 100, 100)
    doc.text(String(li.qty), L + 300, y + 14, { align: "center" })
    doc.setTextColor(40, 40, 40)
    doc.text(`$${li.amount.toFixed(2)}`, R - 8, y + 14, { align: "right" })
    y += 22
  })

  y += 10
  // Totals
  const subtotal = inv.lineItems.reduce((s, l) => s + l.amount, 0)
  const totals: [string, string][] = [
    ["Subtotal", `$${subtotal.toFixed(2)}`],
    ["Tax", `$${inv.tax.toFixed(2)}`],
  ]
  if (inv.tip > 0) totals.push(["Tip", `$${inv.tip.toFixed(2)}`])
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  totals.forEach(([label, val]) => {
    doc.text(label, R - 100, y)
    doc.text(val, R - 8, y, { align: "right" })
    y += 16
  })
  doc.setDrawColor(200, 200, 200)
  doc.line(R - 120, y - 4, R, y - 4)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(30, 15, 8)
  doc.text("Total", R - 100, y + 8)
  doc.text(`$${inv.amount.toFixed(2)}`, R - 8, y + 8, { align: "right" })
  y += 28

  // Status badge
  const statusColors: Record<string, [number, number, number]> = {
    paid: [16, 185, 129], overdue: [239, 68, 68], pending: [245, 158, 11], draft: [156, 163, 175],
  }
  const [r, g, b] = statusColors[inv.status] ?? [156, 163, 175]
  doc.setFillColor(r, g, b)
  doc.roundedRect(L, y, 60, 18, 4, 4, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text(inv.status.toUpperCase(), L + 30, y + 12, { align: "center" })

  // Footer
  doc.setFillColor(30, 15, 8)
  doc.rect(0, 730, 612, 62, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "italic")
  doc.setFontSize(10)
  doc.text("Generated with Resq billing workspace.", 306, 765, { align: "center" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(180, 180, 180)
  doc.text("Questions? billing@resq.app", 306, 781, { align: "center" })

  const safeName = (inv.customer?.name ?? inv.customerName).replace(/\s+/g, "_")
  doc.save(`Resq-${inv.number}-${safeName}.pdf`)
}

interface ReminderResult {
  subject: string
  message: string
  reminder_number: number
  customer_name: string
  invoice_total: number
  follow_up_type?: "overdue" | "paid"
}

function statusStyle(status: string) {
  switch (status) {
    case "paid":    return "bg-emerald-100 text-emerald-700"
    case "overdue": return "bg-red-100 text-red-600"
    case "pending": return "bg-amber-100 text-amber-700"
    case "sent":    return "bg-blue-100 text-blue-700"
    default:        return "bg-muted text-muted-foreground"
  }
}

function toneLabel(n: number): { label: string; cls: string } {
  if (n >= 3) return { label: "Urgent",  cls: "bg-red-100 text-red-700 border-red-200" }
  if (n === 2) return { label: "Firm",   cls: "bg-amber-100 text-amber-700 border-amber-200" }
  return              { label: "Gentle", cls: "bg-blue-100 text-blue-700 border-blue-200" }
}

// ── AI Reminder Modal ─────────────────────────────────────────────────────────

function ReminderModal({
  result,
  onClose,
}: {
  result: ReminderResult
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const tone = toneLabel(result.reminder_number)
  const full = `Subject: ${result.subject}\n\n${result.message}`

  function copy() {
    navigator.clipboard.writeText(full)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative mx-4 w-full max-w-lg rounded-2xl bg-card shadow-2xl ring-1 ring-border">

        {/* Gradient top bar — AI moment signal */}
        <div className="h-1 w-full rounded-t-2xl bg-gradient-to-r from-violet-500 via-blue-500 to-emerald-400" />

        <div className="p-6">
          {/* Header */}
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                AI Payment Reminder
              </p>
              <p className="mt-0.5 text-base font-semibold text-foreground">
                {result.customer_name} · ${result.invoice_total.toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone.cls}`}>
                {tone.label}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Reminder #{result.reminder_number}
              </span>
            </div>
          </div>

          {/* Subject */}
          <div className="mb-3 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Subject</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">{result.subject}</p>
          </div>

          {/* Message body — styled AI card */}
          <div className="relative rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-50/60 to-blue-50/40 p-4">
            <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-violet-200/40" />
            <p className="relative whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 italic">
              {result.message}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
            <button
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {copied
                ? <><CheckCheck className="h-3.5 w-3.5" /> Copied</>
                : <><Copy className="h-3.5 w-3.5" /> Copy message</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── AI Follow-Up Modal (overdue — has "Mark as Sent") ────────────────────────

function FollowUpModal({
  result,
  onClose,
  onMarkSent,
}: {
  result: ReminderResult
  onClose: () => void
  onMarkSent: () => void
}) {
  const [copied, setCopied] = useState(false)
  const tone = toneLabel(result.reminder_number)
  const full = `Subject: ${result.subject}\n\n${result.message}`
  const isPaid = result.follow_up_type === "paid"

  function copy() {
    navigator.clipboard.writeText(full)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative mx-4 w-full max-w-lg rounded-2xl bg-card shadow-2xl ring-1 ring-border">
        <div className={`h-1 w-full rounded-t-2xl bg-gradient-to-r ${isPaid ? "from-emerald-400 via-teal-400 to-blue-400" : "from-violet-500 via-blue-500 to-emerald-400"}`} />
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {isPaid ? "AI Thank-You Follow-Up · Paid" : "AI Follow-Up · Overdue"}
              </p>
              <p className="mt-0.5 text-base font-semibold text-foreground">
                {result.customer_name} · ${result.invoice_total.toFixed(2)}
              </p>
            </div>
            {!isPaid && (
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone.cls}`}>
                  {tone.label}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  Reminder #{result.reminder_number}
                </span>
              </div>
            )}
            {isPaid && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                Thank-you
              </span>
            )}
          </div>

          {/* Subject */}
          <div className="mb-3 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Subject</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">{result.subject}</p>
          </div>

          {/* AI message card — left border changes colour by type */}
          <div className="rounded-xl border border-border bg-background pl-0 overflow-hidden">
            <div className="flex">
              <div className={`w-1 shrink-0 rounded-l-xl ${isPaid ? "bg-emerald-500" : "bg-violet-500"}`} />
              <div className="px-4 py-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 italic">
                  {result.message}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <div className="flex gap-2">
              <button
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {copied ? <><CheckCheck className="h-3.5 w-3.5 text-emerald-600" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy Message</>}
              </button>
              <button
                onClick={onMarkSent}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                <Check className="h-3.5 w-3.5" /> Mark as Sent
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Customer Contact section ──────────────────────────────────────────────────

function GuestContact({ customer }: { customer: InvoiceCustomer }) {
  const [copiedEmail, setCopiedEmail] = useState(false)

  function copyEmail() {
    if (!customer.email) return
    navigator.clipboard.writeText(customer.email)
    setCopiedEmail(true)
    setTimeout(() => setCopiedEmail(false), 2000)
  }

  return (
    <div className="mb-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Customer Contact
      </p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <div className="flex items-center gap-1.5 text-sm text-foreground">
          <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="font-medium">{customer.name}</span>
          {customer.visit_count === 1 && (
            <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
              First Visit
            </span>
          )}
          {(customer.visit_count ?? 0) > 1 && (
            <span className="text-[11px] text-muted-foreground">{customer.visit_count} visits</span>
          )}
        </div>

        {customer.email && (
          <div className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <a
              href={`mailto:${customer.email}`}
              className="text-sm text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {customer.email}
            </a>
            <button
              onClick={(e) => { e.stopPropagation(); copyEmail() }}
              className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {copiedEmail ? <><CheckCheck className="h-2.5 w-2.5" /> Copied</> : <><Copy className="h-2.5 w-2.5" /> Copy</>}
            </button>
          </div>
        )}

        {customer.phone && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>{customer.phone}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Expanded detail row ───────────────────────────────────────────────────────

// Default tax helper used for demo invoice editing.
const MN_TAX_RATE = 0.07525

function InvoiceDetail({
  inv,
  onSave,
}: {
  inv: Invoice
  onSave: (updated: Invoice) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Invoice>(inv)
  const [taxOverride, setTaxOverride] = useState<string>("")

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setDraft(inv)
    setTaxOverride("")
    setEditing(true)
  }

  function cancel(e: React.MouseEvent) {
    e.stopPropagation()
    setEditing(false)
  }

  function save(e: React.MouseEvent) {
    e.stopPropagation()
    // Recompute amount from line items + MN auto-tax (or override) + tip
    const subtotal = draft.lineItems.reduce((s, li) => s + li.amount, 0)
    const tax = taxOverride !== "" ? Number(taxOverride) : Math.round(subtotal * MN_TAX_RATE * 100) / 100
    const newAmount = Math.round((subtotal + tax + draft.tip) * 100) / 100
    onSave({ ...draft, tax, amount: newAmount })
    setEditing(false)
  }

  function setLine(i: number, field: keyof LineItem, value: string) {
    setDraft((d) => {
      const items = d.lineItems.map((li, idx) =>
        idx === i
          ? { ...li, [field]: field === "description" ? value : Number(value) }
          : li
      )
      return { ...d, lineItems: items }
    })
  }

  function addLine(e: React.MouseEvent) {
    e.stopPropagation()
    setDraft((d) => ({
      ...d,
      lineItems: [...d.lineItems, { description: "", qty: 1, amount: 0 }],
    }))
  }

  function removeLine(i: number, e: React.MouseEvent) {
    e.stopPropagation()
    setDraft((d) => ({ ...d, lineItems: d.lineItems.filter((_, idx) => idx !== i) }))
  }

  const subtotal  = (editing ? draft : inv).lineItems.reduce((s, li) => s + li.amount, 0)
  const autoTax   = Math.round(subtotal * MN_TAX_RATE * 100) / 100
  const effectiveTax = taxOverride !== "" ? Number(taxOverride) : autoTax
  const display   = editing ? { ...draft, tax: effectiveTax } : inv

  const inputCls = "w-full rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"

  return (
    <TableRow className="bg-muted/30 hover:bg-muted/30">
      <TableCell colSpan={7} className="px-8 py-4">
        {/* Header row */}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Invoice Detail
          </p>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => { e.stopPropagation(); downloadPDF(inv) }}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Download className="h-3 w-3" /> PDF
            </button>
            {editing ? (
              <>
                <button
                  onClick={cancel}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
                >
                  <X className="h-3 w-3" /> Cancel
                </button>
                <button
                  onClick={save}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90"
                >
                  <Check className="h-3 w-3" /> Save
                </button>
              </>
            ) : (
              <button
                onClick={startEdit}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            )}
          </div>
        </div>

        {/* Customer Contact */}
        {inv.customer && (
          <GuestContact customer={inv.customer} />
        )}

        {/* Customer + status row when editing */}
        {editing && (
          <div className="mb-4 grid grid-cols-3 gap-3" onClick={(e) => e.stopPropagation()}>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Customer</p>
              <input
                className={inputCls}
                value={draft.customerName}
                onChange={(e) => setDraft((d) => ({ ...d, customerName: e.target.value }))}
              />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Due Date</p>
              <input
                className={inputCls}
                value={draft.dueDate ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
              />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Status</p>
              <select
                className={inputCls}
                value={draft.status}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as Invoice["status"] }))}
              >
                <option value="paid">paid</option>
                <option value="pending">pending</option>
                <option value="overdue">overdue</option>
                <option value="draft">draft</option>
              </select>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Line items */}
          <div onClick={(e) => editing && e.stopPropagation()}>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Line Items
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-1 text-left text-[10px] font-medium text-muted-foreground">Item</th>
                  <th className="pb-1 text-center text-[10px] font-medium text-muted-foreground">Qty</th>
                  <th className="pb-1 text-right text-[10px] font-medium text-muted-foreground">Amount</th>
                  {editing && <th className="pb-1 w-6" />}
                </tr>
              </thead>
              <tbody>
                {display.lineItems.map((li, i) => (
                  <tr key={i} className="border-b border-border/40 last:border-0">
                    <td className="py-1.5">
                      {editing ? (
                        <input
                          className={inputCls}
                          value={li.description}
                          onChange={(e) => setLine(i, "description", e.target.value)}
                          placeholder="Line item description"
                        />
                      ) : (
                        <span className="text-foreground">{li.description}</span>
                      )}
                    </td>
                    <td className="py-1.5 text-center">
                      {editing ? (
                        <input
                          className={`${inputCls} w-14 text-center`}
                          type="number"
                          min={1}
                          value={li.qty}
                          onChange={(e) => setLine(i, "qty", e.target.value)}
                        />
                      ) : (
                        <span className="text-muted-foreground">×{li.qty}</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right">
                      {editing ? (
                        <input
                          className={`${inputCls} w-24 text-right`}
                          type="number"
                          step="0.01"
                          min={0}
                          value={li.amount}
                          onChange={(e) => setLine(i, "amount", e.target.value)}
                        />
                      ) : (
                        <span className="font-medium">${li.amount.toFixed(2)}</span>
                      )}
                    </td>
                    {editing && (
                      <td className="py-1.5 pl-2">
                        <button
                          onClick={(e) => removeLine(i, e)}
                          className="text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {editing && (
              <button
                onClick={addLine}
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3 w-3" /> Add line item
              </button>
            )}
          </div>

          {/* Totals + reminder history */}
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Summary
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    Tax
                    {editing && <span className="text-[10px] text-muted-foreground/60">(MN 7.525%)</span>}
                  </span>
                  {editing ? (
                    <input
                      className={`${inputCls} w-24 text-right`}
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder={autoTax.toFixed(2)}
                      value={taxOverride}
                      onChange={(e) => setTaxOverride(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span>${display.tax.toFixed(2)}</span>
                  )}
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tip</span>
                  {editing ? (
                    <input
                      className={`${inputCls} w-24 text-right`}
                      type="number"
                      step="0.01"
                      min={0}
                      value={draft.tip}
                      onChange={(e) => setDraft((d) => ({ ...d, tip: Number(e.target.value) }))}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    display.tip > 0 && <span>${display.tip.toFixed(2)}</span>
                  )}
                </div>
                <Separator className="my-1.5" />
                <div className="flex justify-between font-semibold text-foreground">
                  <span>Total</span>
                  <span>${(subtotal + effectiveTax + display.tip).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {(display.reminderCount ?? 0) > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Reminder History
                </p>
                <ul className="space-y-1">
                  {Array.from({ length: display.reminderCount ?? 0 }, (_, i) => {
                    const { label, cls } = toneLabel(i + 1)
                    return (
                      <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Bell className="h-3 w-3" />
                        Reminder #{i + 1}
                        <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
                          {label}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ── New Invoice Modal ─────────────────────────────────────────────────────────

function NewInvoiceModal({
  nextNumber,
  onClose,
  onAdd,
}: {
  nextNumber: string
  onClose: () => void
  onAdd: (inv: Invoice) => void
}) {
  const [customerName, setCustomerName] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [status, setStatus] = useState<Invoice["status"]>("pending")
  const [taxOverride, setTaxOverride] = useState<string>("")
  const [tip, setTip] = useState(0)
  const [lines, setLines] = useState<LineItem[]>([{ description: "", qty: 1, amount: 0 }])

  const subtotal = lines.reduce((s, l) => s + l.amount, 0)
  const autoTax  = Math.round(subtotal * MN_TAX_RATE * 100) / 100
  const tax      = taxOverride !== "" ? Number(taxOverride) : autoTax
  const total    = Math.round((subtotal + tax + tip) * 100) / 100

  // Re-sync auto-tax display whenever subtotal changes (only if user hasn't overridden)
  useEffect(() => {
    if (taxOverride === "") return
    // keep override as-is
  }, [subtotal, taxOverride])

  const inputCls =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"

  function setLine(i: number, field: keyof LineItem, value: string) {
    setLines((prev) =>
      prev.map((li, idx) =>
        idx === i ? { ...li, [field]: field === "description" ? value : Number(value) } : li
      )
    )
  }

  function submit() {
    if (!customerName.trim() || lines.every((l) => !l.description)) return
    onAdd({
      id:            `inv-${Date.now()}`,
      number:        nextNumber,
      customerName:  customerName.trim(),
      amount:        total,
      status,
      date:          new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      dueDate:       dueDate || undefined,
      reminderCount: 0,
      lineItems:     lines.filter((l) => l.description),
      tax,
      tip,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative mx-4 w-full max-w-4xl overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-border">
        <div className="h-1 w-full rounded-t-2xl bg-gradient-to-r from-emerald-400 via-blue-500 to-violet-500" />

        <div className="flex max-h-[88vh] flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                New Invoice
              </p>
              <p className="text-3xl font-semibold text-foreground">{nextNumber}</p>
            </div>
            <button onClick={onClose} className="text-muted-foreground transition-colors hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-5">
              {/* Customer / due / status */}
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Customer *
                  </label>
                  <input
                    className={inputCls}
                    placeholder="Customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Due Date
                  </label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Apr 20"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Status
                  </label>
                  <select
                    className={`${inputCls} capitalize`}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Invoice["status"])}
                  >
                    <option value="pending">pending</option>
                    <option value="overdue">overdue</option>
                    <option value="paid">paid</option>
                    <option value="draft">draft</option>
                  </select>
                </div>
              </div>

              {/* Line items */}
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Line Items
                </p>
                <div className="mb-1 grid grid-cols-[minmax(0,1fr)_80px_140px_36px] gap-2 px-1">
                  <span className="text-[10px] text-muted-foreground">Product / Description</span>
                  <span className="text-center text-[10px] text-muted-foreground">Qty</span>
                  <span className="text-right text-[10px] text-muted-foreground">Amount ($)</span>
                  <span />
                </div>
                <div className="space-y-2">
                  {lines.map((li, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[minmax(0,1fr)_80px_140px_36px] items-center gap-2"
                    >
                      <input
                        className={inputCls}
                        placeholder="e.g. Wagyu Ribeye"
                        value={li.description}
                        onChange={(e) => setLine(i, "description", e.target.value)}
                      />
                      <input
                        className={`${inputCls} text-center`}
                        type="number"
                        min={1}
                        value={li.qty}
                        onChange={(e) => setLine(i, "qty", e.target.value)}
                      />
                      <input
                        className={`${inputCls} text-right`}
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder="0.00"
                        value={li.amount || ""}
                        onChange={(e) => setLine(i, "amount", e.target.value)}
                      />
                      <button
                        onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                        className="flex h-10 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                        disabled={lines.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setLines((prev) => [...prev, { description: "", qty: 1, amount: 0 }])}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Plus className="h-3 w-3" /> Add line
                </button>
              </div>

              {/* Tax / Tip */}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    <span>Tax</span>
                    <span className="normal-case font-normal text-muted-foreground/70">
                      MN rate {(MN_TAX_RATE * 100).toFixed(3)}% · auto
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      className={inputCls}
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder={autoTax.toFixed(2)}
                      value={taxOverride}
                      onChange={(e) => setTaxOverride(e.target.value)}
                    />
                    {taxOverride === "" && (
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        ${autoTax.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Tip ($)
                  </label>
                  <input
                    className={inputCls}
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0.00"
                    value={tip || ""}
                    onChange={(e) => setTip(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Totals */}
              <div className="rounded-xl border border-border p-4">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax ({(MN_TAX_RATE * 100).toFixed(3)}%)</span><span>${tax.toFixed(2)}</span>
                  </div>
                  {tip > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tip</span><span>${tip.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="mt-1 border-t border-border pt-2">
                    <div className="flex justify-between text-2xl font-semibold text-foreground">
                      <span>Total</span><span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!customerName.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" /> Add Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main table ────────────────────────────────────────────────────────────────

export function InvoiceTable({ invoices: initial }: { invoices: Invoice[] }) {
  const [invoices, setInvoices] = useState(initial)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loadingPay, setLoadingPay] = useState<string | null>(null)
  const [loadingRemind, setLoadingRemind] = useState<string | null>(null)
  const [loadingFollowUp, setLoadingFollowUp] = useState<string | null>(null)
  const [reminder, setReminder] = useState<ReminderResult | null>(null)
  const [followUp, setFollowUp] = useState<{ result: ReminderResult; invId: string } | null>(null)
  const [sentMessages, setSentMessages] = useState<Record<string, { message: string; type: "paid" | "overdue" }>>({})
  const [showNewModal, setShowNewModal] = useState(false)

  function toggle(id: string) {
    setExpanded((prev) => (prev === id ? null : id))
  }

  async function markPaid(inv: Invoice, e: React.MouseEvent) {
    e.stopPropagation()
    setLoadingPay(inv.id)
    try {
      const res = await fetch(`/api/invoices/${inv.id}/mark-paid`, { method: "POST", body: "{}" })
      if (res.ok) {
        setInvoices((prev) => prev.map((i) => i.id === inv.id ? { ...i, status: "paid" } : i))
      }
    } finally {
      setLoadingPay(null)
    }
  }

  async function sendReminder(inv: Invoice, e: React.MouseEvent) {
    e.stopPropagation()
    setLoadingRemind(inv.id)
    try {
      const res = await fetch(`/api/invoices/${inv.id}/remind`, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        const num = (inv.reminderCount ?? 0) + 1
        setInvoices((prev) =>
          prev.map((i) => i.id === inv.id ? { ...i, reminderCount: num } : i)
        )
        setReminder({ ...data, reminder_number: num })
      }
    } finally {
      setLoadingRemind(null)
    }
  }

  async function sendFollowUp(inv: Invoice, e: React.MouseEvent) {
    e.stopPropagation()
    setLoadingFollowUp(inv.id)
    const followUpType = inv.status === "paid" ? "paid" : "overdue"
    try {
      const res = await fetch(`/api/invoices/${inv.id}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followUpType,
          invoiceFallback: {
            total: inv.amount,
            due_at: inv.dueDate ?? inv.date,
            reminder_count: inv.reminderCount ?? 0,
            customer: inv.customer ?? { name: inv.customerName },
          },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const num = followUpType === "overdue" ? (inv.reminderCount ?? 0) + 1 : (inv.reminderCount ?? 0)
        const result = { ...data, reminder_number: num, invoice_total: inv.amount, follow_up_type: followUpType }
        // Show inline immediately — modal is supplementary for copy/dismiss
        setSentMessages((prev) => ({
          ...prev,
          [inv.id]: { message: result.message, type: followUpType },
        }))
        setFollowUp({ result, invId: inv.id })
      }
    } finally {
      setLoadingFollowUp(null)
    }
  }

  const actionable = (status: string) => status === "overdue" || status === "pending" || status === "sent"

  function nextInvoiceNumber() {
    const nums = invoices
      .map((i) => parseInt(i.number.split("-").pop() ?? "0", 10))
      .filter((n) => !isNaN(n))
    const max = nums.length > 0 ? Math.max(...nums) : 0
    return `INV-2025-${String(max + 1).padStart(3, "0")}`
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-end border-b border-border px-4 py-2">
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> New Invoice
        </button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Invoice</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <React.Fragment key={inv.id}>
              <TableRow
                className="cursor-pointer"
                onClick={() => toggle(inv.id)}
              >
                {/* Expand chevron */}
                <TableCell className="pr-0 text-muted-foreground">
                  {expanded === inv.id
                    ? <ChevronDown className="h-3.5 w-3.5" />
                    : <ChevronRight className="h-3.5 w-3.5" />}
                </TableCell>

                <TableCell className="font-mono text-xs">{inv.number}</TableCell>

                <TableCell className="font-medium">{inv.customerName}</TableCell>

                <TableCell>${inv.amount.toFixed(2)}</TableCell>

                <TableCell>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusStyle(inv.status)}`}>
                    {inv.status}
                  </span>
                  {(inv.reminderCount ?? 0) > 0 && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Bell className="h-2.5 w-2.5" />{inv.reminderCount}
                    </span>
                  )}
                </TableCell>

                <TableCell className="text-xs">
                  {inv.status === "paid" ? (
                    <span className="text-emerald-600">Paid {inv.date}</span>
                  ) : (
                    <span className={inv.status === "overdue" ? "text-red-500" : "text-muted-foreground"}>
                      Due {inv.dueDate ?? inv.date}
                    </span>
                  )}
                </TableCell>

                <TableCell onClick={(e) => e.stopPropagation()}>
                  {sentMessages[inv.id] ? (
                    /* Inline sent confirmation — replaces follow-up button */
                    <div className="flex items-start gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadPDF(inv) }}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Download className="h-3 w-3" /> PDF
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`flex items-center gap-1 text-[11px] font-semibold ${
                          sentMessages[inv.id].type === "paid" ? "text-emerald-700" : "text-violet-700"
                        }`}>
                          <Check className="h-3 w-3 shrink-0" />
                          {sentMessages[inv.id].type === "paid" ? "Thank-you sent" : "Follow-up sent"}
                          <button
                            className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={(e) => { e.stopPropagation(); setSentMessages((p) => { const n = { ...p }; delete n[inv.id]; return n }) }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </p>
                        <p className="mt-0.5 text-[11px] italic leading-relaxed text-foreground/60 whitespace-normal break-words">
                          {sentMessages[inv.id].message}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {/* PDF download */}
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadPDF(inv) }}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Download className="h-3 w-3" /> PDF
                      </button>

                      {/* Paid: thank-you follow-up */}
                      {inv.status === "paid" && (
                        <button
                          onClick={(e) => sendFollowUp(inv, e)}
                          disabled={loadingFollowUp === inv.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                        >
                          {loadingFollowUp === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                          Send Thank-you
                        </button>
                      )}

                      {actionable(inv.status) && (
                        <>
                          {/* Mark Paid */}
                          <button
                            onClick={(e) => markPaid(inv, e)}
                            disabled={loadingPay === inv.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                          >
                            {loadingPay === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Mark Paid
                          </button>

                          {/* Remind (pending) or Send Follow-up (overdue) */}
                          {inv.status === "overdue" ? (
                            <>
                            <button
                              onClick={(e) => sendFollowUp(inv, e)}
                              disabled={loadingFollowUp === inv.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-50"
                            >
                              {loadingFollowUp === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
                              Send Follow-up
                            </button>
                            {/* Risk investigation — overdue invoices only */}
                            <span onClick={(e) => e.stopPropagation()}>
                              <InvestigationPanel
                                invoiceId={inv.id}
                                invoiceNumber={inv.number}
                                customerName={inv.customerName}
                                balance={inv.amount}
                                daysOverdue={
                                  inv.dueDate
                                    ? Math.max(0, Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)))
                                    : 0
                                }
                              />
                            </span>
                            </>
                          ) : (
                            <button
                              onClick={(e) => sendReminder(inv, e)}
                              disabled={loadingRemind === inv.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-50"
                            >
                              {loadingRemind === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
                              Remind
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>

              {expanded === inv.id && (
                <InvoiceDetail
                  key={`${inv.id}-detail`}
                  inv={inv}
                  onSave={(updated) =>
                    setInvoices((prev) => prev.map((i) => i.id === updated.id ? updated : i))
                  }
                />
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>

      {/* AI Reminder Modal */}
      {reminder && <ReminderModal result={reminder} onClose={() => setReminder(null)} />}

      {/* AI Follow-Up Modal */}
      {followUp && (
        <FollowUpModal
          result={followUp.result}
          onClose={() => setFollowUp(null)}
          onMarkSent={() => {
            const { invId, result } = followUp
            if (result.follow_up_type === "overdue") {
              setInvoices((prev) =>
                prev.map((i) =>
                  i.id === invId ? { ...i, reminderCount: (i.reminderCount ?? 0) + 1 } : i
                )
              )
            }
            setFollowUp(null)
          }}
        />
      )}

      {/* New Invoice Modal */}
      {showNewModal && (
        <NewInvoiceModal
          nextNumber={nextInvoiceNumber()}
          onClose={() => setShowNewModal(false)}
          onAdd={(inv) => setInvoices((prev) => [inv, ...prev])}
        />
      )}
    </>
  )
}
