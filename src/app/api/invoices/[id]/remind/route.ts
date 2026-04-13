import { NextRequest, NextResponse } from "next/server"
import { getInvoice, recordReminderSent } from "@/lib/services/invoice.service"
import { generateReminder } from "@/lib/ai/generate-reminder"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let followUpType: "overdue" | "paid" = "overdue"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let invoiceFallback: any = null
  try {
    const body = await req.json()
    if (body?.followUpType === "paid") followUpType = "paid"
    if (body?.invoiceFallback) invoiceFallback = body.invoiceFallback
  } catch { /* no body is fine */ }

  let invoice: import("@/lib/types").Invoice | null = null
  const result = await getInvoice(id)
  if (!result.error && result.data) {
    invoice = result.data
  } else if (invoiceFallback) {
    // Mock / fallback data passed from client
    invoice = invoiceFallback as import("@/lib/types").Invoice
  } else {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 })
  }

  const reminder = await generateReminder(invoice, followUpType)
  if (followUpType === "overdue") await recordReminderSent(id)

  return NextResponse.json({
    subject: reminder.subject,
    message: reminder.message,
    reminder_number: reminder.reminder_number,
    customer_name: invoice.customer?.name ?? "Guest",
    invoice_total: invoice.total,
    follow_up_type: followUpType,
  })
}
