"use client"

import { AlertCard } from "./alert-card"
import type { InventoryAlert } from "@/lib/types"

interface AlertsPanelProps {
  alerts: InventoryAlert[]
  maxVisible?: number
}

export function AlertsPanel({ alerts, maxVisible }: AlertsPanelProps) {
  const visible = maxVisible ? alerts.slice(0, maxVisible) : alerts
  const hiddenCount = alerts.length - visible.length

  if (alerts.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No active alerts
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {visible.map((alert) => (
        <AlertCard key={alert.id} alert={alert} />
      ))}
      {hiddenCount > 0 && (
        <p className="pt-1 text-center text-xs text-muted-foreground">
          +{hiddenCount} more alert{hiddenCount === 1 ? "" : "s"}
        </p>
      )}
    </div>
  )
}
