"use client"

import dynamic from "next/dynamic"

const CashflowClient = dynamic(
  () => import("./CashflowClient").then((mod) => mod.CashflowClient),
  { ssr: false }
)

export default function CashflowPage() {
  return <CashflowClient />
}
