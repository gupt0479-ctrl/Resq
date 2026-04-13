import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InvoiceTable } from "@/components/invoices/invoice-table"
import type { Invoice } from "@/components/invoices/invoice-table"

// TODO: replace with Supabase query
const MOCK_INVOICES: Invoice[] = [
  {
    id: "inv-1",
    number: "INV-2025-001",
    guest: "Marcus Webb",
    amount: 181.22,
    status: "paid",
    date: "Apr 9",
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
    lineItems: [
      { description: "Chef Tasting Menu", qty: 4, amount: 340.00 },
      { description: "Wine Pairing", qty: 4, amount: 88.00 },
      { description: "Champagne Toast", qty: 1, amount: 32.00 },
    ],
    tax: 38.39,
    tip: 24.00,
  },
  {
    id: "inv-4",
    number: "INV-2025-004",
    guest: "Rachel Tran",
    amount: 118.58,
    status: "paid",
    date: "Apr 5",
    lineItems: [
      { description: "Braised Short Rib", qty: 2, amount: 76.00 },
      { description: "House Salad", qty: 1, amount: 14.00 },
      { description: "Sparkling Water", qty: 2, amount: 8.00 },
    ],
    tax: 9.58,
    tip: 11.00,
  },
  {
    id: "inv-5",
    number: "INV-2025-005",
    guest: "Tom Okafor",
    amount: 218.81,
    status: "overdue",
    date: "Apr 12",
    lineItems: [
      { description: "Ember Wagyu Ribeye", qty: 2, amount: 136.00 },
      { description: "Crème Brûlée", qty: 2, amount: 24.00 },
      { description: "Pinot Noir", qty: 2, amount: 44.00 },
    ],
    tax: 14.81,
    tip: 0,
  },
  {
    id: "inv-6",
    number: "INV-2025-006",
    guest: "Unknown",
    amount: 68.26,
    status: "overdue",
    date: "Apr 2",
    lineItems: [
      { description: "Pan-Seared Duck Breast", qty: 1, amount: 42.00 },
      { description: "House Wine", qty: 1, amount: 14.00 },
    ],
    tax: 5.26,
    tip: 7.00,
  },
]

// ── Page ─────────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const paid    = MOCK_INVOICES.filter((i) => i.status === "paid")
  const overdue = MOCK_INVOICES.filter((i) => i.status === "overdue")
  const pending = MOCK_INVOICES.filter((i) => i.status === "pending")

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
          { label: "Total invoices", value: MOCK_INVOICES.length, color: "text-foreground", bg: "bg-muted/50 border-border" },
          { label: "Paid", value: `${paid.length} · $${paidTotal.toFixed(0)}`, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
          { label: "Pending", value: pending.length, color: "text-amber-700", bg: "bg-amber-50 border-amber-100" },
          { label: "Overdue", value: `${overdue.length} · $${overdueTotal.toFixed(0)}`, color: "text-red-600", bg: "bg-red-50 border-red-100" },
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
          <InvoiceTable invoices={MOCK_INVOICES} />
        </CardContent>
      </Card>
    </div>
  )
}
