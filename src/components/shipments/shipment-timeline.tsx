"use client"

import { useState } from "react"
import { ShipmentCard } from "./shipment-card"
import type { Shipment } from "@/lib/types"

const TODAY = "2026-04-11"

function dateLabel(isoDate: string): string {
  if (isoDate === TODAY) return "Today"
  const tomorrow = new Date(TODAY)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (isoDate === tomorrow.toISOString().slice(0, 10)) return "Tomorrow"
  return new Date(isoDate).toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "short",
  })
}

function groupByDate(shipments: Shipment[]): [string, Shipment[]][] {
  const map = new Map<string, Shipment[]>()
  for (const s of shipments) {
    const existing = map.get(s.expectedDeliveryDate) ?? []
    map.set(s.expectedDeliveryDate, [...existing, s])
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
}

export function ShipmentTimeline({ initialShipments }: { initialShipments: Shipment[] }) {
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments)
  const [showCancelled, setShowCancelled] = useState(false)

  function handleUpdate(updated: Shipment) {
    setShipments((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }

  const active    = shipments.filter((s) => s.status !== "cancelled")
  const cancelled = shipments.filter((s) => s.status === "cancelled")
  const groups    = groupByDate(active)

  return (
    <div className="space-y-8">
      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground">No incoming shipments this week.</p>
      )}

      {groups.map(([date, group]) => (
        <div key={date} className="space-y-3">
          {/* Date heading */}
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              {dateLabel(date)}
            </h2>
            <span className="text-xs text-muted-foreground">
              {new Date(date).toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
            </span>
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">
              {group.length} shipment{group.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Cards */}
          {group.map((s) => (
            <ShipmentCard key={s.id} shipment={s} onUpdate={handleUpdate} />
          ))}
        </div>
      ))}

      {/* Cancelled section */}
      {cancelled.length > 0 && (
        <div className="space-y-3">
          <button
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setShowCancelled((v) => !v)}
          >
            <div className="flex-1 h-px bg-border w-8" />
            {showCancelled ? "Hide" : "Show"} {cancelled.length} cancelled order{cancelled.length !== 1 ? "s" : ""}
          </button>
          {showCancelled && cancelled.map((s) => (
            <ShipmentCard key={s.id} shipment={s} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  )
}
