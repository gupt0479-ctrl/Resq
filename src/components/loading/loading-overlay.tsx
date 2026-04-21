"use client"

import { useEffect, useState } from "react"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

interface LoadingOverlayProps {
  isVisible: boolean
  catchphrase: string
}

/**
 * Full-screen loading overlay with:
 * - Animated cube/square loader (game-style)
 * - Rotating catchphrases (driven by parent)
 * - Respects dark/light mode via CSS variables (bg-background / text-foreground)
 * - Lottie-style CSS animation instead of a static image
 */
export function LoadingOverlay({ isVisible, catchphrase }: LoadingOverlayProps) {
  const reducedMotion = useReducedMotion()
  const [displayedText, setDisplayedText] = useState(catchphrase)
  const [textFading, setTextFading] = useState(false)

  // Animate text swap with a quick fade
  useEffect(() => {
    if (catchphrase === displayedText) return
    setTextFading(true)
    const id = setTimeout(() => {
      setDisplayedText(catchphrase)
      setTextFading(false)
    }, 250)
    return () => clearTimeout(id)
  }, [catchphrase, displayedText])

  return (
    <div
      aria-hidden={!isVisible}
      role="status"
      className={[
        "fixed inset-0 z-50 flex items-center justify-center",
        // Uses the theme's background color — works in both light & dark mode
        "bg-background/95 backdrop-blur-sm",
        "transition-opacity duration-300",
        isVisible
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none",
      ].join(" ")}
    >
      <div className="flex flex-col items-center gap-8">
        {/* ── Animated cube loader ── */}
        {reducedMotion ? (
          <div className="h-10 w-10 rounded-md bg-foreground/60 animate-pulse" />
        ) : (
          <div className="cube-loader" aria-label="Loading">
            <div className="cube-wrapper">
              <div className="cube-side cube-front" />
              <div className="cube-side cube-back" />
              <div className="cube-side cube-right" />
              <div className="cube-side cube-left" />
              <div className="cube-side cube-top" />
              <div className="cube-side cube-bottom" />
            </div>
          </div>
        )}

        {/* ── Catchphrase with fade transition ── */}
        <p
          className={[
            "text-center text-base font-medium text-foreground/80 max-w-xs font-[Inter]",
            "transition-opacity duration-250",
            textFading ? "opacity-0" : "opacity-100",
          ].join(" ")}
        >
          {displayedText}
        </p>

        {/* ── Square progress bar (game-style) ── */}
        {!reducedMotion && (
          <div className="w-48 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-foreground/50 animate-progress-slide" />
          </div>
        )}
      </div>

      {/* ── Scoped CSS for the cube + progress bar ── */}
      <style jsx>{`
        .cube-loader {
          width: 48px;
          height: 48px;
          perspective: 200px;
        }
        .cube-wrapper {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          animation: cube-spin 2.4s ease-in-out infinite;
        }
        .cube-side {
          position: absolute;
          width: 48px;
          height: 48px;
          border-radius: 6px;
        }
        /* Use currentColor so it inherits from text-foreground */
        .cube-front  { background: currentColor; opacity: 0.35; transform: translateZ(24px); }
        .cube-back   { background: currentColor; opacity: 0.15; transform: rotateY(180deg) translateZ(24px); }
        .cube-right  { background: currentColor; opacity: 0.25; transform: rotateY(90deg) translateZ(24px); }
        .cube-left   { background: currentColor; opacity: 0.20; transform: rotateY(-90deg) translateZ(24px); }
        .cube-top    { background: currentColor; opacity: 0.30; transform: rotateX(90deg) translateZ(24px); }
        .cube-bottom { background: currentColor; opacity: 0.10; transform: rotateX(-90deg) translateZ(24px); }

        @keyframes cube-spin {
          0%   { transform: rotateX(0deg) rotateY(0deg); }
          25%  { transform: rotateX(90deg) rotateY(0deg); }
          50%  { transform: rotateX(90deg) rotateY(90deg); }
          75%  { transform: rotateX(180deg) rotateY(90deg); }
          100% { transform: rotateX(180deg) rotateY(180deg); }
        }

        .animate-progress-slide {
          animation: progress-slide 1.8s ease-in-out infinite;
        }
        @keyframes progress-slide {
          0%   { transform: translateX(-150%); }
          50%  { transform: translateX(250%); }
          100% { transform: translateX(-150%); }
        }
      `}</style>
    </div>
  )
}
