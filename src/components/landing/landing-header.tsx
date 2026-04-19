"use client"

import Link from "next/link"
import { Flame } from "lucide-react"
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme/theme-toggle"

export function LandingHeader() {
  const [isOverHero, setIsOverHero] = useState(true)

  useEffect(() => {
    const sentinel = document.getElementById("landing-hero-sentinel")

    if (!sentinel) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsOverHero(entry.isIntersecting || entry.boundingClientRect.top > 0)
      },
      {
        threshold: 0,
        rootMargin: "-72px 0px 0px 0px",
      }
    )

    observer.observe(sentinel)

    return () => observer.disconnect()
  }, [])

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow,color] duration-500 ease-out",
        isOverHero
          ? "border-b border-white/10 bg-black/12 text-white shadow-none backdrop-blur-xl"
          : "border-b border-border/80 bg-background/76 text-foreground shadow-[0_18px_40px_-30px_rgba(15,23,42,0.5)] backdrop-blur-2xl"
      )}
    >
      <div className="mx-auto flex h-18 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-2xl border shadow-[0_16px_32px_-20px_rgba(0,0,0,0.55)] transition-colors duration-500",
              isOverHero
                ? "border-white/15 bg-white/10 text-white"
                : "border-border/70 bg-card/85 text-primary"
            )}
          >
            <Flame className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Resq</p>
            <p className={cn("text-[11px]", isOverHero ? "text-white/65" : "text-muted-foreground")}>
              Ember Table
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/dashboard"
            className={cn(
              "inline-flex h-10 items-center rounded-full border px-4 text-sm font-medium transition-all duration-300",
              isOverHero
                ? "border-white/15 bg-white/10 text-white hover:bg-white/16"
                : "border-border/70 bg-card/80 text-foreground hover:bg-muted"
            )}
          >
            Open Dashboard
          </Link>
        </div>
      </div>
    </header>
  )
}
