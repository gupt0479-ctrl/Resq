"use client"

import dynamic from "next/dynamic"

import type { ExpenseSlice } from "./ExpenseChart"
import type { WeeklyDataPoint } from "./WeeklyRevenueChart"

const WeeklyRevenueChart = dynamic(
  () => import("./WeeklyRevenueChart").then((mod) => mod.WeeklyRevenueChart),
  { ssr: false }
)

const ExpenseChart = dynamic(
  () => import("./ExpenseChart").then((mod) => mod.ExpenseChart),
  { ssr: false }
)

export function FinanceWeeklyRevenueChart({ data }: { data: WeeklyDataPoint[] }) {
  return <WeeklyRevenueChart data={data} />
}

export function FinanceExpenseChart({ data }: { data: ExpenseSlice[] }) {
  return <ExpenseChart data={data} />
}
