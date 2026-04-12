"use client"

import { AlertTriangle, AlertCircle, TrendingUp, Package, Wrench } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { InventoryAlert } from "@/lib/types"

const alertConfig = {
  low_stock: {
    icon: Package,
    label: "Low Stock",
    criticalClass: "text-red-600",
    warningClass: "text-amber-600",
  },
  expiry_soon: {
    icon: AlertCircle,
    label: "Expiry",
    criticalClass: "text-red-600",
    warningClass: "text-amber-600",
  },
  price_increase: {
    icon: TrendingUp,
    label: "Price Rise",
    criticalClass: "text-red-600",
    warningClass: "text-amber-600",
  },
  equipment_issue: {
    icon: Wrench,
    label: "Issue",
    criticalClass: "text-red-600",
    warningClass: "text-amber-600",
  },
}

interface AlertCardProps {
  alert: InventoryAlert
}

export function AlertCard({ alert }: AlertCardProps) {
  const config = alertConfig[alert.alertType]
  const Icon = alert.severity === "critical" ? AlertTriangle : config.icon
  const colorClass =
    alert.severity === "critical" ? config.criticalClass : config.warningClass

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${colorClass}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{alert.itemName}</span>
          <Badge
            variant={alert.severity === "critical" ? "destructive" : "secondary"}
            className="shrink-0 text-xs"
          >
            {config.label}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{alert.message}</p>
      </div>
    </div>
  )
}
