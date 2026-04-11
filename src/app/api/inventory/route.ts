import { NextRequest } from "next/server"
import { z } from "zod"
import { inventoryItems } from "@/lib/data/inventory"
import type { InventoryItem } from "@/lib/types"

// In-memory store (replace with Supabase queries when DB is wired up)
const store: InventoryItem[] = [...inventoryItems]

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const category = searchParams.get("category")
  const alert = searchParams.get("alert")

  let results = store

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

const CreateItemSchema = z.object({
  itemName: z.string().min(1),
  category: z.string().min(1),
  quantityOnHand: z.number().int().min(0),
  reorderLevel: z.number().int().min(0),
  unitCost: z.number().min(0),
  expiresAt: z.string().nullable().optional(),
  vendorName: z.string().min(1),
  issueStatus: z
    .enum(["none", "equipment_issue", "quality_concern", "discontinued"])
    .optional()
    .default("none"),
  priceTrendStatus: z
    .enum(["stable", "rising", "spike"])
    .optional()
    .default("stable"),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = CreateItemSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 422 }
    )
  }

  const newItem: InventoryItem = {
    id: `inv-${Date.now()}`,
    expiresAt: parsed.data.expiresAt ?? null,
    ...parsed.data,
  }

  store.push(newItem)
  return Response.json({ data: newItem }, { status: 201 })
}
