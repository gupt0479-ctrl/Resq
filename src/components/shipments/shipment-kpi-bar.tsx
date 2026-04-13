import { Package, Truck, CalendarCheck, DollarSign } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Shipment } from "@/lib/types"

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n)
}

export function ShipmentKpiBar({ shipments, today }: { shipments: Shipment[]; today: string }) {
  const active = shipments.filter((s) => s.status !== "cancelled")
  const arrivingToday  = active.filter((s) => s.expectedDeliveryDate === today && s.status !== "delivered")
  const inTransit      = active.filter((s) => s.status === "in_transit")
  const pending        = active.filter((s) => s.status === "pending")
  const weekValue      = active.reduce((sum, s) => sum + s.totalCost, 0)

  const kpis = [
    {
      label: "Arriving Today",
      value: arrivingToday.length,
      sub: arrivingToday.length === 1 ? "shipment" : "shipments",
      icon: CalendarCheck,
      accent: arrivingToday.length > 0 ? "text-amber-600" : "text-muted-foreground",
    },
    {
      label: "In Transit",
      value: inTransit.length,
      sub: "shipments",
      icon: Truck,
      accent: inTransit.length > 0 ? "text-blue-600" : "text-muted-foreground",
    },
    {
      label: "Awaiting Confirmation",
      value: pending.length,
      sub: "orders to confirm",
      icon: Package,
      accent: pending.length > 0 ? "text-zinc-700" : "text-muted-foreground",
    },
    {
      label: "Week Incoming Value",
      value: fmt(weekValue),
      sub: "across all orders",
      icon: DollarSign,
      accent: "text-foreground",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map(({ label, value, sub, icon: Icon, accent }) => (
        <Card key={label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{label}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${accent}`}>{value}</div>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
