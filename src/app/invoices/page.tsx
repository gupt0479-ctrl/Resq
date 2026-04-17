export const dynamic   = "force-dynamic"
export const revalidate = 0

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InvoiceTable } from "@/components/invoices/invoice-table"
import type { Invoice } from "@/components/invoices/invoice-table"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

async function fetchInvoices(): Promise<Invoice[]> {
  try {
    const client = createServerSupabaseClient()
    const { data, error } = await client
      .from("invoices")
      .select(`
        id,
        invoice_number,
        total_amount,
        tax_amount,
        status,
        created_at,
        due_at,
        paid_at,
        reminder_count,
        customers ( id, full_name, email, phone ),
        invoice_items ( description, quantity, amount )
      `)
      .eq("organization_id", DEMO_ORG_ID)
      .order("created_at", { ascending: false })

    if (error || !data || data.length === 0) return []

    return data.map((row) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customer = Array.isArray(row.customers) ? row.customers[0] : (row.customers as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = Array.isArray(row.invoice_items) ? row.invoice_items : []

      const validStatuses = ["paid", "overdue", "pending", "draft", "sent"] as const
      const rawStatus = (row.status as string) ?? "draft"
      const status = (validStatuses.includes(rawStatus as typeof validStatuses[number]) ? rawStatus : "draft") as Invoice["status"]

      return {
        id:            row.id as string,
        number:        (row.invoice_number as string) ?? "—",
        guest:         (customer?.full_name as string) ?? "Guest",
        amount:        Number(row.total_amount ?? 0),
        status,
        date:          fmtDate(row.paid_at as string ?? row.created_at as string),
        dueDate:       fmtDate(row.due_at as string),
        reminderCount: Number(row.reminder_count ?? 0),
        tax:           Number(row.tax_amount ?? 0),
        tip:           0,
        customer: customer
          ? {
              name:  customer.full_name as string,
              email: customer.email as string | undefined,
              phone: customer.phone as string | undefined,
            }
          : undefined,
        lineItems: items.map((li) => ({
          description: (li.description as string) ?? "Service",
          qty:         Number(li.quantity ?? 1),
          amount:      Number(li.amount ?? 0),
        })),
      } satisfies Invoice
    })
  } catch {
    return []
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function InvoicesPage() {
  const invoices = await fetchInvoices()

  const paid     = invoices.filter((i) => i.status === "paid")
  const overdue  = invoices.filter((i) => i.status === "overdue")
  // "outstanding" = sent or pending — money owed but not yet overdue
  const outstanding = invoices.filter((i) => i.status === "sent" || i.status === "pending")

  const paidTotal    = paid.reduce((s, i) => s + i.amount, 0)
  const overdueTotal = overdue.reduce((s, i) => s + i.amount, 0)

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Invoices</h1>
        <p className="text-xs text-muted-foreground">
          Click any row to see line items
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total invoices",  value: invoices.length,                                                  color: "text-foreground",  bg: "bg-muted/50 border-border" },
          { label: "Collected",       value: `$${paidTotal.toFixed(0)} · ${paid.length} paid`,                 color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
          { label: "Outstanding",     value: outstanding.length > 0 ? `${outstanding.length} sent` : "0",      color: "text-amber-700",   bg: "bg-amber-50 border-amber-100" },
          { label: "Overdue",         value: `$${overdueTotal.toFixed(0)} · ${overdue.length} invoices`,       color: "text-red-600",     bg: "bg-red-50 border-red-100" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="border-b border-border pb-3 pt-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            All Invoices
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <InvoiceTable invoices={invoices} />
        </CardContent>
      </Card>
    </div>
  )
}
