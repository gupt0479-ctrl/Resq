import { NextRequest } from "next/server"
import { deleteInventoryItem, updateInventoryItem } from "@/lib/supabase/queries"
import type { InventoryItem } from "@/lib/types"

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    if (!id || typeof id !== "string") {
      return Response.json({ error: "id is required" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
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

    const updated = await updateInventoryItem(id, {
      itemName,
      category,
      unitCost,
      vendorName: vendorName || undefined,
      quantityOnHand,
      reorderLevel,
      previousUnitCost: previousUnitCost ?? null,
      expiresAt,
      issueStatus: issueStatus as InventoryItem["issueStatus"],
      priceTrendStatus: priceTrendStatus as InventoryItem["priceTrendStatus"],
    })

    if (!updated) {
      return Response.json({ error: "Inventory item not found" }, { status: 404 })
    }

    return Response.json({ data: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    if (!id || typeof id !== "string") {
      return Response.json({ error: "id is required" }, { status: 400 })
    }

    const deleted = await deleteInventoryItem(id)
    if (!deleted) {
      return Response.json({ error: "Inventory item not found" }, { status: 404 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
