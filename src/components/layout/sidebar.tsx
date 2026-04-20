"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Zap,
  DollarSign,
  FileText,
} from "lucide-react"

const navItems = [
  { href: "/rescue",       label: "Rescue Queue", icon: Zap          },
  { href: "/cashflow",     label: "Cashflow",     icon: DollarSign   },
  { href: "/invoices",     label: "Receivables",  icon: FileText     },
]

const systemHealth = [
  { label: "TinyFish", status: process.env.NEXT_PUBLIC_TINYFISH_ENABLED !== "false" ? "ready" : "mock" },
  { label: "Stripe",   status: "ready" },
  { label: "Gmail",    status: "mock"  },
] as const

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
          <Zap className="h-4 w-4 text-background" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-foreground">Resq</p>
          <p className="text-[10px] text-steel">SMB Survival</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 pt-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* System health */}
      <div className="border-t border-border px-5 py-4 space-y-2">
        <div className="text-[10px] uppercase tracking-[0.16em] text-steel mb-2">System</div>
        {systemHealth.map(({ label, status }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={cn(
              "h-1.5 w-1.5 rounded-full shrink-0",
              status === "ready" ? "bg-teal" : "bg-steel",
            )} />
            <span className="text-[11px] text-steel">{label}</span>
            <span className={cn(
              "ml-auto text-[10px]",
              status === "ready" ? "text-teal" : "text-steel",
            )}>
              {status === "ready" ? "Live" : "Mock"}
            </span>
          </div>
        ))}
      </div>
    </aside>
  )
}
