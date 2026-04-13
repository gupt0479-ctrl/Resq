import { NextRequest } from "next/server"

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  void id
  await request.json().catch(() => ({}))

  return Response.json(
    {
      error:
        "Updating inventory_items is disabled. The core ledger schema has no stock table; use finance_transactions or a future inventory module.",
    },
    { status: 501 }
  )
}

