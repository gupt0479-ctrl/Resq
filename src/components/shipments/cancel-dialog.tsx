"use client"

import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface CancelDialogProps {
  open: boolean
  vendorName: string
  onClose: () => void
  onConfirm: (reason: string) => void
  saving: boolean
}

export function CancelDialog({ open, vendorName, onClose, onConfirm, saving }: CancelDialogProps) {
  const [reason, setReason] = useState("")

  function handleConfirm() {
    onConfirm(reason.trim() || "Cancelled by manager.")
    setReason("")
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <DialogTitle>Cancel shipment from {vendorName}?</DialogTitle>
        </div>
      </DialogHeader>
      <DialogBody>
        <p className="text-sm text-muted-foreground mb-3">
          This will mark the order as cancelled. Add an optional reason.
        </p>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Overstocked after manual audit…"
          rows={3}
          className="text-sm resize-none"
        />
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={saving}>Keep order</Button>
        <Button
          onClick={handleConfirm}
          disabled={saving}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          {saving ? "Cancelling…" : "Yes, cancel"}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
