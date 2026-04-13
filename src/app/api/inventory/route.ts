import { NextRequest } from "next/server"
import { getInventoryItems } from "@/lib/supabase/queries"

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
  void request
  return Response.json(
    {
      error:
        "Creating inventory_items is disabled. The core ledger schema has no stock table; use finance_transactions or a future inventory module.",
    },
    { status: 501 }
  )
}
