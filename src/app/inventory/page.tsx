import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InventoryTabs } from "@/components/inventory/inventory-tabs"
import { AddItemDialog } from "@/components/inventory/add-item-dialog"
import { AiAdvisorPanel } from "@/components/inventory/ai-advisor-panel"
import { ReceivingStatusStrip } from "@/components/inventory/receiving-status-strip"
import { StockHealthChart } from "@/components/inventory/stock-health-chart"
import { VendorPerformanceCard } from "@/components/inventory/vendor-performance-card"
import { SpendTrendsCard } from "@/components/inventory/spend-trends-card"
import { getInventoryItems, getShipments, getFinanceTransactions } from "@/lib/supabase/queries"
import { computeVendorPerformance } from "@/lib/inventory/vendor-performance"
import { computeSpendTrends } from "@/lib/inventory/spend-trends"
import {
  getAlertSummary,
  getExpiredItems,
  getLowStockItems,
  getExpiringItems,
  getIssueItems,
  getPriceSpikeItems,
} from "@/lib/services/inventory"
import type { InventoryItem } from "@/lib/types"

type Tab = "all" | "low_stock" | "expiring" | "expired" | "issues" | "price_spikes"
const VALID_TABS: Tab[] = ["all", "low_stock", "expiring", "expired", "issues", "price_spikes"]

function resolveTab(raw: string | string[] | undefined): Tab {
  const value = Array.isArray(raw) ? raw[0] : raw
  return VALID_TABS.includes(value as Tab) ? (value as Tab) : "all"
}

function sortByExpiry(items: InventoryItem[]): InventoryItem[] {
  return [...items].sort((a, b) => {
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

// ── Content: reads searchParams + fetches data (runs inside Suspense) ────────

async function InventoryContent({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { tab: rawTab } = await searchParams
  const activeTab = resolveTab(rawTab)

  const [inventoryItems, shipments, transactions] = await Promise.all([
    getInventoryItems(),
    getShipments(),
    getFinanceTransactions(),
  ])

  const asOfDate = new Date().toISOString().slice(0, 10)
  const now = new Date()
  const summary = getAlertSummary(inventoryItems, now)

  const lowStockItems = sortByQty(getLowStockItems(inventoryItems))
  const expiringItems = sortByExpiry(getExpiringItems(inventoryItems, 30, now))
  const expiredItems  = sortByExpiry(getExpiredItems(inventoryItems, now))
  const issueItems    = getIssueItems(inventoryItems)
  const priceItems    = getPriceSpikeItems(inventoryItems)
  const allItems      = sortAlpha(inventoryItems)
  const itemOptions = Array.from(new Set(allItems.map((item) => item.itemName.trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b))
  const itemDefaultsMap = new Map<
    string,
    { itemName: string; category: string; unitCost: number }
  >()
  for (const item of allItems) {
    const key = item.itemName.trim().toLowerCase()
    const itemName = item.itemName.trim()
    const category = item.category.trim()
    if (!key || !itemName || !category || itemDefaultsMap.has(key)) continue
    itemDefaultsMap.set(key, { itemName, category, unitCost: item.unitCost })
  }
  const itemDefaults = Array.from(itemDefaultsMap.values()).sort((a, b) =>
    a.itemName.localeCompare(b.itemName)
  )
  const vendorOptions = Array.from(new Set(allItems.map((item) => item.vendorName.trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b))
  const categoryOptions = Array.from(new Set(allItems.map((item) => item.category.trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b))

  const todayStr           = asOfDate
  const pendingCount       = shipments.filter((s) => s.status === "pending").length
  const inTransitCount     = shipments.filter((s) => s.status === "in_transit").length
  const arrivingTodayCount = shipments.filter(
    (s) => s.expectedDeliveryDate === todayStr && s.status !== "delivered" && s.status !== "cancelled"
  ).length

  const cutoff = new Date(`${asOfDate}T00:00:00Z`)
  cutoff.setDate(cutoff.getDate() + 7)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  const windowStart = new Date(`${asOfDate}T00:00:00Z`)
  windowStart.setDate(windowStart.getDate() - 7)
  const windowStartStr = windowStart.toISOString().slice(0, 10)
  const weekIncomingSpend = shipments
    .filter(
      (s) =>
        s.status !== "cancelled" &&
        s.expectedDeliveryDate >= windowStartStr &&
        s.expectedDeliveryDate <= cutoffStr
    )
    .reduce((sum, s) => sum + s.totalCost, 0)

  const vendorStats  = computeVendorPerformance(shipments, inventoryItems)
  const spendTrends  = computeSpendTrends(shipments, transactions, asOfDate)

  const lowStockSet  = new Set(lowStockItems.map((i) => i.id))
  const expiringSet  = new Set(expiringItems.map((i) => i.id))
  const expiredSet   = new Set(expiredItems.map((i) => i.id))
  const issueSet     = new Set(issueItems.map((i) => i.id))
  const atRiskCount  = lowStockItems.length
  const issueCount   = issueItems.length
  const expiringCnt  = expiringItems.length
  const healthyCount = inventoryItems.filter(
    (i) => !lowStockSet.has(i.id) && !expiringSet.has(i.id) && !expiredSet.has(i.id) && !issueSet.has(i.id)
  ).length

  return (
    <>
      <ReceivingStatusStrip
        pendingCount={pendingCount}
        inTransitCount={inTransitCount}
        arrivingTodayCount={arrivingTodayCount}
        lowStockCount={summary.lowStockCount}
        expiringCount={summary.expiringCount}
        issueCount={summary.issueCount}
        totalItems={summary.totalItems}
        priceSpikeCount={summary.priceSpikeCount}
        weekIncomingSpend={weekIncomingSpend}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Stock Health
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <StockHealthChart
              totalItems={summary.totalItems}
              healthyCount={healthyCount}
              atRiskCount={atRiskCount}
              expiringCount={expiringCnt}
              issueCount={issueCount}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Vendor Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <VendorPerformanceCard vendorStats={vendorStats} />
          </CardContent>
        </Card>
      </div>

      <AiAdvisorPanel />

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Spend Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <SpendTrendsCard data={spendTrends} />
        </CardContent>
      </Card>

      <Card className="overflow-visible">
        <CardHeader className="border-b border-border pb-0 pt-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="px-0 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Inventory Items
            </CardTitle>
            <AddItemDialog
              itemOptions={itemOptions}
              itemDefaults={itemDefaults}
              vendorOptions={vendorOptions}
              categoryOptions={categoryOptions}
            />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <InventoryTabs
            activeTab={activeTab}
            allItems={allItems}
            lowStockItems={lowStockItems}
            expiringItems={expiringItems}
            expiredItems={expiredItems}
            issueItems={issueItems}
            priceItems={priceItems}
            summary={summary}
          />
        </CardContent>
      </Card>
    </>
  )
}

// ── Skeleton fallback ────────────────────────────────────────────────────────

function InventorySkeleton() {
  return (
    <>
      <div className="h-24 rounded-xl bg-muted animate-pulse" />
      <div className="grid gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
      <div className="h-96 rounded-xl bg-muted animate-pulse" />
    </>
  )
}

// ── Page shell ───────────────────────────────────────────────────────────────

export default function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Inventory</h1>
        <p className="text-xs text-muted-foreground">
          Stock levels, alerts, and reorder signals · Resq
        </p>
      </div>

      <Suspense fallback={<InventorySkeleton />}>
        <InventoryContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
