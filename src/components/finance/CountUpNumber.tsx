"use client"

import { useEffect, useRef, useState } from "react"

export function CountUpNumber({
  value,
  className,
}: {
  value: string
  className?: string
}) {
  const [display, setDisplay] = useState(value)
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const isNegative = value.includes("−")
    const hasCents = value.includes(".")
    const rawDigits = value.replace(/,/g, "").replace(/[^0-9.]/g, "")
    const target = parseFloat(rawDigits) || 0

    const DURATION = 800
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const t = Math.min(elapsed / DURATION, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      const current = target * eased

      const formatted = current.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: hasCents ? 2 : 0,
        maximumFractionDigits: hasCents ? 2 : 0,
      })

      setDisplay(isNegative ? `−${formatted}` : formatted)

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setDisplay(value)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current)
    }
  }, [value])

  return <span className={className}>{display}</span>
}
