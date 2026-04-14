"use client"

import type { PointerEvent as ReactPointerEvent } from "react"
import { MoonStar, SunMedium } from "lucide-react"
import { flushSync } from "react-dom"
import { useCallback, useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"

import { useTheme } from "./theme-provider"
import type { Theme } from "./theme-shared"

type ThemeToggleProps = {
  className?: string
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => {
    finished: Promise<void>
  }
}

function getNextTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark"
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { mounted, resolvedTheme, setTheme } = useTheme()
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const nextTheme = useMemo(() => getNextTheme(resolvedTheme), [resolvedTheme])
  const label = nextTheme === "dark" ? "Switch to dark mode" : "Switch to light mode"

  const setTransitionOrigin = useCallback((event?: ReactPointerEvent<HTMLButtonElement>) => {
    const root = document.documentElement
    const button = buttonRef.current

    if (event) {
      root.style.setProperty("--theme-origin-x", `${(event.clientX / window.innerWidth) * 100}%`)
      root.style.setProperty("--theme-origin-y", `${(event.clientY / window.innerHeight) * 100}%`)
      return
    }

    if (!button) {
      root.style.setProperty("--theme-origin-x", "50%")
      root.style.setProperty("--theme-origin-y", "50%")
      return
    }

    const rect = button.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    root.style.setProperty("--theme-origin-x", `${(centerX / window.innerWidth) * 100}%`)
    root.style.setProperty("--theme-origin-y", `${(centerY / window.innerHeight) * 100}%`)
  }, [])

  const updateTheme = useCallback(
    (theme: Theme) => {
      flushSync(() => {
        setTheme(theme)
      })
    },
    [setTheme]
  )

  const triggerThemeChange = useCallback(
    async (theme: Theme, event?: ReactPointerEvent<HTMLButtonElement>) => {
      if (isTransitioning) {
        return
      }

      setTransitionOrigin(event)

      const doc = document as ViewTransitionDocument
      const supportsTransition =
        typeof window !== "undefined" &&
        typeof doc.startViewTransition === "function" &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches

      if (!supportsTransition) {
        updateTheme(theme)
        return
      }

      setIsTransitioning(true)

      try {
        const transition = doc.startViewTransition(() => {
          updateTheme(theme)
        })

        await transition.finished
      } finally {
        setIsTransitioning(false)
      }
    },
    [isTransitioning, setTransitionOrigin, updateTheme]
  )

  if (!mounted) {
    return (
      <button
        aria-hidden="true"
        className={cn(
          "inline-flex h-10 w-[4.5rem] items-center rounded-full border border-border/70 bg-card/70 opacity-0",
          className
        )}
        disabled
        ref={buttonRef}
        type="button"
      />
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <button
      aria-label={label}
      aria-pressed={isDark}
      className={cn(
        "group relative inline-flex h-10 w-[4.5rem] items-center rounded-full border border-border/70",
        "bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_88%,white_12%),color-mix(in_oklab,var(--card)_92%,black_8%))]",
        "px-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_10px_30px_-18px_rgba(15,23,42,0.55)] backdrop-blur-xl",
        "transition-[border-color,box-shadow,transform] duration-300 ease-out hover:border-primary/30 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_16px_40px_-22px_rgba(15,23,42,0.65)]",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-60",
        className
      )}
      disabled={isTransitioning}
      onClick={() => {
        void triggerThemeChange(nextTheme)
      }}
      onPointerDown={(event) => {
        setTransitionOrigin(event)
      }}
      ref={buttonRef}
      type="button"
    >
      <span
        className={cn(
          "absolute inset-y-1 left-1 w-8 rounded-full border border-white/50",
          "bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,244,247,0.78))]",
          "shadow-[0_8px_24px_-14px_rgba(15,23,42,0.75)] transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          isDark ? "translate-x-[2.25rem]" : "translate-x-0"
        )}
      />
      <span className="relative z-10 flex w-full items-center justify-between px-1">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-amber-500 transition-colors duration-500",
            isDark ? "text-muted-foreground/50" : "text-amber-500"
          )}
        >
          <SunMedium className="h-4 w-4" />
        </span>
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-500",
            isDark ? "text-violet-200" : "text-muted-foreground/60"
          )}
        >
          <MoonStar className="h-4 w-4" />
        </span>
      </span>
    </button>
  )
}
