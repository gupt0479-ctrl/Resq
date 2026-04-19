import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Activity, ShieldAlert, TrendingDown, FileWarning, ScanSearch, Search, GitCompare, Zap, ScrollText } from "lucide-react"
import { McpGraph } from "@/components/McpGraph"
import { RiskBadge } from "@/components/RiskBadge"
import { AgentStatusPill } from "@/components/AgentStatusPill"

export const metadata: Metadata = {
  title: "OpsPilot Rescue — Autonomous SMB Survival Agent",
  description: "Autonomous cashflow recovery for small businesses. Collections, financing scout, vendor optimization.",
}

function formatUSD(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

const kpis = { atRiskReceivables: 43800 }

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-foreground text-background grid place-items-center font-display text-sm font-semibold">O</div>
            <div className="leading-tight">
              <div className="font-display text-[15px] font-semibold tracking-tight">OpsPilot</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-steel -mt-0.5">Rescue</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-steel">
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#mcp" className="hover:text-foreground transition-colors">MCP / Tools</a>
          </nav>
          <Link href="/rescue" className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-3.5 h-9 text-sm font-medium hover:opacity-90 transition-opacity">
            Open Rescue Queue <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-28 grid lg:grid-cols-12 gap-12 items-center relative">
          <div className="lg:col-span-6 stagger-in">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] tracking-wider uppercase text-steel">
              <span className="h-1.5 w-1.5 rounded-full bg-amber animate-pulse" />
              Autonomous SMB Survival Agent
            </span>
            <h1 className="mt-6 font-display text-5xl md:text-6xl font-medium leading-[1.05] tracking-tight">
              Cash is late.<br />
              Costs are up.<br />
              <span className="text-steel">Act before the business feels it.</span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-steel max-w-xl leading-relaxed">
              OpsPilot Rescue autonomously recovers receivables, scouts financing, and finds vendor and insurance savings — so small businesses survive the gap between cost and cash.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/rescue" className="inline-flex items-center gap-2 rounded-md bg-foreground text-background px-5 h-11 text-sm font-medium hover:opacity-90 transition-opacity">
                Open Rescue Queue <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/workflow" className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-5 h-11 text-sm font-medium hover:bg-surface-muted transition-colors">
                See a survival scan
              </Link>
            </div>
          </div>

          {/* App mockup */}
          <div className="lg:col-span-6 relative">
            <div className="card-elevated overflow-hidden shadow-2xl shadow-black/5">
              <div className="h-9 border-b border-border bg-surface-muted flex items-center px-3 gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-crimson/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-teal/60" />
                <span className="ml-3 text-[11px] text-steel">opspilot.app/rescue</span>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-steel">Rescue Queue</div>
                    <div className="font-display text-lg">6 open cases · {formatUSD(kpis.atRiskReceivables)} at risk</div>
                  </div>
                  <AgentStatusPill status="running" />
                </div>
                <div className="space-y-2.5">
                  {[
                    { t: "Maple & Oak — 18d overdue",      level: "Critical" as const, amt: "$6,420",    cat: "Collections" },
                    { t: "Insurance renewal +16.4%",        level: "High"     as const, amt: "$2,328/yr", cat: "Insurance"   },
                    { t: "Tomato case price spike",          level: "High"     as const, amt: "+$240/mo",  cat: "Vendor"      },
                    { t: "Working capital — 23d runway",    level: "High"     as const, amt: "Up to $35k", cat: "Financing"  },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium truncate">{r.t}</div>
                        <div className="text-[11px] text-steel">{r.cat}</div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[12px] tabular-nums font-medium">{r.amt}</span>
                        <RiskBadge level={r.level} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* mini agent run inset */}
            <div className="absolute -bottom-8 -left-6 hidden md:block w-64 card-elevated p-3 bg-surface">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-steel">Agent Run</span>
                <AgentStatusPill status="completed" />
              </div>
              <div className="space-y-1.5">
                {["Inspect receivables", "Search financing", "Compare vendors", "Insurance renewal", "Survival summary"].map((s, i) => (
                  <div key={s} className="flex items-center gap-2 text-[11px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                    <span className="text-foreground">{s}</span>
                    <span className="ml-auto text-steel tabular-nums">{[1.8, 4.2, 3.5, 2.7, 1.8][i]}s</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-t border-border/60 bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="max-w-2xl">
            <span className="text-[11px] uppercase tracking-[0.18em] text-amber font-medium">The problem</span>
            <h2 className="mt-3 font-display text-3xl md:text-4xl tracking-tight">Small businesses don&apos;t fail from one big shock. They fail from quiet pressure.</h2>
          </div>
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { Icon: FileWarning, h: "Overdue receivables starve cash",       t: "Customers pay late. Owners chase invoices instead of running the business." },
              { Icon: TrendingDown, h: "Financing offers are hard to compare", t: "APR, term, speed, and fit are scattered across providers and PDFs." },
              { Icon: ShieldAlert,  h: "Vendor prices creep up unnoticed",     t: "Unit costs rise week by week — invisible until margin disappears." },
              { Icon: Activity,     h: "Insurance renewals erode margin",      t: "Premiums jump at renewal. Comparing carriers is slow and unrewarding." },
            ].map(({ Icon, h, t }) => (
              <div key={h} className="card-elevated p-5">
                <Icon className="h-5 w-5 text-amber mb-4" />
                <h3 className="text-[15px] font-medium leading-snug">{h}</h3>
                <p className="mt-2 text-sm text-steel leading-relaxed">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-border/60">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="max-w-xl mb-12">
            <span className="text-[11px] uppercase tracking-[0.18em] text-teal font-medium">How it works</span>
            <h2 className="mt-3 font-display text-3xl md:text-4xl tracking-tight">A five-step survival loop, end to end.</h2>
          </div>

          <div className="grid md:grid-cols-5 gap-4">
            {[
              { Icon: ScanSearch, v: "Detect",      o: "identify survival risk" },
              { Icon: Search,     v: "Investigate", o: "gather internal + external context" },
              { Icon: GitCompare, v: "Compare",     o: "normalize the best options" },
              { Icon: Zap,        v: "Act",         o: "recommend or trigger next steps" },
              { Icon: ScrollText, v: "Audit",       o: "log every agent decision" },
            ].map(({ Icon, v, o }, idx) => (
              <div key={v} className="card-elevated p-5 relative">
                <div className="absolute -top-2 -left-2 h-6 w-6 rounded-full bg-foreground text-background grid place-items-center text-[11px] font-medium">{idx + 1}</div>
                <Icon className="h-5 w-5 text-foreground mb-4" />
                <div className="font-display text-lg">{v}</div>
                <div className="text-sm text-steel mt-1">{o}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MCP / TinyFish */}
      <section id="mcp" className="border-t border-border/60 bg-surface-muted">
        <div className="max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-[11px] uppercase tracking-[0.18em] text-amber font-medium">Tool execution layer</span>
            <h2 className="mt-3 font-display text-3xl md:text-4xl tracking-tight">An MCP bridge to the systems that already run the business.</h2>
            <p className="mt-5 text-base text-steel max-w-lg leading-relaxed">
              OpsPilot orchestrates external tools — TinyFish for the open web, Stripe for ledger truth, Gmail for outreach, vendor and insurance sources for live quotes. The agent acts; the audit trail proves it.
            </p>
            <div className="mt-8">
              <Link href="/rescue" className="inline-flex items-center gap-2 rounded-md bg-foreground text-background px-5 h-10 text-sm font-medium hover:opacity-90 transition-opacity">
                Open Rescue Queue <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="card-elevated p-6">
            <McpGraph />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-sm text-steel">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md bg-foreground text-background grid place-items-center font-display text-[11px]">O</div>
            <span>OpsPilot Rescue · Autonomous operator for business survival</span>
          </div>
          <div className="flex gap-5">
            <Link href="/rescue"       className="hover:text-foreground transition-colors">Rescue Queue</Link>
            <Link href="/workflow"     className="hover:text-foreground transition-colors">Agent Run</Link>
            <Link href="/dashboard"    className="hover:text-foreground transition-colors">Dashboard</Link>
            <Link href="/integrations" className="hover:text-foreground transition-colors">Integrations</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
