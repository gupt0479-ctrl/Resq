import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { getInvoiceDetail, recordInvoiceReminderSent } from "@/lib/services/invoices"
import { generateReminder } from "@/lib/ai/generate-reminder"

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  try {
    const client = createServerSupabaseClient()
    const invoice = await getInvoiceDetail(client, id, DEMO_ORG_ID)

    if (invoice.status === "paid" || invoice.status === "void") {
      return NextResponse.json({ error: "Invoice is not eligible for reminders." }, { status: 400 })
    }

    const cust = invoice.customers as { full_name?: string } | null | undefined
    const customerName = cust?.full_name ?? "Guest"

    const totalDue = Math.max(0, (Number(invoice.total_amount) || 0) - (Number(invoice.amount_paid) || 0))

    const reminder = await generateReminder({
      customerName,
      totalDue,
      dueAt:         invoice.due_at,
      reminderCount: Number(invoice.reminder_count) || 0,
      invoiceNumber: invoice.invoice_number,
    })

    const reminderNumber = await recordInvoiceReminderSent(client, id, DEMO_ORG_ID)

    return NextResponse.json({
      subject:         reminder.subject,
      message:         reminder.message,
      reminder_number: reminderNumber,
      customer_name:   customerName,
      invoice_total:   totalDue,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    const status = message.toLowerCase().includes("not found") ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
