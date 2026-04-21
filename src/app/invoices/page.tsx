export const dynamic   = "force-dynamic"
export const revalidate = 0

import { InvoiceTable } from "@/components/invoices/invoice-table"
import type { Invoice } from "@/components/invoices/invoice-table"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

async function fetchInvoices(organizationId: string): Promise<Invoice[]> {
  try {
    const rows = await db
      .select()
      .from(schema.invoices)
      .leftJoin(schema.customers, eq(schema.invoices.customerId, schema.customers.id))
      .where(eq(schema.invoices.organizationId, organizationId))
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
        customerName:  customer?.fullName ?? "Customer",
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
      }
    })
  } catch {
    return []
  }
}

export default async function InvoicesPage() {
  const ctx = await getUserOrg()
  const invoices = ctx ? await fetchInvoices(ctx.organizationId) : []
  return <InvoiceTable invoices={invoices} />
}
