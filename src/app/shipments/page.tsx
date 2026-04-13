import { Suspense } from "react"
import { connection } from "next/server"
import { Package, Truck, CalendarCheck, DollarSign } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShipmentTable } from "@/components/shipments/shipment-table"
import { getShipments } from "@/lib/supabase/queries"

const TODAY = "2026-04-11"

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(n)
}

function Metric({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  accent?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-xs text-muted-foreground">{label}</span>
      </div>
      <span className={`text-sm font-semibold tabular-nums ${accent ?? "text-foreground"}`}>
        {value}
      </span>
    </div>
  )
}

// ── Content: fetches and computes data inside Suspense ────────────────────────

async function ShipmentsContent() {
  const shipments = await getShipments()

  const cutoff = new Date(TODAY)
  cutoff.setDate(cutoff.getDate() + 7)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const windowStart = new Date(TODAY)
  windowStart.setDate(windowStart.getDate() - 7)
  const windowStartStr = windowStart.toISOString().slice(0, 10)

  const weekShipments = shipments.filter(
    (s) =>
      (s.expectedDeliveryDate >= windowStartStr && s.expectedDeliveryDate <= cutoffStr) ||
      s.status === "cancelled"
  )

  const active        = weekShipments.filter((s) => s.status !== "cancelled")
  const arrivingToday = active.filter((s) => s.expectedDeliveryDate === TODAY && s.status !== "delivered")
  const inTransit     = active.filter((s) => s.status === "in_transit")
  const pending       = active.filter((s) => s.status === "pending")
  const delivered     = active.filter((s) => s.status === "delivered")
  const weekValue     = active.reduce((sum, s) => sum + s.totalCost, 0)

  return (
    <>
      {/* KPI strip */}
      <div className="flex overflow-hidden rounded-xl bg-card shadow-sm">
        <div className="flex-1 border-r border-border px-6 py-4">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Shipment Status
          </p>
          <Metric
            icon={CalendarCheck}
            label="Arriving Today"
            value={arrivingToday.length}
            accent={arrivingToday.length > 0 ? "text-amber-600" : undefined}
          />
          <Metric
            icon={Truck}
            label="In Transit"
            value={inTransit.length}
            accent={inTransit.length > 0 ? "text-blue-600" : undefined}
          />
          <Metric
            icon={Package}
            label="Pending Confirmation"
            value={pending.length}
            accent={pending.length > 0 ? "text-muted-foreground" : undefined}
          />
        </div>

        <div className="flex-1 border-r border-border px-6 py-4">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            This Week
          </p>
          <Metric icon={Package} label="Total Orders" value={active.length} />
          <Metric
            icon={CalendarCheck}
            label="Delivered"
            value={delivered.length}
            accent="text-emerald-600"
          />
          <Metric
            icon={Package}
            label="Cancelled"
            value={weekShipments.filter((s) => s.status === "cancelled").length}
          />
        </div>

        <div className="flex-1 px-6 py-4">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Financial
          </p>
          <Metric icon={DollarSign} label="Week Incoming Value" value={fmt(weekValue)} />
          <Metric
            icon={DollarSign}
            label="Avg Order Value"
            value={active.length > 0 ? fmt(weekValue / active.length) : "—"}
          />
          <Metric
            icon={Package}
            label="Total Line Items"
            value={active.reduce((n, s) => n + s.lineItems.length, 0)}
          />
        </div>
      </div>

      {/* Shipments table */}
      <Card className="overflow-visible">
        <CardHeader className="border-b border-border pb-0 pt-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Latest Shipments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ShipmentTable initialShipments={weekShipments} />
        </CardContent>
      </Card>
    </>
  )
}

// ── Skeleton fallback ────────────────────────────────────────────────────────

function ShipmentsSkeleton() {
  return (
    <>
      <div className="h-32 rounded-xl bg-muted animate-pulse" />
      <div className="h-96 rounded-xl bg-muted animate-pulse" />
    </>
  )
}

// ── Page shell: synchronous, no runtime API access ───────────────────────────

export default async function ShipmentsPage() {
  await connection()

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Procurement</h1>
        <p className="text-xs text-muted-foreground">
          Ledger inventory purchases (last 7 days through next 7) · Ember Table
        </p>
      </div>

      <Suspense fallback={<ShipmentsSkeleton />}>
        <ShipmentsContent />
      </Suspense>
    </div>
  )
}
