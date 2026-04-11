import { NextRequest } from "next/server"
import { z } from "zod"
import { inventoryItems } from "@/lib/data/inventory"
import type { InventoryItem } from "@/lib/types"

// Shared in-memory store — same reference as the list route
// (In production, both routes hit the same DB)
const store: InventoryItem[] = [...inventoryItems]

const PatchItemSchema = z.object({
  itemName: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  quantityOnHand: z.number().int().min(0).optional(),
  reorderLevel: z.number().int().min(0).optional(),
  unitCost: z.number().min(0).optional(),
  expiresAt: z.string().nullable().optional(),
  vendorName: z.string().min(1).optional(),
  issueStatus: z
    .enum(["none", "equipment_issue", "quality_concern", "discontinued"])
    .optional(),
  priceTrendStatus: z.enum(["stable", "rising", "spike"]).optional(),
})

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  const index = store.findIndex((item) => item.id === id)
  if (index === -1) {
    return Response.json({ error: "Item not found" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = PatchItemSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 422 }
    )
  }

  store[index] = { ...store[index], ...parsed.data }
  return Response.json({ data: store[index] })
}
