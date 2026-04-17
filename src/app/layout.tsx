import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ConditionalShell } from "@/components/layout/conditional-shell"
import { ThemeProvider } from "@/components/theme/theme-provider"
import { getThemeInitScript } from "@/components/theme/theme-shared"

export const metadata: Metadata = {
  title: "OpsPilot Rescue",
  description: "Autonomous cashflow recovery for small businesses",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full scroll-smooth antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
      </head>
      <body className="h-full" suppressHydrationWarning>
        <ThemeProvider>
          <ConditionalShell>{children}</ConditionalShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
