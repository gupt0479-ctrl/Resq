import { type NextRequest } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { createTransaction } from "@/lib/services/finance"
import { listTransactionsQuery } from "@/lib/queries/finance"
import { CreateTransactionBodySchema } from "@/lib/schemas/finance"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const type        = searchParams.get("type") ?? undefined
    const taxRelevant = searchParams.has("taxRelevant")
      ? searchParams.get("taxRelevant") === "true"
      : undefined
    const limit  = Number(searchParams.get("limit") ?? "50")
    const offset = Number(searchParams.get("offset") ?? "0")
    const since  = searchParams.get("since") ?? undefined

    const client = createServerSupabaseClient()
    const transactions = await listTransactionsQuery(client, DEMO_ORG_ID, {
      type,
      taxRelevant,
      limit,
      offset,
      since,
    })

    return Response.json({ data: transactions, count: transactions.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = CreateTransactionBodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 422 }
    )
  }

  try {
    const client = createServerSupabaseClient()
    const id = await createTransaction(client, {
      organizationId:  DEMO_ORG_ID,
      type:            parsed.data.type,
      category:        parsed.data.category,
      amount:          parsed.data.amount,
      direction:       parsed.data.direction,
      occurredAt:      parsed.data.occurredAt,
      paymentMethod:   parsed.data.paymentMethod,
      taxRelevant:     parsed.data.taxRelevant,
      writeoffEligible: parsed.data.writeoffEligible,
      notes:           parsed.data.notes,
      invoiceId:       parsed.data.invoiceId,
    })

    return Response.json({ data: { id } }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return Response.json({ error: message }, { status: 500 })
  }
}
