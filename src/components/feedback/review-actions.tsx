"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

interface ReviewActionsProps {
  approveLabel: string
  draftLabel?: string
  onApprove?: () => void
}

export function ReviewActions({ approveLabel, draftLabel = "Edit Draft" }: ReviewActionsProps) {
  const [done, setDone] = useState(false)

  if (done) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
        <CheckCircle className="h-3.5 w-3.5" />
        Approved & sent
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => setDone(true)}>
        {approveLabel}
      </Button>
      <Button size="sm" variant="outline">
        {draftLabel}
      </Button>
    </div>
  )
}

interface DismissActionsProps {
  approveLabel: string
}

export function DismissActions({ approveLabel }: DismissActionsProps) {
  const [state, setState] = useState<"idle" | "approved" | "dismissed">("idle")

  if (state === "approved") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
        <CheckCircle className="h-3.5 w-3.5" />
        Approved & sending
      </div>
    )
  }

  if (state === "dismissed") {
    return <p className="text-xs text-muted-foreground">Dismissed</p>
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => setState("approved")}>
        {approveLabel}
      </Button>
      <Button size="sm" variant="outline" onClick={() => setState("dismissed")}>
        Dismiss
      </Button>
    </div>
  )
}
