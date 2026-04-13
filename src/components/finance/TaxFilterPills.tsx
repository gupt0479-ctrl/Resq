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
    case "expense":            return "bg-blue-100 text-blue-700"
    case "fee":                return "bg-purple-100 text-purple-700"
    case "writeoff":           return "bg-orange-100 text-orange-700"
    case "inventory_purchase": return "bg-teal-100 text-teal-700"
    default:                   return "bg-muted text-muted-foreground"
  }
}

function eligibleStyle(v: "yes" | "no" | "review"): string {
  if (v === "yes")    return "bg-emerald-100 text-emerald-700"
  if (v === "review") return "bg-amber-100 text-amber-700"
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
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Write-off eligible</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((t, i) => (
            <TableRow key={i}>
              <TableCell className="whitespace-nowrap text-muted-foreground">{t.date}</TableCell>
              <TableCell className="font-medium">{t.description}</TableCell>
              <TableCell className="capitalize text-muted-foreground">{t.category}</TableCell>
              <TableCell className="text-right font-medium text-red-600">
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
          <TableRow>
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
