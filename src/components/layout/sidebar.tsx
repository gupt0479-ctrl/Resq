"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package, Truck, ChefHat } from "lucide-react"

const navItems = [
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/shipments", label: "Shipments", icon: Truck },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <ChefHat className="h-4 w-4 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-foreground">OpsPilot</p>
          <p className="text-[10px] text-muted-foreground">Bistro Nova</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-3 pt-4">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Operations
        </p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom info */}
      <div className="border-t border-border p-4">
        <p className="text-[10px] text-muted-foreground">v0.1.0 · Demo</p>
      </div>
    </aside>
  )
}
