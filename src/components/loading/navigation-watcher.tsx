"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useLoading } from "@/hooks/use-loading"

export function NavigationWatcher() {
  const pathname = usePathname()
  const { startLoading, stopLoading } = useLoading()

  useEffect(() => {
    startLoading()
    return () => {
      stopLoading()
    }
  }, [pathname])

  return null
}
