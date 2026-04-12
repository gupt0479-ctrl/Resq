import { NextRequest, NextResponse } from "next/server"
import { getInvoice, markInvoicePaid } from "@/lib/services/invoice.service"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await getInvoice(id)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 404 })
  return NextResponse.json({ invoice: result.data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  if (body.status === "paid") {
    const result = await markInvoicePaid(id)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
    return NextResponse.json({ invoice: result.data })
  }
  return NextResponse.json({ error: "Only status: paid supported." }, { status: 400 })
}