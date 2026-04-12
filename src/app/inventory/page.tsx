import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Clock } from "lucide-react"

// TODO: replace with Supabase query
const MOCK_INVENTORY = [
  { id: "i01", name: "Wagyu Ribeye",       category: "Protein",   qty: 4,    unit: "portions", reorder: 8,  max: 20, status: "critical", vendor: "Premium Meats Co",      expiresInDays: 2,  priceSpike: true },
  { id: "i02", name: "Braised Short Rib",  category: "Protein",   qty: 7,    unit: "portions", reorder: 6,  max: 18, status: "low",      vendor: "Heritage Farms",         expiresInDays: null },
  { id: "i03", name: "Heirloom Beets",     category: "Produce",   qty: 2.5,  unit: "kg",       reorder: 3,  max: 8,  status: "low",      vendor: "Local Harvest Farm",     expiresInDays: 5 },
  { id: "i04", name: "Burrata",            category: "Dairy",     qty: 6,    unit: "units",    reorder: 8,  max: 20, status: "low",      vendor: "Artisan Dairy",          expiresInDays: 3 },
  { id: "i05", name: "Duck Breast",        category: "Protein",   qty: 12,   unit: "portions", reorder: 8,  max: 24, status: "ok",       vendor: "Heritage Farms",         expiresInDays: null },
  { id: "i06", name: "Crème Brûlée Mix",   category: "Pastry",    qty: 15,   unit: "portions", reorder: 10, max: 30, status: "ok",       vendor: "Kitchen Essentials",     expiresInDays: null },
  { id: "i07", name: "Pinot Noir",         category: "Wine",      qty: 24,   unit: "bottles",  reorder: 12, max: 36, status: "ok",       vendor: "Midwest Wine Dist.",     expiresInDays: null },
  { id: "i08", name: "Champagne",          category: "Wine",      qty: 18,   unit: "bottles",  reorder: 6,  max: 24, status: "ok",       vendor: "Midwest Wine Dist.",     expiresInDays: null },
  { id: "i09", name: "Heirloom Tomatoes",  category: "Produce",   qty: 8,    unit: "kg",       reorder: 5,  max: 15, status: "ok",       vendor: "Local Harvest Farm",     expiresInDays: null },
  { id: "i10", name: "Truffle Oil",        category: "Pantry",    qty: 4,    unit: "bottles",  reorder: 2,  max: 8,  status: "ok",       vendor: "Specialty Foods Inc",    expiresInDays: null },
  { id: "i11", name: "Brioche Bread",      category: "Bakery",    qty: 20,   unit: "loaves",   reorder: 10, max: 30, status: "ok",       vendor: "Artisan Bakery",         expiresInDays: 2 },
  { id: "i12", name: "Sea Bass",           category: "Seafood",   qty: 10,   unit: "portions", reorder: 6,  max: 20, status: "ok",       vendor: "Pacific Seafood",        expiresInDays: null },
  { id: "i13", name: "Lobster",            category: "Seafood",   qty: 8,    unit: "portions", reorder: 4,  max: 16, status: "ok",       vendor: "Pacific Seafood",        expiresInDays: null, priceSpike: true },
  { id: "i14", name: "Olive Oil",          category: "Pantry",    qty: 6,    unit: "liters",   reorder: 3,  max: 12, status: "ok",       vendor: "Specialty Foods Inc",    expiresInDays: null },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusStyle(status: string) {
  switch (status) {
    case "critical":    return { badge: "bg-red-100 text-red-700",    bar: "bg-red-500" }
    case "low":         return { badge: "bg-amber-100 text-amber-700", bar: "bg-amber-400" }
    case "price_spike": return { badge: "bg-purple-100 text-purple-700", bar: "bg-purple-500" }
    default:            return { badge: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500" }
  }
}

function categoryColor(cat: string) {
  const map: Record<string, string> = {
    Protein:  "bg-red-50 text-red-600",
    Produce:  "bg-green-50 text-green-700",
    Dairy:    "bg-blue-50 text-blue-600",
    Wine:     "bg-purple-50 text-purple-600",
    Seafood:  "bg-cyan-50 text-cyan-700",
    Pastry:   "bg-pink-50 text-pink-600",
    Bakery:   "bg-orange-50 text-orange-600",
    Pantry:   "bg-gray-100 text-gray-600",
  }
  return map[cat] ?? "bg-muted text-muted-foreground"
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const criticalCount = MOCK_INVENTORY.filter((i) => i.status === "critical" || i.status === "low").length

  // Sort: critical first, then low, then ok
  const sorted = [...MOCK_INVENTORY].sort((a, b) => {
    const order = { critical: 0, low: 1, ok: 2 }
    return (order[a.status as keyof typeof order] ?? 2) - (order[b.status as keyof typeof order] ?? 2)
  })

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Inventory</h1>
        <p className="text-xs text-muted-foreground">Stock levels, alerts, and reorder signals · Ember Table</p>
      </div>

      {/* Alert banner */}
      {criticalCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <p className="text-sm font-medium text-red-700">
            {criticalCount} items critically low — reorder needed before dinner service
          </p>
        </div>
      )}

      {/* Cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sorted.map((item) => {
          const effectiveStatus = item.priceSpike && item.status === "ok" ? "price_spike" : item.status
          const style = statusStyle(effectiveStatus)
          const pct = Math.min(100, Math.round((item.qty / item.max) * 100))
          const expiringSoon = item.expiresInDays !== null && item.expiresInDays !== undefined && item.expiresInDays <= 3

          return (
            <Card
              key={item.id}
              className={item.status === "critical" ? "ring-2 ring-red-300" : ""}
            >
              <CardContent className="p-4">
                {/* Name + category */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm text-foreground leading-snug">{item.name}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryColor(item.category)}`}>
                      {item.category}
                    </span>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
                    {effectiveStatus === "price_spike" ? "price spike" : effectiveStatus}
                  </span>
                </div>

                {/* Qty */}
                <div className="mt-3">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      {item.qty} {item.unit}
                    </span>
                    <span className="text-muted-foreground">reorder at {item.reorder}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${style.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Vendor */}
                <p className="mt-2.5 text-[11px] text-muted-foreground">{item.vendor}</p>

                {/* Badges */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.priceSpike && (
                    <Badge variant="outline" className="text-[10px] border-purple-200 text-purple-600">
                      Price rising
                    </Badge>
                  )}
                  {expiringSoon && (
                    <span className="flex items-center gap-0.5 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700">
                      <Clock className="h-2.5 w-2.5" />
                      Expires in {item.expiresInDays}d
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
