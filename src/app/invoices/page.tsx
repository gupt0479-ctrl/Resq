export const dynamic   = "force-dynamic"
export const revalidate = 0

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InvoiceTable } from "@/components/invoices/invoice-table"
import type { Invoice } from "@/components/invoices/invoice-table"
import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"

// ── Fallback mock data (shown when DB is empty or unreachable) ────────────────

const MOCK_INVOICES: Invoice[] = [
  {
    id: "inv-1",
    number: "INV-2025-001",
    guest: "Marcus Webb",
    amount: 181.22,
    status: "paid",
    date: "Apr 9",
    dueDate: "Apr 16",
    reminderCount: 0,
    customer: { name: "Marcus Webb", email: "marcus.webb@email.com", phone: "(612) 555-0101", visit_count: 4 },
    lineItems: [
      { description: "Ember Wagyu Ribeye", qty: 1, amount: 68.00 },
      { description: "Roasted Beet Salad", qty: 1, amount: 18.00 },
      { description: "Pinot Noir", qty: 2, amount: 44.00 },
      { description: "Crème Brûlée", qty: 1, amount: 12.00 },
    ],
    tax: 11.22,
    tip: 28.00,
  },
  {
    id: "inv-2",
    number: "INV-2025-002",
    guest: "Priya Nair",
    amount: 94.95,
    status: "overdue",
    date: "Apr 10",
    dueDate: "Apr 10",
    reminderCount: 1,
    customer: { name: "Priya Nair", email: "priya.nair@gmail.com", phone: "(612) 555-0184", visit_count: 2 },
    lineItems: [
      { description: "Pan-Seared Duck Breast", qty: 1, amount: 42.00 },
      { description: "Heirloom Beet Salad", qty: 1, amount: 16.00 },
      { description: "Sparkling Water", qty: 2, amount: 8.00 },
    ],
    tax: 8.45,
    tip: 20.50,
  },
  {
    id: "inv-3",
    number: "INV-2025-003",
    guest: "Daniel Kim",
    amount: 522.39,
    status: "paid",
    date: "Apr 10",
    dueDate: "Apr 17",
    reminderCount: 0,
    customer: { name: "Daniel Kim", email: "d.kim@studio.co", visit_count: 7 },
    lineItems: [
      { description: "Chef Tasting Menu", qty: 4, amount: 340.00 },
      { description: "Wine Pairing", qty: 4, amount: 88.00 },
      { description: "Champagne Toast", qty: 1, amount: 32.00 },
    ],
    tax: 38.39,
    tip: 24.00,
  },
  {
    id: "inv-5",
    number: "INV-2025-005",
    guest: "Tom Okafor",
    amount: 218.81,
    status: "overdue",
    date: "Apr 12",
    dueDate: "Apr 5",
    reminderCount: 2,
    customer: { name: "Tom Okafor", email: "tom.okafor@outlook.com", phone: "(651) 555-0239", visit_count: 1 },
    lineItems: [
      { description: "Ember Wagyu Ribeye", qty: 2, amount: 136.00 },
      { description: "Crème Brûlée", qty: 2, amount: 24.00 },
      { description: "Pinot Noir", qty: 2, amount: 44.00 },
    ],
    tax: 14.81,
    tip: 0,
  },
]

// ── DB fetch ──────────────────────────────────────────────────────────────────

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
      const rawStatus = row.status as string ?? "draft"
      const status = (validStatuses.includes(rawStatus as typeof validStatuses[number]) ? rawStatus : "draft") as Invoice["status"]

      return {
        id:            row.id as string,
        number:        (row.invoice_number as string) ?? "—",
        guest:         (customer?.full_name as string) ?? "Guest",
        amount:        Number(row.total_amount ?? 0),
        status,
        date:          fmtDate(row.created_at as string),
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
  const dbInvoices = await fetchInvoices()
  const invoices = dbInvoices.length > 0 ? dbInvoices : MOCK_INVOICES

  const paid    = invoices.filter((i) => i.status === "paid")
  const overdue = invoices.filter((i) => i.status === "overdue")
  const pending = invoices.filter((i) => i.status === "pending" || i.status === "draft" || i.status === "sent")

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
          { label: "Total invoices",  value: invoices.length,                                         color: "text-foreground",  bg: "bg-muted/50 border-border" },
          { label: "Collected",       value: `$${paidTotal.toFixed(0)} · ${paid.length} paid`,         color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
          { label: "Outstanding",     value: pending.length > 0 ? `${pending.length} pending` : "0",   color: "text-amber-700",   bg: "bg-amber-50 border-amber-100" },
          { label: "Overdue",         value: `$${overdueTotal.toFixed(0)} · ${overdue.length} invoices`, color: "text-red-600",   bg: "bg-red-50 border-red-100" },
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
