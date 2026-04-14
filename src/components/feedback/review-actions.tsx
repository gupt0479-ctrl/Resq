"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface ReviewActionsProps {
  feedbackId: string
  approveLabel: string
  onApprove?: () => void
}

export function ReviewActions({ feedbackId, approveLabel, onApprove }: ReviewActionsProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [isRefreshing, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const disabled = busy || isRefreshing

  return (
    <div className="flex flex-col gap-1">
      {err ? <p className="text-xs text-destructive">{err}</p> : null}
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={disabled}
          onClick={async () => {
            setErr(null)
            setBusy(true)
            try {
              const res = await fetch(`/api/feedback/${feedbackId}/approve-reply`, {
                method: "POST",
              })
              if (!res.ok) {
                const j = (await res.json().catch(() => ({}))) as { error?: string }
                throw new Error(typeof j.error === "string" ? j.error : `Request failed (${res.status})`)
              }
              onApprove?.()
              startTransition(() => router.refresh())
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Something went wrong")
            } finally {
              setBusy(false)
            }
          }}
        >
          {disabled ? "Saving..." : approveLabel}
        </Button>
      </div>
    </div>
  )
}

interface DismissActionsProps {
  followUpActionId: string
  approveLabel: string
}

export function DismissActions({ followUpActionId, approveLabel }: DismissActionsProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [isRefreshing, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const disabled = busy || isRefreshing

  async function postDecision(decision: "approve" | "dismiss") {
    setErr(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/feedback/follow-ups/${followUpActionId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ decision }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(typeof j.error === "string" ? j.error : `Request failed (${res.status})`)
      }
      startTransition(() => router.refresh())
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {err ? <p className="text-xs text-destructive">{err}</p> : null}
      <div className="flex gap-2">
        <Button size="sm" disabled={disabled} onClick={() => void postDecision("approve")}>
          {disabled ? "Saving..." : approveLabel}
        </Button>
        <Button size="sm" variant="outline" disabled={disabled} onClick={() => void postDecision("dismiss")}>
          Dismiss
        </Button>
      </div>
    </div>
  )
}
