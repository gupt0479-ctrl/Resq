"use client"

import { createContext, useRef, useState } from "react"
import { useCatchphrase } from "@/hooks/use-catchphrase"
import { LoadingOverlay } from "./loading-overlay"
import { NavigationWatcher } from "./navigation-watcher"

export interface LoadingContextValue {
  isLoading: boolean
  startLoading: () => void
  stopLoading: () => void
}

export const LoadingContext = createContext<LoadingContextValue | null>(null)

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const countRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const [isVisible, setIsVisible] = useState(false)

  const catchphrase = useCatchphrase(isVisible)

  function startLoading() {
    countRef.current += 1
    startTimeRef.current = Date.now()
    setIsVisible(true)
  }

  function stopLoading() {
    if (countRef.current === 0) return
    countRef.current -= 1
    if (countRef.current === 0) {
      const elapsed = Date.now() - startTimeRef.current
      const delay = Math.max(0, 600 - elapsed)
      setTimeout(() => setIsVisible(false), delay)
    }
  }

  return (
    <LoadingContext.Provider value={{ isLoading: isVisible, startLoading, stopLoading }}>
      {children}
      <LoadingOverlay isVisible={isVisible} catchphrase={catchphrase} />
      <NavigationWatcher />
    </LoadingContext.Provider>
  )
}
