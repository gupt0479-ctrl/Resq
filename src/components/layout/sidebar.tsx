"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Flame,
  LayoutDashboard,
  GitBranch,
  MessageSquare,
  FileText,
  Package,
  CalendarDays,
  DollarSign,
  Truck,
  Plug,
} from "lucide-react"

const coreItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/appointments", label: "Reservations", icon: CalendarDays },
  { href: "/workflow", label: "Workflow", icon: GitBranch },
]

const opsItems = [
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/finance", label: "Finance", icon: DollarSign },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/shipments", label: "Shipments", icon: Truck },
]

/** Phase 3: MCP bridge + feedback must stay visible in IA (PRD §4.3, §12.1). */
const supportItems = [
  { href: "/feedback", label: "Feedback", icon: MessageSquare },
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
          <p className="text-sm font-semibold text-foreground">OpsPilot</p>
          <p className="text-[10px] text-muted-foreground">Ember Table</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 pt-4">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Core
        </p>
        {coreItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={navClass(href)}>
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}

        <p className="mb-2 mt-5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Operations
        </p>
        {opsItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={navClass(href)}>
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}

        <p className="mb-2 mt-5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Support
        </p>
        {supportItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={navClass(href)}>
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

    </aside>
  )
}
