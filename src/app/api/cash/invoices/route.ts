import { NextResponse } from "next/server"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const sb = createServerSupabaseClient()
    const { data, error } = await sb
      .from("invoices")
      .select("id, invoice_number, total_amount, tax_amount, amount_paid, status, due_at, paid_at, created_at, reminder_count, customer_id, customers ( full_name, email, phone )")
      .eq("organization_id", DEMO_ORG_ID)
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) throw new Error(error.message)

    function fmtDate(iso: string | null | undefined): string {
      if (!iso) return "—"
      return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }

    const invoices = (data ?? []).map((inv: Record<string, unknown>) => {
      const cust = (Array.isArray(inv.customers) ? inv.customers[0] : inv.customers) as { full_name: string; email?: string; phone?: string } | null
      const status = inv.status as string
      const validStatuses = ["paid", "overdue", "pending", "draft", "sent"]
      return {
        id: inv.id as string,
        number: (inv.invoice_number as string) ?? "—",
        guest: cust?.full_name ?? "Guest",
        amount: Number(inv.total_amount ?? 0),
        status: validStatuses.includes(status) ? status : "draft",
        date: fmtDate((inv.paid_at as string) ?? (inv.created_at as string)),
        dueDate: fmtDate(inv.due_at as string),
        reminderCount: Number(inv.reminder_count ?? 0),
        tax: Number(inv.tax_amount ?? 0),
        tip: 0,
        customer: cust ? { name: cust.full_name, email: cust.email, phone: cust.phone } : undefined,
        lineItems: [],
      }
    })

    return NextResponse.json({ ok: true, invoices })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Failed" }, { status: 500 })
  }
}
