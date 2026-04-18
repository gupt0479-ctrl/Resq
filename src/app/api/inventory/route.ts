import { NextRequest } from "next/server"
import { getInventoryItems, createInventoryItem } from "@/lib/supabase/queries"
import type { InventoryItem } from "@/lib/types"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const category = searchParams.get("category")
  const alert = searchParams.get("alert")

  let results = await getInventoryItems()

  if (category) {
    results = results.filter(
      (item) => item.category.toLowerCase() === category.toLowerCase()
    )
  }

  if (alert === "low_stock") {
    results = results.filter((item) => item.quantityOnHand <= item.reorderLevel)
  } else if (alert === "expiry_soon") {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + 30)
    results = results.filter(
      (item) => item.expiresAt && new Date(item.expiresAt) <= cutoff
    )
  } else if (alert === "issues") {
    results = results.filter((item) => item.issueStatus !== "none")
  } else if (alert === "price_spike") {
    results = results.filter((item) => item.priceTrendStatus === "spike")
  }

  return Response.json({ data: results })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const readString = (camel: string, snake: string) => {
      const value = body[snake] ?? body[camel]
      return typeof value === "string" ? value.trim() : ""
    }
    const readNumber = (camel: string, snake: string) => {
      const value = body[snake] ?? body[camel]
      return value === undefined || value === null || value === "" ? undefined : Number(value)
    }

    const itemName = readString("itemName", "item_name")
    const category = readString("category", "category")
    const vendorName = readString("vendorName", "vendor_name")
    const unitCost = readNumber("unitCost", "unit_cost")
    const quantityOnHand = readNumber("quantityOnHand", "quantity_on_hand")
    const reorderLevel = readNumber("reorderLevel", "reorder_level")
    const previousUnitCost = readNumber("previousUnitCost", "previous_unit_cost")
    const expiresAtRaw = body.expires_at ?? body.expiresAt
    const expiresAt =
      typeof expiresAtRaw === "string" && expiresAtRaw.trim().length > 0
        ? expiresAtRaw.trim()
        : null

    const issueStatusRaw = body.issue_status ?? body.issueStatus
    const issueStatus =
      typeof issueStatusRaw === "string" ? issueStatusRaw : "none"
    const validIssueStatuses: InventoryItem["issueStatus"][] = [
      "none",
      "equipment_issue",
      "quality_concern",
      "discontinued",
    ]

    const priceTrendStatusRaw = body.price_trend_status ?? body.priceTrendStatus
    const priceTrendStatus =
      typeof priceTrendStatusRaw === "string" ? priceTrendStatusRaw : "stable"
    const validPriceTrends: InventoryItem["priceTrendStatus"][] = [
      "stable",
      "rising",
      "spike",
    ]

    if (!itemName) {
      return Response.json({ error: "item_name is required" }, { status: 400 })
    }
    if (!category) {
      return Response.json({ error: "category is required" }, { status: 400 })
    }
    if (unitCost === undefined || Number.isNaN(unitCost) || unitCost < 0) {
      return Response.json({ error: "unit_cost must be a non-negative number" }, { status: 400 })
    }
    if (
      quantityOnHand !== undefined &&
      (Number.isNaN(quantityOnHand) || quantityOnHand < 0)
    ) {
      return Response.json(
        { error: "quantity_on_hand must be a non-negative number" },
        { status: 400 }
      )
    }
    if (reorderLevel !== undefined && (Number.isNaN(reorderLevel) || reorderLevel < 0)) {
      return Response.json(
        { error: "reorder_level must be a non-negative number" },
        { status: 400 }
      )
    }
    if (
      previousUnitCost !== undefined &&
      (Number.isNaN(previousUnitCost) || previousUnitCost < 0)
    ) {
      return Response.json(
        { error: "previous_unit_cost must be a non-negative number" },
        { status: 400 }
      )
    }
    if (!validIssueStatuses.includes(issueStatus as InventoryItem["issueStatus"])) {
      return Response.json({ error: "issue_status is invalid" }, { status: 400 })
    }
    if (!validPriceTrends.includes(priceTrendStatus as InventoryItem["priceTrendStatus"])) {
      return Response.json({ error: "price_trend_status is invalid" }, { status: 400 })
    }

    const item = await createInventoryItem({
      itemName,
      category,
      unitCost,
      vendorName: vendorName || undefined,
      quantityOnHand,
      reorderLevel,
      previousUnitCost,
      expiresAt,
      issueStatus: issueStatus as InventoryItem["issueStatus"],
      priceTrendStatus: priceTrendStatus as InventoryItem["priceTrendStatus"],
    })

    return Response.json({ data: item }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
