export const dynamic   = "force-dynamic"
export const revalidate = 0

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InvoiceTable } from "@/components/invoices/invoice-table"
import type { Invoice } from "@/components/invoices/invoice-table"
import { db, DEMO_ORG_ID } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

async function fetchInvoices(): Promise<Invoice[]> {
  try {
    const rows = await db
      .select()
      .from(schema.invoices)
      .leftJoin(schema.customers, eq(schema.invoices.customerId, schema.customers.id))
      .where(eq(schema.invoices.organizationId, DEMO_ORG_ID))
      .orderBy(desc(schema.invoices.createdAt))

    // Fetch invoice items for all invoices
    const invoiceIds = rows.map((r) => r.invoices.id)
    const itemsByInvoice = new Map<string, typeof schema.invoiceItems.$inferSelect[]>()
    if (invoiceIds.length > 0) {
      const { inArray } = await import("drizzle-orm")
      const allItems = await db
        .select()
        .from(schema.invoiceItems)
        .where(inArray(schema.invoiceItems.invoiceId, invoiceIds))
      for (const item of allItems) {
        const existing = itemsByInvoice.get(item.invoiceId) ?? []
        existing.push(item)
        itemsByInvoice.set(item.invoiceId, existing)
      }
    }

    return rows.map((row: typeof rows[number]) => {
      const inv = row.invoices
      const customer = row.customers
      const items = itemsByInvoice.get(inv.id) ?? []

      const validStatuses = ["paid", "overdue", "pending", "draft", "sent"] as const
      const rawStatus = inv.status ?? "draft"
      const status = (validStatuses.includes(rawStatus as typeof validStatuses[number]) ? rawStatus : "draft") as Invoice["status"]

      return {
        id:            inv.id,
        number:        inv.invoiceNumber ?? "—",
        guest:         customer?.fullName ?? "Guest",
        amount:        Number(inv.totalAmount ?? 0),
        status,
        date:          fmtDate(inv.paidAt?.toISOString() ?? inv.createdAt?.toISOString()),
        dueDate:       fmtDate(inv.dueAt?.toISOString()),
        reminderCount: Number(inv.reminderCount ?? 0),
        tax:           Number(inv.taxAmount ?? 0),
        tip:           0,
        customer: customer
          ? {
              name:  customer.fullName,
              email: customer.email ?? undefined,
              phone: customer.phone ?? undefined,
            }
          : undefined,
        lineItems: items.map((li) => ({
          description: li.description ?? "Service",
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
