"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { LoadingProvider } from "@/components/loading/loading-provider"
import { ThemeProvider } from "@/components/theme/theme-provider"

export function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === "/" || pathname === "/login") {
    return <ThemeProvider>{children}</ThemeProvider>
  }

  return (
    <ThemeProvider>
      <LoadingProvider>
        <div className="flex h-full overflow-hidden bg-background">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </LoadingProvider>
    </ThemeProvider>
  )
}
