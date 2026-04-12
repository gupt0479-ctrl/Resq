import { NextResponse } from "next/server"
import { getInvoices, syncOverdueInvoices } from "@/lib/services/invoice.service"

export async function GET() {
  await syncOverdueInvoices()
  const result = await getInvoices()
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ invoices: result.data })
}