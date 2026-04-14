import Link from "next/link"
import {
  MessageSquare,
  Package,
  Megaphone,
  BarChart2,
  ArrowRight,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { LandingHeader } from "@/components/landing/landing-header"
import { VantaHero } from "@/components/landing/vanta-hero"


const BEFORE = [
  "Spreadsheet for inventory — updated manually",
  "Sticky notes for guest complaints",
  "Texting staff about low stock",
  "Calling guests for overdue invoices",
  "Paper notes for manager briefing",
]

const AFTER = [
  "Live inventory alerts with reorder suggestions",
  "AI flags reviews and drafts recovery messages",
  "Auto-alerts sent when stock hits reorder level",
  "Automated invoice reminders via email",
  "Daily AI briefing delivered before service",
]

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Customer Service",
    color: "bg-teal-500/12 text-teal-700 dark:bg-teal-400/14 dark:text-teal-200",
    desc: "AI reads every review, drafts personalized replies, flags safety issues, and queues recovery messages for approval.",
  },
  {
    icon: Package,
    title: "Inventory",
    color: "bg-amber-500/12 text-amber-700 dark:bg-amber-400/14 dark:text-amber-200",
    desc: "Tracks stock in real time, predicts shortfalls before service, and sends reorder alerts with suggested quantities.",
  },
  {
    icon: Megaphone,
    title: "Marketing",
    color: "bg-purple-500/12 text-purple-700 dark:bg-purple-400/14 dark:text-purple-200",
    desc: "Sends return-visit nudges to lapsed guests, crafts seasonal promos, and targets the right guests at the right time.",
  },
  {
    icon: BarChart2,
    title: "Performance",
    color: "bg-blue-500/12 text-blue-700 dark:bg-blue-400/14 dark:text-blue-200",
    desc: "Delivers a manager briefing each morning: revenue trends, top dishes, staff notes, and the one thing that needs attention.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      {/* ── Hero ─────────────────────────────────────────── */}
      <VantaHero />

      {/* ── Before / After ───────────────────────────────── */}
      <section id="demo" className="bg-muted/45 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-center text-3xl font-bold text-foreground">
            Before vs. After
          </h2>
          <p className="mb-12 text-center text-muted-foreground">
            The same restaurant. A completely different manager experience.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Before */}
            <div className="rounded-3xl border border-red-200/70 bg-card p-8 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)]">
              <div className="mb-5 flex items-center gap-2">
                <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-200">
                  Before OpsPilot
                </span>
              </div>
              <ul className="space-y-3">
                {BEFORE.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400 dark:text-red-300" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-6 rounded-2xl bg-red-500/8 px-4 py-3 text-xs font-medium text-red-700 dark:bg-red-500/12 dark:text-red-200">
                Manager spends 3+ hours/day on admin. Guests fall through the cracks.
              </p>
            </div>

            {/* After */}
            <div className="rounded-3xl border border-emerald-200/70 bg-card p-8 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)]">
              <div className="mb-5 flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/16 dark:text-emerald-200">
                  With OpsPilot
                </span>
              </div>
              <ul className="space-y-3">
                {AFTER.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-300" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-6 rounded-2xl bg-emerald-500/8 px-4 py-3 text-xs font-medium text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-200">
                One dashboard. AI acts instantly. Manager focuses on the guest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-center text-3xl font-bold text-foreground">
            Four agents. One dashboard.
          </h2>
          <p className="mb-12 text-center text-muted-foreground">
            Each agent handles a slice of your operations — automatically.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, color, desc }) => (
              <div
                key={title}
                className="rounded-3xl border border-border/80 bg-card/90 p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.36)] backdrop-blur-sm"
              >
                <div className={`mb-4 inline-flex rounded-xl p-3 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_82%,black_18%),color-mix(in_oklab,var(--primary)_62%,#1f1639_38%))] px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-3 text-3xl font-bold text-white">
            Built for Ember Table.
            <br />
            Ready for every restaurant.
          </h2>
          <p className="mb-8 text-white/75">
            One dashboard, four AI agents, zero manual admin.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-primary shadow-[0_22px_50px_-28px_rgba(255,255,255,0.85)] transition-all hover:-translate-y-0.5 hover:opacity-95"
          >
            Open Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
