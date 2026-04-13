import { NextRequest, NextResponse } from "next/server"
import { getInvoice, recordReminderSent } from "@/lib/services/invoice.service"
import { generateReminder } from "@/lib/ai/generate-reminder"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await getInvoice(id)
  if (result.error || !result.data) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 })
  }

  const invoice = result.data
  if (invoice.status === "paid") {
    return NextResponse.json({ error: "Invoice already paid." }, { status: 400 })
  }

  const reminder = await generateReminder(invoice)
  await recordReminderSent(id)

  return NextResponse.json({
    subject: reminder.subject,
    message: reminder.message,
    reminder_number: reminder.reminder_number,
    customer_name: invoice.customer?.name ?? "Guest",
    invoice_total: invoice.total,
  })
}