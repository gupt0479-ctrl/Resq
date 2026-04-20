"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Search, LogOut } from "lucide-react"
import { supabaseBrowser } from "@/lib/db/supabase-browser"

export function Header() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null)
    })
  }, [])

  async function handleLogout() {
    await supabaseBrowser.auth.signOut()
    router.push("/login")
  }

  const initial = email ? email[0].toUpperCase() : "?"

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-sm">
      {/* Search */}
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-steel" />
        <input
          type="text"
          placeholder="Search cases, invoices, agent runs…"
          className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-[12.5px] text-foreground placeholder:text-steel focus:outline-none focus:ring-1 focus:ring-foreground/20"
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-amber/30 bg-amber/10 px-2.5 py-1 text-[10px] font-medium text-amber">
          Demo Mode
        </span>
        <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] text-steel">
          <span className="h-1.5 w-1.5 rounded-full bg-teal" />
          TinyFish · Live
        </span>

        <button className="relative flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background hover:bg-surface-muted transition-colors">
          <Bell className="h-4 w-4 text-steel" />
        </button>

        {/* User */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">
            {initial}
          </div>
          <div className="hidden sm:block leading-tight max-w-[140px]">
            <p className="text-[12.5px] font-medium text-foreground truncate">{email ?? "—"}</p>
            <p className="text-[10px] text-steel">Resq</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background hover:bg-surface-muted transition-colors"
          title="Sign out"
        >
          <LogOut className="h-3.5 w-3.5 text-steel" />
        </button>
      </div>
    </header>
  )
}
