import type { Metadata } from "next"
import Script from "next/script"
import "./globals.css"
import { ConditionalShell } from "@/components/layout/conditional-shell"
import { ThemeProvider } from "@/components/theme/theme-provider"
import { getThemeInitScript } from "@/components/theme/theme-shared"

export const metadata: Metadata = {
  title: "OpsPilot · Ember Table",
  description: "AI-powered restaurant operations for Ember Table, Minneapolis",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full scroll-smooth antialiased" suppressHydrationWarning>
      <body className="h-full">
        <Script id="theme-init" strategy="beforeInteractive">
          {getThemeInitScript()}
        </Script>
        <ThemeProvider>
          <ConditionalShell>{children}</ConditionalShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
