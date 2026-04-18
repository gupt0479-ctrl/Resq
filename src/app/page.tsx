import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "OpsPilot — Autonomous SMB Survival Agent",
  description: "Collections + financing scout + vendor optimization. Autonomous cashflow survival for small businesses.",
}

const PROBLEM_CARDS = [
  {
    icon: "📬",
    title: "Chasing invoices manually",
    body: "You send the same follow-up email three times. The customer ignores it. You give up. $4,200 just disappeared.",
  },
  {
    icon: "🏦",
    title: "No idea what financing exists",
    body: "There are 11 SMB loan products you qualify for right now. You don't know any of them. The bank you tried said no.",
  },
  {
    icon: "📉",
    title: "Vendors charging you retail",
    body: "Your competitors pay 18% less for the same supplies. You've never had time to find out why or negotiate.",
  },
  {
    icon: "🔥",
    title: "Cash gap every 90 days",
    body: "You have revenue. You have expenses. But they don't line up. Every quarter the same panic. Every quarter manual scramble.",
  },
] as const

const WORKFLOW_STEPS = [
  {
    step: "01",
    label: "Detect",
    title: "Invoice goes overdue",
    body: "OpsPilot watches your receivables in real time. The moment a payment is late, the agent is already working — before you even notice.",
  },
  {
    step: "02",
    label: "Investigate",
    title: "Agent reads the full picture",
    body: "Customer payment history, outstanding balance, days overdue, prior follow-ups — all checked automatically across your live systems.",
  },
  {
    step: "03",
    label: "Outreach",
    title: "Escalation drafted & sent",
    body: "A structured payment plan offer is drafted, personalised, and sent. Not a generic template — a real escalation with options.",
  },
  {
    step: "04",
    label: "Finance",
    title: "Financing options surfaced",
    body: "If the gap is real, the agent scouts live SMB loan products, invoice factoring rates, and bridge financing — and ranks them.",
  },
  {
    step: "05",
    label: "Resolve",
    title: "Case closed or escalated",
    body: "Every action is logged to the audit trail. You see exactly what ran, what was sent, and what to do next. No black boxes.",
  },
] as const

const MCP_NODES = [
  { id: "opspilot", label: "OpsPilot",  x: 200, y: 130, r: 26, primary: true },
  { id: "stripe",   label: "Stripe",    x: 55,  y: 45,  r: 18 },
  { id: "gmail",    label: "Gmail",     x: 345, y: 45,  r: 18 },
  { id: "supabase", label: "Supabase",  x: 55,  y: 215, r: 18 },
  { id: "tinyfish", label: "TinyFish",  x: 345, y: 215, r: 18 },
  { id: "claude",   label: "Claude AI", x: 200, y: 260, r: 18 },
]

const MCP_EDGES = [
  ["opspilot", "stripe"],
  ["opspilot", "gmail"],
  ["opspilot", "supabase"],
  ["opspilot", "tinyfish"],
  ["opspilot", "claude"],
]

