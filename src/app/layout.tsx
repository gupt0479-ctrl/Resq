import type { Metadata } from "next"
import { Suspense } from "react"
import "./globals.css"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

export const metadata: Metadata = {
  title: "OpsPilot · Ember Table",
  description: "AI operations companion for Ember Table restaurant",
}

function MainLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-muted-foreground">
      Loading…
    </div>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex h-full overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <Suspense fallback={<MainLoading />}>{children}</Suspense>
          </main>
        </div>
      </body>
    </html>
  )
}
