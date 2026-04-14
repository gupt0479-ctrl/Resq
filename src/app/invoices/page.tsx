import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InvoiceTable } from "@/components/invoices/invoice-table"
import type { Invoice } from "@/components/invoices/invoice-table"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { listInvoicesQuery } from "@/lib/queries/invoices"

export const dynamic = "force-dynamic"

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default async function InvoicesPage() {
  let invoices: Invoice[] = []

  try {
    const client = createServerSupabaseClient()
    const rows = await listInvoicesQuery(client, DEMO_ORG_ID)
    invoices = rows.map((r) => ({
      id: r.id,
      number: r.invoiceNumber,
      guest: r.customerName,
      amount: r.totalAmount,
      status: r.status as Invoice["status"],
      date: fmtDate(r.createdAt),
      dueDate: fmtDate(r.dueAt),
      reminderCount: 0,
      lineItems: r.items.map((item) => ({
        description: item.description,
        qty: item.quantity,
        amount: item.amount,
      })),
      tax: r.taxAmount,
      tip: 0,
      customer: { name: r.customerName },
    }))
  } catch {
    // DB unavailable — render empty state
  }

  const paid    = invoices.filter((i) => i.status === "paid")
  const overdue = invoices.filter((i) => i.status === "overdue")
  const pending = invoices.filter((i) => i.status === "pending")

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

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total invoices",    value: invoices.length,                                        color: "text-foreground",  bg: "bg-muted/50 border-border" },
          { label: "Collected",         value: `$${paidTotal.toFixed(0)} · ${paid.length} paid`,        color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
          { label: "Outstanding",       value: pending.length > 0 ? `${pending.length} pending` : "0", color: "text-amber-700",   bg: "bg-amber-50 border-amber-100" },
          { label: "Overdue",           value: `$${overdueTotal.toFixed(0)} · ${overdue.length} invoices`, color: "text-red-600", bg: "bg-red-50 border-red-100" },
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
