import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "OpsPilot Rescue — Autonomous Cashflow Recovery",
  description: "Autonomous cashflow recovery for small businesses",
}

const CTA_HREF = "/rescue"

// ── Stat chips shown below hero CTA ──────────────────────────────────────────

const URGENCY_STATS = [
  "$18,400 at risk this week",
  "3 overdue accounts",
  "2 rescue actions pending",
] as const

// ── How-it-works cards ────────────────────────────────────────────────────────

const HOW_CARDS = [
  {
    step: "01",
    title: "Detect",
    body: "OpsPilot monitors your receivables and flags overdue invoices and cashflow gaps before they become crises.",
  },
  {
    step: "02",
    title: "Investigate",
    body: "The agent checks invoice status, customer payment history, and external systems to understand the full picture.",
  },
  {
    step: "03",
    title: "Act",
    body: "Outreach is drafted and sent. Payment plans are suggested. Financing options are fetched. All logged automatically.",
  },
  {
    step: "04",
    title: "Report",
    body: "Every action is recorded in the audit trail. You see exactly what the agent did and why. No black boxes.",
  },
] as const

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── 1. Top bar ───────────────────────────────────────────────────────── */}
      <div className="bg-foreground px-4 py-2 text-center text-xs font-medium text-background">
        OpsPilot Rescue is live — autonomous cashflow recovery for small businesses
      </div>

      {/* ── 2. Nav ───────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="text-base font-bold tracking-tight text-foreground">
            OpsPilot Rescue
          </span>
          <Link
            href={CTA_HREF}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open Rescue Queue →
          </Link>
        </div>
      </nav>

      {/* ── 3. Hero ──────────────────────────────────────────────────────────── */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="mb-6 max-w-2xl text-5xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl">
          Cash is late.<br />OpsPilot acts.
        </h1>
        <p className="mb-10 max-w-xl text-base leading-relaxed text-muted-foreground">
          When receivables slip, OpsPilot detects the risk, investigates
          across live systems, and takes action — automatically.
        </p>
        <Link
          href={CTA_HREF}
          className="mb-3 inline-block rounded-lg bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Open Rescue Queue →
        </Link>
        <p className="mb-14 text-xs text-muted-foreground">
          No dashboard required. Agent runs autonomously.
        </p>

        {/* Urgency stat chips */}
        <div className="flex flex-wrap justify-center gap-3">
          {URGENCY_STATS.map((stat) => (
            <span
              key={stat}
              className="rounded-full border border-destructive/30 bg-destructive/10 px-4 py-1.5 text-xs font-semibold text-destructive"
            >
              {stat}
            </span>
          ))}
        </div>
      </section>

      {/* ── 4. Problem section ───────────────────────────────────────────────── */}
      <section className="border-y border-border px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-2xl font-bold tracking-tight text-foreground">
            The cash flow crisis is manual — and it&apos;s getting worse.
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                stat: "60%",
                label: "of small business failures are caused by cash flow problems, not lack of profit.",
                accent: "text-red-600",
              },
              {
                stat: "14 days",
                label: "average time an owner spends monthly chasing late invoices manually.",
                accent: "text-amber-600",
              },
              {
                stat: "$90K",
                label: "average outstanding receivables for a service SMB at any given time.",
                accent: "text-blue-600",
              },
            ].map(({ stat, label, accent }) => (
              <div key={stat} className="text-center">
                <p className={`mb-2 text-4xl font-bold ${accent}`}>{stat}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
            Owners juggle overdue invoices, payment follow-ups, financing options, and vendor costs —
            all manually, with no tools designed for the job. OpsPilot Rescue changes that.
          </p>
        </div>
      </section>

      {/* ── 5. How the agent works (4 steps) ────────────────────────────────── */}
      <section className="bg-muted/40 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-14 text-center text-2xl font-bold tracking-tight text-foreground">
            Four steps. No manual work.
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_CARDS.map(({ step, title, body }) => (
              <div
                key={step}
                className="rounded-xl border border-border bg-card p-6 shadow-sm"
              >
                <p className="mb-3 text-xs font-bold tracking-widest text-muted-foreground">
                  {step}
                </p>
                <h3 className="mb-3 text-base font-semibold text-foreground">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. Where TinyFish comes in ───────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-5xl items-center gap-14 lg:grid-cols-2">

          {/* Left: text */}
          <div>
            <h2 className="mb-5 text-3xl font-bold leading-tight tracking-tight text-foreground">
              The agent operates on the live web.
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              OpsPilot uses TinyFish to log into external portals,
              verify invoice status, check payment dashboards, and
              fetch live financing options — exactly like a human would.
            </p>
          </div>

          {/* Right: terminal mock card */}
          {/* bg-zinc-950 is intentional terminal aesthetic — not a theme color */}
          <div className="rounded-xl bg-zinc-950 p-6 shadow-2xl">
            <p className="mb-5 font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Agent Step 3 of 5
            </p>
            <ul className="space-y-3 font-mono text-sm">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                <span className="text-zinc-300">Checking payment portal...</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 font-bold text-emerald-400">✓</span>
                <span className="text-zinc-300">
                  Invoice{" "}
                  <span className="font-semibold text-white">#1042</span>
                  {" "}— unpaid, 14 days over
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 font-bold text-emerald-400">✓</span>
                <span className="text-zinc-300">
                  Customer has 2 prior late payments
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 font-bold text-blue-400">→</span>
                <span className="text-zinc-300">Drafting escalated follow-up</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── 7. CTA footer ────────────────────────────────────────────────────── */}
      <section className="bg-foreground px-6 py-28 text-center">
        <h2 className="mb-8 text-3xl font-bold tracking-tight text-background sm:text-4xl">
          One click to recover what you&apos;re owed.
        </h2>
        <Link
          href={CTA_HREF}
          className="inline-block rounded-lg bg-primary px-10 py-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Open Rescue Queue →
        </Link>
        <p className="mt-8 text-xs text-background/50">
          Built for small businesses. Powered by Claude AI + TinyFish.
        </p>
      </section>

    </div>
  )
}
