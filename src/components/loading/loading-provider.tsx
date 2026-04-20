"use client"

import { createContext, useRef, useState } from "react"
import { CATCHPHRASES } from "@/lib/catchphrases"
import { LoadingOverlay } from "./loading-overlay"
import { NavigationWatcher } from "./navigation-watcher"

function fisherYatesShuffle(arr: string[]): string[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildShuffledQueue(): string[] {
  return fisherYatesShuffle([...CATCHPHRASES])
}

function getNextCatchphrase(state: {
  queue: string[]
  index: number
  catchphrase: string
}) {
  let nextQueue = state.queue
  let nextIndex = state.index + 1

  if (nextIndex >= nextQueue.length) {
    nextQueue = buildShuffledQueue()
    nextIndex = 0
  }

  if (nextQueue[nextIndex] === state.catchphrase && nextQueue.length > 1) {
    nextQueue = [...nextQueue]
    const swapIndex = (nextIndex + 1) % nextQueue.length
    ;[nextQueue[nextIndex], nextQueue[swapIndex]] = [nextQueue[swapIndex], nextQueue[nextIndex]]
  }

  return {
    queue: nextQueue,
    index: nextIndex,
    catchphrase: nextQueue[nextIndex] ?? state.catchphrase,
  }
}

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
  const [catchphraseState, setCatchphraseState] = useState(() => {
    const queue = buildShuffledQueue()
    return {
      queue,
      index: 0,
      catchphrase: queue[0] ?? CATCHPHRASES[0],
    }
  })

  function startLoading() {
    const wasIdle = countRef.current === 0
    countRef.current += 1
    startTimeRef.current = Date.now()
    setIsVisible(true)

    if (wasIdle) {
      setCatchphraseState((prev) => getNextCatchphrase(prev))
    }
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
      <LoadingOverlay isVisible={isVisible} catchphrase={catchphraseState.catchphrase} />
      <NavigationWatcher />
    </LoadingContext.Provider>
  )
}