export default function LandingPage() {
  const nodeMap = Object.fromEntries(MCP_NODES.map(n => [n.id, n]))

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Announcement bar ──────────────────────────────────────────────────── */}
      <div className="bg-foreground px-4 py-2.5 text-center text-[11.5px] font-medium text-background">
        OpsPilot is live at O1 Summit 2026 — autonomous SMB survival agent
      </div>

      {/* ── Nav ───────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div>
            <span className="font-display text-lg font-normal tracking-tight text-foreground">OpsPilot</span>
            <span className="ml-2 text-[10px] uppercase tracking-[0.18em] text-steel">SMB Survival</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="hidden sm:block text-[12.5px] text-steel hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link
              href="/rescue"
              className="rounded-md bg-foreground px-4 py-2 text-[12.5px] font-semibold text-background transition-opacity hover:opacity-90"
            >
              Open Rescue Queue →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center px-6 py-28 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse" />
          <span className="text-[11px] font-medium text-steel uppercase tracking-widest">Live agent · Claude AI + TinyFish</span>
        </div>

        <h1 className="mt-6 mb-6 max-w-3xl font-display text-5xl font-normal leading-[1.15] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          Autonomous SMB<br />Survival Agent
        </h1>

        <p className="mb-10 max-w-lg text-[15px] leading-relaxed text-steel">
          Collections. Financing scout. Vendor optimization.
          OpsPilot detects cashflow threats and acts — while you run your business.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mb-12">
          <Link
            href="/rescue"
            className="rounded-md bg-foreground px-8 py-3.5 text-[13px] font-semibold text-background transition-opacity hover:opacity-90"
          >
            Open Rescue Queue →
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border border-border px-8 py-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-surface-muted"
          >
            View Dashboard
          </Link>
        </div>

        {/* Live urgency stats */}
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { label: "$18,400 at risk this week",   color: "border-crimson/30 bg-crimson/5 text-crimson" },
            { label: "3 overdue accounts",           color: "border-amber/30 bg-amber/5 text-amber" },
            { label: "2 rescue actions pending",     color: "border-border bg-surface text-steel" },
          ].map(({ label, color }) => (
            <span key={label} className={`rounded-full border px-4 py-1.5 text-[11.5px] font-semibold ${color}`}>
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* ── Problem cards ─────────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-surface px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-3">The problem</div>
            <h2 className="font-display text-3xl font-normal tracking-tight text-foreground">
              Cash flow problems kill profitable businesses.
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-[14px] leading-relaxed text-steel">
              60% of small business failures trace back to cash flow — not lack of revenue.
              The tools to fix it are either too expensive, too complex, or just don&apos;t exist.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROBLEM_CARDS.map(({ icon, title, body }) => (
              <div key={title} className="card-elevated p-6 hover:-translate-y-0.5 transition-transform duration-200">
                <div className="text-2xl mb-4">{icon}</div>
                <h3 className="font-medium text-[13.5px] mb-2">{title}</h3>
                <p className="text-[12px] leading-relaxed text-steel">{body}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-8 mt-14 text-center">
            {[
              { stat: "60%",    label: "of SMB failures caused by cash flow, not profit", color: "text-crimson" },
              { stat: "14 hrs", label: "per month lost chasing late invoices manually",    color: "text-amber" },
              { stat: "$90K",   label: "average outstanding receivables at any given time", color: "text-foreground" },
            ].map(({ stat, label, color }) => (
              <div key={stat}>
                <p className={`font-display text-4xl font-normal mb-2 ${color}`}>{stat}</p>
                <p className="text-[12px] leading-relaxed text-steel">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow steps ────────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-3">How it works</div>
            <h2 className="font-display text-3xl font-normal tracking-tight text-foreground">
              Five steps. Zero manual work.
            </h2>
          </div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-4 bottom-4 w-px bg-border hidden sm:block" />
            <div className="space-y-4">
              {WORKFLOW_STEPS.map(({ step, label, title, body }) => (
                <div key={step} className="flex gap-6 sm:pl-14 relative">
                  <div className="hidden sm:flex absolute left-0 h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-card z-10">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-steel">{step}</span>
                  </div>
                  <div className="card-elevated p-5 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-steel">{label}</span>
                    </div>
                    <h3 className="font-medium text-[14px] mb-1">{title}</h3>
                    <p className="text-[12.5px] leading-relaxed text-steel">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── MCP section ───────────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-surface px-6 py-24">
        <div className="mx-auto max-w-5xl grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-4">MCP bridge</div>
            <h2 className="font-display text-3xl font-normal leading-snug tracking-tight text-foreground mb-5">
              The agent operates on the live web.
            </h2>
            <p className="text-[14px] leading-relaxed text-steel mb-6">
              OpsPilot uses TinyFish to navigate external portals, verify invoice status,
              and fetch live financing options — exactly like a human would.
              Claude AI reasons over the data and decides the next action.
            </p>
            <ul className="space-y-3">
              {[
                "Stripe for payment processing and invoice creation",
                "Gmail for personalised customer outreach",
                "TinyFish for live web browsing and portal access",
                "Claude AI for reasoning, drafting, and decision-making",
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-[13px] text-steel">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-steel shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* MCP graph */}
          <div className="card-elevated p-8">
            <svg viewBox="0 20 400 260" className="w-full" aria-hidden="true">
              {MCP_EDGES.map(([a, b]) => {
                const na = nodeMap[a], nb = nodeMap[b]
                return (
                  <line key={`${a}-${b}`}
                    x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                    stroke="hsl(220 13% 91%)" strokeWidth="1.5" strokeDasharray="5 4"
                  />
                )
              })}
              {MCP_NODES.map(n => (
                <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                  <circle r={n.r} fill={n.primary ? "hsl(0 0% 10%)" : "white"} stroke="hsl(220 13% 91%)" strokeWidth="1.5" />
                  <text textAnchor="middle" dy="4"
                    fontSize={n.primary ? 9 : 7.5}
                    fill={n.primary ? "white" : "hsl(0 0% 10%)"}
                    fontFamily="Inter, sans-serif"
                    fontWeight="600">
                    {n.label}
                  </text>
                </g>
              ))}
            </svg>
            <p className="text-[11px] text-steel text-center mt-4">All connections are live — not mocked</p>
          </div>
        </div>
      </section>

      {/* ── Terminal demo ─────────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-10">
            <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-3">Live agent trace</div>
            <h2 className="font-display text-3xl font-normal tracking-tight text-foreground">
              Watch the agent work.
            </h2>
          </div>
          {/* bg-zinc-950: intentional terminal aesthetic, not a theme color */}
          <div className="rounded-xl bg-zinc-950 p-7 shadow-2xl">
            <div className="flex items-center gap-2 mb-5">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              <span className="ml-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                opspilot · rescue agent · step 3 of 5
              </span>
            </div>
            <ul className="space-y-3.5 font-mono text-[13px]">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-zinc-400">Fetching invoice #1042 from Stripe...</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 font-bold text-teal">✓</span>
                <span className="text-zinc-300">
                  Invoice <span className="font-semibold text-white">#1042</span> — unpaid, 14 days overdue, balance <span className="text-white">$4,200</span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 font-bold text-teal">✓</span>
                <span className="text-zinc-300">Customer has 2 prior late payments — escalation warranted</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 font-bold text-teal">✓</span>
                <span className="text-zinc-300">Financing gap: <span className="text-white">$6,800</span> — scouting bridge loan options...</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 text-blue-400">→</span>
                <span className="text-zinc-300">Drafting structured payment plan offer with 30-day terms</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 text-blue-400">→</span>
                <span className="text-zinc-300">Sending via Gmail · logging to audit trail</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── CTA footer ────────────────────────────────────────────────────────── */}
      <section className="bg-foreground px-6 py-28 text-center">
        <div className="text-[10px] uppercase tracking-[0.18em] text-background/40 mb-5">Get started</div>
        <h2 className="font-display text-4xl font-normal tracking-tight text-background mb-3 sm:text-5xl">
          One click to recover<br />what you&apos;re owed.
        </h2>
        <p className="mb-10 text-[14px] text-background/50 max-w-md mx-auto">
          No setup required. The agent reads your live data and starts working immediately.
        </p>
        <Link
          href="/rescue"
          className="inline-block rounded-md bg-background px-10 py-4 text-[13px] font-semibold text-foreground transition-opacity hover:opacity-90"
        >
          Open Rescue Queue →
        </Link>
        <div className="mt-14 flex flex-wrap justify-center gap-6 text-[11.5px] text-background/40">
          <Link href="/dashboard"    className="hover:text-background/70 transition-colors">Dashboard</Link>
          <Link href="/invoices"     className="hover:text-background/70 transition-colors">Invoices</Link>
          <Link href="/customers"    className="hover:text-background/70 transition-colors">Customers</Link>
          <Link href="/finance"      className="hover:text-background/70 transition-colors">Finance</Link>
          <Link href="/integrations" className="hover:text-background/70 transition-colors">Integrations</Link>
          <Link href="/workflow"     className="hover:text-background/70 transition-colors">Agent Run</Link>
        </div>
        <p className="mt-6 text-[11px] text-background/25">
          Built for small businesses · Powered by Claude AI + TinyFish · O1 Summit 2026
        </p>
      </section>

    </div>
  )
}
