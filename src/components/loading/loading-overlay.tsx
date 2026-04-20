"use client"

import { useState } from "react"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

interface LoadingOverlayProps {
  isVisible: boolean
  catchphrase: string
}

export function LoadingOverlay({ isVisible, catchphrase }: LoadingOverlayProps) {
  const reducedMotion = useReducedMotion()
  const [imgError, setImgError] = useState(false)

  return (
    <div
      aria-hidden={!isVisible}
      className={[
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-background/95 backdrop-blur-sm",
        "transition-opacity duration-200",
        isVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
      ].join(" ")}
    >
      <div className="flex flex-col items-center gap-6">
        {!imgError && (
          <img
            src="/next.svg"
            alt="Resq"
            width={80}
            height={80}
            onError={() => setImgError(true)}
          />
        )}

        <p className="text-center text-base font-medium text-foreground max-w-xs font-[Inter]">
          {catchphrase}
        </p>

        {reducedMotion ? (
          <div className="h-3 w-3 rounded-full bg-foreground animate-pulse" />
        ) : (
          <div className="h-8 w-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
        )}
      </div>
    </div>
  )
}
