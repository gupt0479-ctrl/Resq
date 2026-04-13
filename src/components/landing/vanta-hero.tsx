"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function VantaHero() {
  const vantaRef = useRef<HTMLElement>(null)
  const vantaEffect = useRef<unknown>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      const [THREE, VANTA] = await Promise.all([
        import("three"),
        import("vanta/dist/vanta.waves.min.js"),
      ])

      if (cancelled || !vantaRef.current) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vantaEffect.current = (VANTA as any).default({
        el: vantaRef.current,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        color: 0x7a2f08,
        shininess: 40,
        waveHeight: 20,
        waveSpeed: 0.55,
        zoom: 0.9,
      })
    }

    init()

    return () => {
      cancelled = true
      if (vantaEffect.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(vantaEffect.current as any).destroy()
      }
    }
  }, [])

  return (
    <section
      ref={vantaRef}
      className="relative flex min-h-screen items-center justify-center bg-[#0e0a07]"
    >
      <div className="absolute inset-0 bg-black/45" />
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center text-white">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-white/70">
          Ember Table · Minneapolis
        </p>
        <h1 className="mb-5 text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
          Run your restaurant.<br />Not your inbox.
        </h1>
        <p className="mb-10 text-lg text-white/80 sm:text-xl">
          AI that handles reviews, guests, inventory, and daily briefings —
          so you can focus on the food.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-orange-400"
          >
            Open Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#demo"
            className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            See it live
          </a>
        </div>
      </div>
    </section>
  )
}
