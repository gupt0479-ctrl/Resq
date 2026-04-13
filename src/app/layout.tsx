import type { Metadata } from "next"
import "./globals.css"
import { ConditionalShell } from "@/components/layout/conditional-shell"

export const metadata: Metadata = {
  title: "OpsPilot · Ember Table",
  description: "AI-powered restaurant operations for Ember Table, Minneapolis",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full scroll-smooth antialiased">
      <body className="h-full" suppressHydrationWarning>
        <ConditionalShell>{children}</ConditionalShell>
      </body>
    </html>
  )
}
