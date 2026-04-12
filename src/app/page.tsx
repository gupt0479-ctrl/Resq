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

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=80"

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
    color: "bg-teal-100 text-teal-700",
    desc: "AI reads every review, drafts personalized replies, flags safety issues, and queues recovery messages for approval.",
  },
  {
    icon: Package,
    title: "Inventory",
    color: "bg-amber-100 text-amber-700",
    desc: "Tracks stock in real time, predicts shortfalls before service, and sends reorder alerts with suggested quantities.",
  },
  {
    icon: Megaphone,
    title: "Marketing",
    color: "bg-purple-100 text-purple-700",
    desc: "Sends return-visit nudges to lapsed guests, crafts seasonal promos, and targets the right guests at the right time.",
  },
  {
    icon: BarChart2,
    title: "Performance",
    color: "bg-blue-100 text-blue-700",
    desc: "Delivers a manager briefing each morning: revenue trends, top dishes, staff notes, and the one thing that needs attention.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-foreground">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section
        className="relative flex min-h-screen items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
      >
        <div className="absolute inset-0 bg-black/62" />
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
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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

      {/* ── Before / After ───────────────────────────────── */}
      <section id="demo" className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-center text-3xl font-bold text-gray-900">
            Before vs. After
          </h2>
          <p className="mb-12 text-center text-gray-500">
            The same restaurant. A completely different manager experience.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Before */}
            <div className="rounded-2xl border border-red-100 bg-white p-8 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">
                  Before OpsPilot
                </span>
              </div>
              <ul className="space-y-3">
                {BEFORE.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-600">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
                Manager spends 3+ hours/day on admin. Guests fall through the cracks.
              </p>
            </div>

            {/* After */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  With OpsPilot
                </span>
              </div>
              <ul className="space-y-3">
                {AFTER.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-600">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700">
                One dashboard. AI acts instantly. Manager focuses on the guest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-center text-3xl font-bold text-gray-900">
            Four agents. One dashboard.
          </h2>
          <p className="mb-12 text-center text-gray-500">
            Each agent handles a slice of your operations — automatically.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, color, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className={`mb-4 inline-flex rounded-xl p-3 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold text-gray-900">{title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="bg-primary px-6 py-20 text-center">
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
            className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3.5 text-sm font-semibold text-primary transition-opacity hover:opacity-90"
          >
            Open Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
