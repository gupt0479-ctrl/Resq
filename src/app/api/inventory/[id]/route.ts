import { NextRequest } from "next/server"
import { z } from "zod"
import { getInventoryItemById } from "@/lib/supabase/queries"
import { supabase } from "@/lib/supabase/client"

const PatchItemSchema = z.object({
  itemName: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  quantityOnHand: z.number().int().min(0).optional(),
  reorderLevel: z.number().int().min(0).optional(),
  unitCost: z.number().min(0).optional(),
  previousUnitCost: z.number().min(0).nullable().optional(),
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

  const existing = await getInventoryItemById(id)
  if (!existing) {
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

  const updates: Record<string, unknown> = {}
  if (parsed.data.itemName) updates.item_name = parsed.data.itemName
  if (parsed.data.category) updates.category = parsed.data.category
  if (parsed.data.quantityOnHand !== undefined) updates.quantity_on_hand = parsed.data.quantityOnHand
  if (parsed.data.reorderLevel !== undefined) updates.reorder_level = parsed.data.reorderLevel
  if (parsed.data.unitCost !== undefined) updates.unit_cost = parsed.data.unitCost
  if (parsed.data.previousUnitCost !== undefined) updates.previous_unit_cost = parsed.data.previousUnitCost
  if (parsed.data.expiresAt !== undefined) updates.expires_at = parsed.data.expiresAt
  if (parsed.data.vendorName) updates.vendor_name = parsed.data.vendorName
  if (parsed.data.issueStatus) updates.issue_status = parsed.data.issueStatus
  if (parsed.data.priceTrendStatus) updates.price_trend_status = parsed.data.priceTrendStatus

  const { error } = await supabase
    .from("inventory_items")
    .update(updates)
    .eq("id", id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const updated = await getInventoryItemById(id)
  return Response.json({ data: updated })
}

