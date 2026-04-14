"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function VantaHero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0e0a07] pt-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.25),_transparent_35%),linear-gradient(135deg,_rgba(120,53,15,0.9),_rgba(14,10,7,0.98)_45%,_rgba(10,10,10,1))]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/10 blur-3xl dark:bg-violet-400/12" />
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
