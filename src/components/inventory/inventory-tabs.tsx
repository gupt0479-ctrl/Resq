"use client"

import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { InventoryTable } from "./inventory-table"
import type { InventoryItem } from "@/lib/types"

type Tab = "all" | "low_stock" | "expiring" | "issues" | "price_spikes"

interface InventoryTabsProps {
  activeTab: Tab
  allItems: InventoryItem[]
  lowStockItems: InventoryItem[]
  expiringItems: InventoryItem[]
  issueItems: InventoryItem[]
  priceItems: InventoryItem[]
  summary: {
    totalItems: number
    lowStockCount: number
    expiringCount: number
    issueCount: number
    priceSpikeCount: number
  }
}

export function InventoryTabs({
  activeTab,
  allItems,
  lowStockItems,
  expiringItems,
  issueItems,
  priceItems,
  summary,
}: InventoryTabsProps) {
  const router = useRouter()

  return (
    <Tabs value={activeTab} onValueChange={(tab) => router.push(`?tab=${tab}`, { scroll: false })}>
      <TabsList>
        <TabsTrigger value="all">
          All Items
          <Badge variant="secondary" className="ml-1.5 text-xs">
            {summary.totalItems}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="low_stock">
          Low Stock
          {summary.lowStockCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 text-xs bg-amber-100 text-amber-800">
              {summary.lowStockCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="expiring">
          Expiring
          {summary.expiringCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 text-xs bg-orange-100 text-orange-800">
              {summary.expiringCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="issues">
          Issues
          {summary.issueCount > 0 && (
            <Badge variant="destructive" className="ml-1.5 text-xs">
              {summary.issueCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="price_spikes">
          Price Spikes
          {summary.priceSpikeCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 text-xs bg-purple-100 text-purple-800">
              {summary.priceSpikeCount}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <div className="mt-4">
        <TabsContent value="all">
          <InventoryTable items={allItems} />
        </TabsContent>
        <TabsContent value="low_stock">
          <InventoryTable items={lowStockItems} />
        </TabsContent>
        <TabsContent value="expiring">
          <InventoryTable items={expiringItems} />
        </TabsContent>
        <TabsContent value="issues">
          <InventoryTable items={issueItems} />
        </TabsContent>
        <TabsContent value="price_spikes">
          <InventoryTable items={priceItems} />
        </TabsContent>
      </div>
    </Tabs>
  )
}
