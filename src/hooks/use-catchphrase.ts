"use client"

import { useRef, useState } from "react"
import { CATCHPHRASES } from "@/lib/catchphrases"

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

export function useCatchphrase(trigger: boolean): string {
  const queueRef = useRef<string[]>([])
  const indexRef = useRef<number>(0)
  const prevTriggerRef = useRef<boolean>(trigger)

  // Initialize with a random catchphrase on first render
  const [catchphrase, setCatchphrase] = useState<string>(() => {
    const queue = buildShuffledQueue()
    queueRef.current = queue
    indexRef.current = 0
    return queue[0]
  })

  // Detect rising edge (false → true)
  if (!prevTriggerRef.current && trigger) {
    prevTriggerRef.current = trigger

    let queue = queueRef.current
    let index = indexRef.current
    const prev = catchphrase

    // Advance index
    index += 1

    // Reshuffle on exhaustion
    if (index >= queue.length) {
      queue = buildShuffledQueue()
      queueRef.current = queue
      index = 0
    }

    // Guarantee no consecutive repeat — swap with next item if needed
    if (queue[index] === prev && queue.length > 1) {
      const swapIndex = (index + 1) % queue.length
      ;[queue[index], queue[swapIndex]] = [queue[swapIndex], queue[index]]
    }

    indexRef.current = index
    setCatchphrase(queue[index])
  } else {
    prevTriggerRef.current = trigger
  }

  return catchphrase
}
