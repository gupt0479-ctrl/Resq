"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function VantaHero() {
  return (
    <section
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0e0a07] pt-24"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(234,88,12,0.28),_transparent_38%),radial-gradient(circle_at_20%_80%,_rgba(217,119,6,0.2),_transparent_30%),linear-gradient(135deg,_#120c08_0%,_#22130b_48%,_#090909_100%)]" />
      <div className="absolute inset-x-[-10%] top-[-12%] h-[34rem] rounded-full bg-orange-500/18 blur-3xl motion-safe:animate-pulse" />
      <div className="absolute inset-x-[18%] bottom-[-22%] h-[28rem] rounded-full bg-amber-300/10 blur-3xl motion-safe:animate-pulse" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:72px_72px] opacity-[0.08]" />
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
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-orange-400"
          >
            Open Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#demo"
            className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            See it live
          </a>
        </div>
      </div>
      <div id="landing-hero-sentinel" className="absolute inset-x-0 bottom-0 h-px" />
    </section>
  )
}
