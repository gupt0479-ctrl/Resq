export const dynamic = "force-dynamic"

import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { CustomersClient } from "./CustomersClient"

export type CustomerRow = {
  id:           string
  name:         string
  email:        string | null
  riskStatus:   string | null
  outstanding:  number
  overdue:      number
  invoiceCount: number
  invoices:     {
    id:     string
    number: string
    amount: number
    status: string
    dueAt:  string | null
  }[]
}

export default async function CustomersPage() {
  const client = createServerSupabaseClient()

  const { data, error } = await client
    .from("customers")
    .select(`
      id, full_name, email, risk_status,
      invoices ( id, invoice_number, total_amount, amount_paid, status, due_at )
    `)
    .eq("organization_id", DEMO_ORG_ID)
    .order("full_name", { ascending: true })

  if (error || !data) {
    return (
      <div className="p-8 lg:p-10 max-w-[1280px] mx-auto">
        <div className="text-sm text-steel">Failed to load customers.</div>
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customers: CustomerRow[] = (data as any[]).map((c: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoices = (Array.isArray(c.invoices) ? c.invoices : []) as any[]
    const outstanding = invoices
      .filter((i: { status: string }) => i.status !== "paid")
      .reduce((s: number, i: { total_amount: number; amount_paid: number }) => s + Number(i.total_amount) - Number(i.amount_paid), 0)
    const overdue = invoices
      .filter((i: { status: string }) => i.status === "overdue")
      .reduce((s: number, i: { total_amount: number; amount_paid: number }) => s + Number(i.total_amount) - Number(i.amount_paid), 0)

    return {
      id:           c.id as string,
      name:         (c.full_name as string) ?? "Unknown",
      email:        (c.email as string | null) ?? null,
      riskStatus:   (c.risk_status as string | null) ?? null,
      outstanding,
      overdue,
      invoiceCount: invoices.length,
      invoices:     invoices.map((i: { id: string; invoice_number: string; total_amount: number; amount_paid: number; status: string; due_at: string | null }) => ({
        id:     i.id as string,
        number: (i.invoice_number as string) ?? "—",
        amount: Number(i.total_amount) - Number(i.amount_paid),
        status: (i.status as string) ?? "draft",
        dueAt:  i.due_at ? new Date(i.due_at as string).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null,
      })),
    }
  }).sort((a: CustomerRow, b: CustomerRow) => b.outstanding - a.outstanding)

  return <CustomersClient customers={customers} />
}
