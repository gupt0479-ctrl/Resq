"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Flame,
  LayoutDashboard,
  GitBranch,
  FileText,
  DollarSign,
  Plug,
  Zap,
} from "lucide-react"

const navItems = [
  { href: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { href: "/rescue",       label: "Rescue Queue", icon: Zap },
  { href: "/finance",      label: "Cashflow",     icon: DollarSign },
  { href: "/invoices",     label: "Invoices",     icon: FileText },
  { href: "/workflow",     label: "Agent Runs",   icon: GitBranch },
  { href: "/integrations", label: "Integrations", icon: Plug },
]

export function Sidebar() {
  const pathname = usePathname()

  function navClass(href: string) {
    const active = pathname === href || pathname.startsWith(`${href}/`)
    return `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-accent text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`
  }

  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Flame className="h-4 w-4 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-foreground">OpsPilot Rescue</p>
          <p className="text-[10px] text-muted-foreground">SMB Survival</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 pt-4">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={navClass(href)}>
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-5 py-3">
        <p className="text-[10px] text-muted-foreground">Powered by Claude AI</p>
      </div>
    </aside>
  )
}
