export const dynamic   = "force-dynamic"
export const revalidate = 0

import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { InvoicesClient } from "./InvoicesClient"

export type InvoiceRow = {
  id:            string
  number:        string
  customerName:  string
  customerId:    string
  customerEmail: string | null
  amount:        number
  amountPaid:    number
  balance:       number
  status:        "paid" | "overdue" | "pending" | "sent" | "draft"
  dueAt:         string | null
  daysOverdue:   number
  lineItems:     { description: string; quantity: number; amount: number }[]
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

async function fetchInvoices(): Promise<InvoiceRow[]> {
  try {
    const client = createServerSupabaseClient()
    const { data, error } = await client
      .from("invoices")
      .select(`id, invoice_number, total_amount, amount_paid, status, due_at,
               customers ( id, full_name, email ),
               invoice_items ( description, quantity, amount )`)
      .eq("organization_id", DEMO_ORG_ID)
      .order("due_at", { ascending: true })

    if (error || !data) return []

    return data.map((row) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cust  = Array.isArray(row.customers) ? row.customers[0] : (row.customers as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = Array.isArray(row.invoice_items) ? row.invoice_items : [] as any[]
      const total  = Number(row.total_amount ?? 0)
      const paid   = Number(row.amount_paid ?? 0)
      const daysO  = row.due_at
        ? Math.max(0, Math.floor((Date.now() - new Date(row.due_at).getTime()) / 86400000))
        : 0
      const validStatuses = ["paid", "overdue", "pending", "sent", "draft"] as const
      const rawStatus = (row.status as string) ?? "draft"
      const status = validStatuses.includes(rawStatus as typeof validStatuses[number])
        ? (rawStatus as InvoiceRow["status"])
        : "draft"
      return {
        id:            row.id as string,
        number:        (row.invoice_number as string) ?? "—",
        customerName:  (cust?.full_name as string) ?? "Unknown",
        customerId:    (cust?.id as string) ?? "",
        customerEmail: (cust?.email as string | null) ?? null,
        amount:        total,
        amountPaid:    paid,
        balance:       total - paid,
        status,
        dueAt:         row.due_at ? fmtDate(row.due_at as string) : null,
        daysOverdue:   status === "overdue" ? daysO : 0,
        lineItems:     items.map((li: { description: string; quantity: number; amount: number }) => ({
          description: (li.description as string) ?? "Service",
          quantity:    Number(li.quantity ?? 1),
          amount:      Number(li.amount ?? 0),
        })),
      }
    })
  } catch {
    return []
  }
}

export default async function InvoicesPage() {
  const invoices = await fetchInvoices()
  return <InvoicesClient invoices={invoices} />
}
