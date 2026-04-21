"use client"

import { useEffect, useRef, useCallback } from "react"
import { usePathname } from "next/navigation"
import { useLoading } from "@/hooks/use-loading"

/**
 * Two-phase loading overlay trigger:
 *
 * 1. CLICK PHASE — a global click listener on <a> tags fires startLoading()
 *    *immediately* when the user clicks any internal link. This shows the
 *    overlay before Next.js even starts compiling / fetching the route.
 *
 * 2. PAINT PHASE — when the pathname changes (new page rendered), we call
 *    stopLoading() to dismiss the overlay.
 *
 * The ref-count in LoadingProvider means other callers (data-fetching hooks
 * etc.) compose correctly with this.
 */
export function NavigationWatcher() {
  const pathname = usePathname()
  const { startLoading, stopLoading } = useLoading()
  const pendingNav = useRef(false)

  // Phase 1: intercept clicks on internal links
  const handleClick = useCallback(
    (e: MouseEvent) => {
      // Walk up from the click target to find an <a>
      const anchor = (e.target as HTMLElement).closest("a")
      if (!anchor) return

      const href = anchor.getAttribute("href")
      if (!href) return

      // Only handle internal navigation (same-origin, not hash-only, not new tab)
      if (href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) return
      if (anchor.target === "_blank") return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      // Don't re-trigger if we're already on this path
      if (href === pathname || href === `${pathname}/`) return

      pendingNav.current = true
      startLoading()
    },
    [pathname, startLoading],
  )

  useEffect(() => {
    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [handleClick])

  // Phase 2: pathname changed → new page is rendered → dismiss
  const prevPathname = useRef(pathname)
  useEffect(() => {
    if (prevPathname.current === pathname) return
    prevPathname.current = pathname

    // If we triggered loading from a click, stop it now.
    // Small delay lets the page paint before we remove the overlay.
    if (pendingNav.current) {
      pendingNav.current = false
      const id = setTimeout(() => stopLoading(), 150)
      return () => {
        clearTimeout(id)
        stopLoading()
      }
    }
  }, [pathname, stopLoading])

  return null
}
