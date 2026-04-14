"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type TaxTransaction = {
  date: string
  description: string
  category: string
  amount: number
  type: string
  writeoffEligible: "yes" | "no" | "review"
}

type Filter = "all" | "expense" | "fee" | "writeoff" | "inventory"

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all",       label: "All" },
  { key: "expense",   label: "Expenses" },
  { key: "fee",       label: "Fees" },
  { key: "writeoff",  label: "Write-offs" },
  { key: "inventory", label: "Inventory" },
]

function typeStyle(type: string): string {
  switch (type) {
    case "expense":            return "bg-blue-500/20 text-blue-400"
    case "fee":                return "bg-purple-500/20 text-purple-400"
    case "writeoff":           return "bg-orange-500/20 text-orange-400"
    case "inventory_purchase": return "bg-teal-500/20 text-teal-400"
    default:                   return "bg-muted text-muted-foreground"
  }
}

function eligibleStyle(v: "yes" | "no" | "review"): string {
  if (v === "yes")    return "bg-emerald-500/20 text-emerald-400"
  if (v === "review") return "bg-amber-500/20 text-amber-400"
  return "bg-muted text-muted-foreground"
}

export function TaxFilterPills({
  transactions,
}: {
  transactions: TaxTransaction[]
}) {
  const [active, setActive] = useState<Filter>("all")

  const filtered = active === "all"
    ? transactions
    : transactions.filter((t) => {
        if (active === "expense")   return t.type === "expense"
        if (active === "fee")       return t.type === "fee"
        if (active === "writeoff")  return t.type === "writeoff"
        if (active === "inventory") return t.type === "inventory_purchase"
        return true
      })

  const filteredTotal = filtered.reduce((s, t) => s + t.amount, 0)

  return (
    <>
      <div className="flex flex-wrap gap-2 pb-4">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              active === key
                ? "bg-blue-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/50 hover:bg-transparent">
            <TableHead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">Date</TableHead>
            <TableHead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">Description</TableHead>
            <TableHead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">Category</TableHead>
            <TableHead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider text-right">Amount</TableHead>
            <TableHead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">Type</TableHead>
            <TableHead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">Write-off eligible</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((t, i) => (
            <TableRow
              key={i}
              className="text-foreground border-b border-border/30 transition-all duration-150 hover:bg-muted/50 hover:border-l-2 hover:border-l-blue-500"
            >
              <TableCell className="whitespace-nowrap text-muted-foreground">{t.date}</TableCell>
              <TableCell className="font-medium text-foreground">{t.description}</TableCell>
              <TableCell className="capitalize text-muted-foreground">{t.category}</TableCell>
              <TableCell className="text-right font-medium text-red-400">
                {t.amount.toLocaleString("en-US", { style: "currency", currency: "USD" })}
              </TableCell>
              <TableCell>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${typeStyle(t.type)}`}>
                  {t.type.replace(/_/g, " ")}
                </span>
              </TableCell>
              <TableCell>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${eligibleStyle(t.writeoffEligible)}`}>
                  {t.writeoffEligible}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="border-t border-border/50 bg-muted/50 hover:bg-muted/50">
            <TableCell colSpan={3} className="font-semibold text-foreground">
              Total
            </TableCell>
            <TableCell className="text-right font-bold text-foreground">
              {filteredTotal.toLocaleString("en-US", { style: "currency", currency: "USD" })}
            </TableCell>
            <TableCell colSpan={2} />
          </TableRow>
        </TableFooter>
      </Table>
    </>
  )
}
