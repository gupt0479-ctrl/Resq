import { redirect } from "next/navigation"

export default function CustomersRedirectPage() {
  redirect("/invoices")
}
