import { Bell, Search } from "lucide-react"
import { ThemeToggle } from "@/components/theme/theme-toggle"

export function Header() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-card/88 px-6 backdrop-blur-xl">
      {/* Search */}
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search customers, invoices, agents…"
          className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted transition-colors">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
            5
          </span>
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
            SC
          </div>
          <div className="hidden sm:block leading-tight">
            <p className="text-xs font-medium text-foreground">Sarah Chen</p>
            <p className="text-[10px] text-muted-foreground">Operator</p>
          </div>
        </div>
      </div>
    </header>
  )
}
