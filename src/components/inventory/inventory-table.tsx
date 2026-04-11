"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import type { InventoryItem } from "@/lib/types"

interface InventoryTableProps {
  items: InventoryItem[]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(dateStr))
}

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  const daysUntil = Math.ceil(
    (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  return daysUntil >= 0 && daysUntil <= 30
}

export function InventoryTable({ items }: InventoryTableProps) {
  const [search, setSearch] = useState("")

  const filtered = items.filter(
    (item) =>
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      item.vendorName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search by name, category, or vendor..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">In Stock</TableHead>
              <TableHead className="text-right">Reorder At</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No items match your search
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => {
                const isLow = item.quantityOnHand <= item.reorderLevel
                const isOut = item.quantityOnHand === 0
                const expiring = isExpiringSoon(item.expiresAt)

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.itemName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.category}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono ${
                        isOut
                          ? "text-red-600 font-semibold"
                          : isLow
                          ? "text-amber-600 font-semibold"
                          : ""
                      }`}
                    >
                      {item.quantityOnHand}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {item.reorderLevel}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.previousUnitCost !== undefined ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="font-mono font-medium">
                            {formatCurrency(item.unitCost)}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground line-through">
                            {formatCurrency(item.previousUnitCost)}
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              item.priceTrendStatus === "spike"
                                ? "text-purple-600"
                                : "text-blue-600"
                            }`}
                          >
                            +{Math.round(((item.unitCost - item.previousUnitCost) / item.previousUnitCost) * 100)}%
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono">{formatCurrency(item.unitCost)}</span>
                      )}
                    </TableCell>
                    <TableCell
                      className={expiring ? "text-amber-600 font-medium" : "text-muted-foreground"}
                    >
                      {formatDate(item.expiresAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.vendorName}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {isOut && (
                          <Badge variant="destructive" className="text-xs">
                            Out of Stock
                          </Badge>
                        )}
                        {!isOut && isLow && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                            Low Stock
                          </Badge>
                        )}
                        {expiring && (
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                            Expiring
                          </Badge>
                        )}
                        {item.priceTrendStatus === "spike" && (
                          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                            Price Spike
                          </Badge>
                        )}
                        {item.priceTrendStatus === "rising" && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                            Price Rising
                          </Badge>
                        )}
                        {item.issueStatus !== "none" && (
                          <Badge variant="destructive" className="text-xs">
                            {item.issueStatus === "equipment_issue"
                              ? "Equipment Issue"
                              : item.issueStatus === "quality_concern"
                              ? "Quality Concern"
                              : "Discontinued"}
                          </Badge>
                        )}
                        {!isOut && !isLow && !expiring && item.priceTrendStatus === "stable" && item.issueStatus === "none" && (
                          <span className="text-xs text-muted-foreground">OK</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        {filtered.length} of {items.length} items
      </p>
    </div>
  )
}
