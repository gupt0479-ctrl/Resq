"use client"

import { cloneElement, useRef, useState, useEffect, type ReactElement } from "react"

type ChartElementProps = {
  width?: number
  height?: number
}

/**
 * Drop-in replacement for Recharts' ResponsiveContainer.
 *
 * Measures the wrapper div with ResizeObserver and clones the chart child
 * with explicit pixel width/height. The chart is never rendered until real
 * dimensions are available, so the "-1 width/height" warning never fires.
 */
export function SafeResponsiveContainer({
  children,
}: {
  children: ReactElement<ChartElementProps>
  width?: string | number
  height?: string | number
  minWidth?: number
  minHeight?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function measure() {
      const rect = el!.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setSize((prev) => {
          if (prev && prev.w === Math.floor(rect.width) && prev.h === Math.floor(rect.height)) {
            return prev
          }
          return { w: Math.floor(rect.width), h: Math.floor(rect.height) }
        })
      }
    }

    measure()

    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ width: "100%", height: "100%" }}>
      {size && cloneElement(children, { width: size.w, height: size.h })}
    </div>
  )
}
