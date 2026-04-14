import { NextRequest } from "next/server"
import { getInventoryItems, createInventoryItem } from "@/lib/supabase/queries"

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
    const { itemName, category, unitCost } = body

    if (!itemName || typeof itemName !== "string" || !itemName.trim())
      return Response.json({ error: "itemName is required" }, { status: 400 })
    if (!category || typeof category !== "string")
      return Response.json({ error: "category is required" }, { status: 400 })
    if (unitCost === undefined || isNaN(Number(unitCost)) || Number(unitCost) < 0)
      return Response.json({ error: "unitCost must be a non-negative number" }, { status: 400 })

    const item = await createInventoryItem({
      itemName: itemName.trim(),
      category,
      unitCost: Number(unitCost),
      vendorName: body.vendorName ?? undefined,
      quantityOnHand: body.quantityOnHand !== undefined ? Number(body.quantityOnHand) : undefined,
      reorderLevel: body.reorderLevel !== undefined ? Number(body.reorderLevel) : undefined,
      expiresAt: body.expiresAt ?? null,
    })

    return Response.json({ data: item }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: message }, { status: 500 })
  }
}
