"use client"

import { createContext, useCallback, useEffect, useRef, useState } from "react"
import { CATCHPHRASES } from "@/lib/catchphrases"
import { LoadingOverlay } from "./loading-overlay"
import { NavigationWatcher } from "./navigation-watcher"

function pickRandom(current: string): string {
  if (CATCHPHRASES.length <= 1) return CATCHPHRASES[0]
  let next: string
  do {
    next = CATCHPHRASES[Math.floor(Math.random() * CATCHPHRASES.length)]
  } while (next === current)
  return next
}

export interface LoadingContextValue {
  isLoading: boolean
  startLoading: () => void
  stopLoading: () => void
}

export const LoadingContext = createContext<LoadingContextValue | null>(null)

/** How often the catchphrase rotates while loading (ms) */
const ROTATE_INTERVAL = 3000
/** Safety: auto-dismiss the overlay if stopLoading is never called (ms) */
const MAX_LOADING_MS = 12000

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const countRef = useRef(0)
  const [isVisible, setIsVisible] = useState(false)
  const [catchphrase, setCatchphrase] = useState(CATCHPHRASES[0])
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Rotate catchphrase while visible
  useEffect(() => {
    if (!isVisible) return
    const id = setInterval(() => {
      setCatchphrase((prev) => pickRandom(prev))
    }, ROTATE_INTERVAL)
    return () => clearInterval(id)
  }, [isVisible])

  const dismiss = useCallback(() => {
    setIsVisible(false)
    if (safetyTimer.current) {
      clearTimeout(safetyTimer.current)
      safetyTimer.current = null
    }
  }, [])

  const startLoading = useCallback(() => {
    const wasIdle = countRef.current === 0
    countRef.current += 1

    if (wasIdle) {
      setCatchphrase((prev) => pickRandom(prev))
      setIsVisible(true)

      // Safety net — never leave the overlay stuck forever
      safetyTimer.current = setTimeout(() => {
        countRef.current = 0
        dismiss()
      }, MAX_LOADING_MS)
    }
  }, [dismiss])

  const stopLoading = useCallback(() => {
    if (countRef.current === 0) return
    countRef.current -= 1
    if (countRef.current === 0) {
      dismiss()
    }
  }, [dismiss])

  return (
    <LoadingContext.Provider value={{ isLoading: isVisible, startLoading, stopLoading }}>
      {children}
      <LoadingOverlay isVisible={isVisible} catchphrase={catchphrase} />
      <NavigationWatcher />
    </LoadingContext.Provider>
  )
}
