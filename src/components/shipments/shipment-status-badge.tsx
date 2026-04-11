import type { ShipmentStatus } from "@/lib/types"

const styles: Record<ShipmentStatus, string> = {
  pending:   "bg-zinc-100 text-zinc-600 border-zinc-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  in_transit:"bg-amber-100 text-amber-700 border-amber-200",
  delivered: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-600 border-red-200",
}

const labels: Record<ShipmentStatus, string> = {
  pending:   "Pending",
  confirmed: "Confirmed",
  in_transit:"In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
}

const dots: Record<ShipmentStatus, string> = {
  pending:   "bg-zinc-400",
  confirmed: "bg-blue-500",
  in_transit:"bg-amber-500",
  delivered: "bg-green-500",
  cancelled: "bg-red-400",
}

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status]}`} />
      {labels[status]}
    </span>
  )
}
