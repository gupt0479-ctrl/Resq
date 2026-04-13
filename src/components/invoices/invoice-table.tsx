"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"

export interface LineItem {
  description: string
  qty: number
  amount: number
}

export interface Invoice {
  id: string
  number: string
  guest: string
  amount: number
  status: "paid" | "overdue" | "pending" | "draft"
  date: string
  lineItems: LineItem[]
  tax: number
  tip: number
}

interface InvoiceTableProps {
  invoices: Invoice[]
}

function statusStyle(status: string) {
  switch (status) {
    case "paid":    return "bg-emerald-100 text-emerald-700"
    case "overdue": return "bg-red-100 text-red-600"
    case "pending": return "bg-amber-100 text-amber-700"
    default:        return "bg-muted text-muted-foreground"
  }
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  const [selected, setSelected] = useState<Invoice | null>(null)

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Guest</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow
              key={inv.id}
              className="cursor-pointer"
              onClick={() => setSelected(inv)}
            >
              <TableCell className="font-mono text-xs">{inv.number}</TableCell>
              <TableCell className="font-medium">{inv.guest}</TableCell>
              <TableCell>${inv.amount.toFixed(2)}</TableCell>
              <TableCell>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusStyle(inv.status)}`}>
                  {inv.status}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">{inv.date}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          {selected && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle>{selected.number}</SheetTitle>
                <SheetDescription>{selected.guest} · {selected.date}</SheetDescription>
              </SheetHeader>

              <div className="px-4">
                <ul className="space-y-2">
                  {selected.lineItems.map((li, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">
                        {li.description}
                        {li.qty > 1 && (
                          <span className="ml-1 text-xs text-muted-foreground">×{li.qty}</span>
                        )}
                      </span>
                      <span className="font-medium">${li.amount.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>

                <Separator className="my-4" />

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax</span>
                    <span>${selected.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tip</span>
                    <span>${selected.tip.toFixed(2)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold text-foreground">
                    <span>Total</span>
                    <span>${selected.amount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle(selected.status)}`}>
                    {selected.status}
                  </span>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
