import Link from "next/link"
import { Package, AlertTriangle, Clock, TrendingUp, Wrench } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InventoryTabs } from "@/components/inventory/inventory-tabs"
import { AlertsPanel } from "@/components/inventory/alerts-panel"
import { AiAdvisorPanel } from "@/components/inventory/ai-advisor-panel"
import { inventoryItems } from "@/lib/data/inventory"
import {
  getAlerts,
  getAlertSummary,
  getLowStockItems,
  getExpiringItems,
  getIssueItems,
  getPriceSpikeItems,
} from "@/lib/services/inventory"
import type { InventoryItem } from "@/lib/types"

type Tab = "all" | "low_stock" | "expiring" | "issues" | "price_spikes"

const VALID_TABS: Tab[] = ["all", "low_stock", "expiring", "issues", "price_spikes"]

function resolveTab(raw: string | string[] | undefined): Tab {
  const value = Array.isArray(raw) ? raw[0] : raw
  return VALID_TABS.includes(value as Tab) ? (value as Tab) : "all"
}

// Sort helpers — applied server-side so the initial render is already sorted
function sortByExpiry(items: InventoryItem[]): InventoryItem[] {
  return [...items].sort((a, b) => {
    // null expiry → end of list
    if (!a.expiresAt && !b.expiresAt) return 0
    if (!a.expiresAt) return 1
    if (!b.expiresAt) return -1
    return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
  })
}

function sortByQty(items: InventoryItem[]): InventoryItem[] {
  return [...items].sort((a, b) => a.quantityOnHand - b.quantityOnHand)
}

function sortAlpha(items: InventoryItem[]): InventoryItem[] {
  return [...items].sort((a, b) => a.itemName.localeCompare(b.itemName))
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { tab: rawTab } = await searchParams
  const activeTab = resolveTab(rawTab)

  const now = new Date()
  const summary = getAlertSummary(inventoryItems, now)
  const alerts = getAlerts(inventoryItems, now)

  const lowStockItems = sortByQty(getLowStockItems(inventoryItems))
  const expiringItems = sortByExpiry(getExpiringItems(inventoryItems, 30, now))
  const issueItems = getIssueItems(inventoryItems)
  const priceItems = getPriceSpikeItems(inventoryItems)
  const allItems = sortAlpha(inventoryItems)

  const criticalAlerts = alerts.filter((a) => a.severity === "critical")

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-sm text-muted-foreground">
          Stock levels, alerts, and reorder signals for Bistro Nova
        </p>
      </div>

      {/* Summary cards — each navigates to its tab */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link href="?tab=all">
          <Card className={`cursor-pointer transition-colors hover:bg-muted/50 ${activeTab === "all" ? "ring-2 ring-ring" : ""}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalItems}</div>
              <p className="text-xs text-muted-foreground">across all categories</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="?tab=low_stock">
          <Card className={`cursor-pointer transition-colors hover:bg-muted/50 ${activeTab === "low_stock" ? "ring-2 ring-ring" : ""} ${summary.lowStockCount > 0 ? "border-amber-300" : ""}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <Package className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{summary.lowStockCount}</div>
              <p className="text-xs text-muted-foreground">at or below reorder level</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="?tab=expiring">
          <Card className={`cursor-pointer transition-colors hover:bg-muted/50 ${activeTab === "expiring" ? "ring-2 ring-ring" : ""} ${summary.expiringCount > 0 ? "border-orange-300" : ""}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{summary.expiringCount}</div>
              <p className="text-xs text-muted-foreground">within 30 days</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="?tab=issues">
          <Card className={`cursor-pointer transition-colors hover:bg-muted/50 ${activeTab === "issues" ? "ring-2 ring-ring" : ""} ${summary.issueCount > 0 ? "border-red-300" : ""}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Item Issues</CardTitle>
              <Wrench className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.issueCount}</div>
              <p className="text-xs text-muted-foreground">equipment or quality flags</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="?tab=price_spikes">
          <Card className={`cursor-pointer transition-colors hover:bg-muted/50 ${activeTab === "price_spikes" ? "ring-2 ring-ring" : ""} ${summary.priceSpikeCount > 0 ? "border-purple-300" : ""}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Price Spikes</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{summary.priceSpikeCount}</div>
              <p className="text-xs text-muted-foreground">significant cost increases</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Table section */}
        <div className="lg:col-span-2">
          <InventoryTabs
            activeTab={activeTab}
            allItems={allItems}
            lowStockItems={lowStockItems}
            expiringItems={expiringItems}
            issueItems={issueItems}
            priceItems={priceItems}
            summary={summary}
          />
        </div>

        {/* Alerts + AI sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                {criticalAlerts.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <AlertTriangle className="h-3 w-3" />
                    {criticalAlerts.length} critical
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <AlertsPanel alerts={alerts} />
            </CardContent>
          </Card>

          <AiAdvisorPanel />
        </div>
      </div>
    </div>
  )
}
