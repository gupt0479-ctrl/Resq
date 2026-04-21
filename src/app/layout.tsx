import type { Metadata } from "next"
import "./globals.css"
import { ConditionalShell } from "@/components/layout/conditional-shell"
import { getThemeInitScript } from "@/components/theme/theme-shared"

export const metadata: Metadata = {
  title: "Resq",
  description: "Autonomous SMB survival agent",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full scroll-smooth antialiased" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Inline theme init to prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,300&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full" suppressHydrationWarning>
        <ConditionalShell>{children}</ConditionalShell>
      </body>
    </html>
  )
}
