import {
  Package,
  Truck,
  CalendarCheck,
  AlertTriangle,
  Clock,
  Wrench,
  LayoutGrid,
  TrendingUp,
  DollarSign,
} from "lucide-react"

type Props = {
  // Receiving section
  pendingCount: number
  inTransitCount: number
  arrivingTodayCount: number
  // Stock alerts section
  lowStockCount: number
  expiringCount: number
  issueCount: number
  // Overview section
  totalItems: number
  priceSpikeCount: number
  weekIncomingSpend: number
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

function Section({
  title,
  children,
  last,
}: {
  title: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <div className={`flex-1 px-6 py-4 ${!last ? "border-r border-border" : ""}`}>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  )
}

export function ReceivingStatusStrip({
  pendingCount,
  inTransitCount,
  arrivingTodayCount,
  lowStockCount,
  expiringCount,
  issueCount,
  totalItems,
  priceSpikeCount,
  weekIncomingSpend,
}: Props) {
  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(n)

  return (
    <div className="flex overflow-hidden rounded-xl bg-card shadow-sm">
      {/* Receiving */}
      <Section title="Receiving Status">
        <Metric
          icon={Package}
          label="Pending Orders"
          value={pendingCount}
          accent={pendingCount > 0 ? "text-muted-foreground" : undefined}
        />
        <Metric
          icon={Truck}
          label="In Transit"
          value={inTransitCount}
          accent={inTransitCount > 0 ? "text-blue-600" : undefined}
        />
        <Metric
          icon={CalendarCheck}
          label="Arriving Today"
          value={arrivingTodayCount}
          accent={arrivingTodayCount > 0 ? "text-amber-600" : undefined}
        />
      </Section>

      {/* Stock Alerts */}
      <Section title="Stock Alerts">
        <Metric
          icon={AlertTriangle}
          label="Low Stock"
          value={`${lowStockCount} items`}
          accent={lowStockCount > 0 ? "text-amber-600" : undefined}
        />
        <Metric
          icon={Clock}
          label="Expiring Soon"
          value={`${expiringCount} items`}
          accent={expiringCount > 0 ? "text-orange-600" : undefined}
        />
        <Metric
          icon={Wrench}
          label="Item Issues"
          value={`${issueCount} items`}
          accent={issueCount > 0 ? "text-red-600" : undefined}
        />
      </Section>

      {/* Overview */}
      <Section title="Overview" last>
        <Metric icon={LayoutGrid} label="Total Items" value={totalItems} />
        <Metric
          icon={TrendingUp}
          label="Price Spikes"
          value={priceSpikeCount}
          accent={priceSpikeCount > 0 ? "text-purple-600" : undefined}
        />
        <Metric
          icon={DollarSign}
          label="Week Incoming"
          value={fmtCurrency(weekIncomingSpend)}
        />
      </Section>
    </div>
  )
}
