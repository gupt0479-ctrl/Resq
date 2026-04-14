import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = { title: "OpsPilot — Ember Table" }

const EMBER  = "#D85A30"
const DARK   = "#1C1208"
const BASE   = "#FAFAF8"
const MUTED  = "#7A6A5A"
const BORDER = "#E5DDD5"

// ── Atoms ─────────────────────────────────────────────────────────────────────

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      border: "0.5px solid rgba(216,90,48,0.35)", borderRadius: "100px",
      padding: "4px 12px", fontSize: "11px", color: EMBER,
      background: "rgba(216,90,48,0.06)", fontFamily: "sans-serif",
    }}>
      {children}
    </span>
  )
}

function SectionDivider() {
  return <div style={{ height: "0.5px", background: BORDER }} />
}

function MockCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "white", border: `0.5px solid ${BORDER}`,
      borderRadius: "12px", padding: "1rem",
      boxShadow: "0 4px 20px rgba(28,18,8,0.06)",
    }}>
      {title && (
        <p style={{
          fontSize: "10px", color: MUTED, textTransform: "uppercase",
          letterSpacing: "0.1em", marginBottom: "0.75rem", fontFamily: "sans-serif",
        }}>
          {title}
        </p>
      )}
      {children}
    </div>
  )
}

function AiHint({ label, text }: { label: string; text: string }) {
  return (
    <div style={{
      marginTop: "0.75rem",
      background: "rgba(216,90,48,0.05)", border: "0.5px solid rgba(216,90,48,0.2)",
      borderRadius: "6px", padding: "10px 12px",
    }}>
      <p style={{ fontSize: "10px", color: EMBER, fontFamily: "sans-serif", marginBottom: "3px" }}>{label}</p>
      <p style={{ fontSize: "11px", fontStyle: "italic", color: MUTED, lineHeight: 1.6 }}>{text}</p>
    </div>
  )
}

function FeatureText({ eyebrow, heading, body, pill }: {
  eyebrow: string; heading: React.ReactNode; body: string; pill: string
}) {
  return (
    <div>
      <p style={{ fontSize: "10px", color: EMBER, textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "sans-serif", marginBottom: "1rem" }}>
        {eyebrow}
      </p>
      <h2 style={{ fontSize: "34px", fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, color: DARK, lineHeight: 1.15, marginBottom: "1rem" }}>
        {heading}
      </h2>
      <p style={{ fontSize: "14px", color: MUTED, lineHeight: 1.75, marginBottom: "1.5rem", fontFamily: "sans-serif" }}>
        {body}
      </p>
      <Pill>{pill}</Pill>
    </div>
  )
}

// ── Dashboard hero mock (matches real app) ────────────────────────────────────

const SIDEBAR_NAV = [
  { group: "CORE",       items: ["Dashboard", "Reservations", "Workflow"] },
  { group: "OPERATIONS", items: ["Invoices", "Finance", "Inventory", "Shipments"] },
  { group: "SUPPORT",    items: ["Feedback", "Integrations"] },
]

function DashboardMock() {
  return (
    <div style={{
      borderRadius: "12px", overflow: "hidden",
      boxShadow: "0 28px 72px rgba(28,18,8,0.16), 0 6px 20px rgba(28,18,8,0.08)",
      border: `1px solid ${BORDER}`,
    }}>
      {/* Browser chrome */}
      <div style={{
        background: "#EDEAE4", padding: "9px 14px",
        display: "flex", alignItems: "center", gap: "6px",
        borderBottom: "1px solid #DDD8D0",
      }}>
        {(["#FF5F57","#FEBC2E","#28C840"] as const).map(c => (
          <span key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c, display: "inline-block", flexShrink: 0 }} />
        ))}
        <div style={{
          flex: 1, marginLeft: "8px", background: "#E3DED8",
          borderRadius: "5px", padding: "3px 10px",
          fontSize: "11px", color: "#8A7A6A", fontFamily: "sans-serif",
        }}>
          opspilot.app/dashboard
        </div>
      </div>

      {/* App layout */}
      <div style={{ display: "flex", height: "420px" }}>

        {/* Sidebar */}
        <div style={{ width: "148px", background: DARK, flexShrink: 0, padding: "12px 0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "0 12px 10px", borderBottom: "0.5px solid rgba(255,255,255,0.07)", marginBottom: "4px" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "white", letterSpacing: "-0.02em", fontFamily: "sans-serif" }}>OpsPilot</p>
            <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.28)", marginTop: "1px", fontFamily: "sans-serif" }}>Ember Table</p>
          </div>
          {SIDEBAR_NAV.map(({ group, items }) => (
            <div key={group} style={{ marginTop: "10px" }}>
              <p style={{ fontSize: "8px", color: "rgba(255,255,255,0.22)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "0 12px", marginBottom: "2px", fontFamily: "sans-serif" }}>
                {group}
              </p>
              {items.map(item => (
                <div key={item} style={{
                  padding: "4px 12px", fontSize: "11px", fontFamily: "sans-serif",
                  color: item === "Dashboard" ? "white" : "rgba(255,255,255,0.38)",
                  background: item === "Dashboard" ? "rgba(216,90,48,0.13)" : "transparent",
                  borderLeft: item === "Dashboard" ? `2px solid ${EMBER}` : "2px solid transparent",
                }}>
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Main area */}
        <div style={{ flex: 1, background: "#F4F0EA", padding: "14px", overflow: "hidden", display: "flex", flexDirection: "column", gap: "9px" }}>

          {/* Page header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: "15px", fontWeight: 700, color: DARK, fontFamily: "sans-serif", lineHeight: 1.2 }}>Good morning, Sarah</p>
              <p style={{ fontSize: "9px", color: MUTED, fontFamily: "sans-serif", marginTop: "1px" }}>Tuesday, April 14 · Ember Table</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "white", border: `0.5px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2.2" strokeLinecap="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#8B6553", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "8px", fontWeight: 700, color: "white", fontFamily: "sans-serif" }}>SC</span>
              </div>
            </div>
          </div>

          {/* KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "7px" }}>
            {([
              { label: "Today's Reservations", value: "2",      sub: "1 upcoming",        accent: "#1E40AF" },
              { label: "Today's Revenue",       value: "$0",     sub: "from transactions", accent: "#166534" },
              { label: "Overdue Invoices",       value: "2",      sub: "$839 outstanding",  accent: "#991B1B" },
              { label: "Pending Receivables",    value: "$1,799", sub: "3 invoices",        accent: "#92400E" },
            ] as const).map(({ label, value, sub, accent }) => (
              <div key={label} style={{ background: "white", border: `0.5px solid ${BORDER}`, borderRadius: "7px", padding: "9px" }}>
                <p style={{ fontSize: "7px", color: MUTED, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "sans-serif", marginBottom: "5px", lineHeight: 1.3 }}>{label}</p>
                <p style={{ fontSize: "18px", fontFamily: "Georgia, serif", color: accent, fontWeight: 500, lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: "8px", color: MUTED, marginTop: "3px", fontFamily: "sans-serif" }}>{sub}</p>
              </div>
            ))}
          </div>

          {/* MCP + Feedback row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px" }}>
            <div style={{ background: "white", border: `0.5px solid ${BORDER}`, borderRadius: "7px", padding: "9px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <p style={{ fontSize: "9px", fontWeight: 600, color: DARK, fontFamily: "sans-serif" }}>MCP bridge & connectors</p>
                <span style={{ fontSize: "7px", background: "#FEF9C3", color: "#854D0E", padding: "1px 5px", borderRadius: "3px", fontFamily: "sans-serif" }}>connector error</span>
              </div>
              <p style={{ fontSize: "8px", color: MUTED, marginBottom: "5px", fontFamily: "sans-serif" }}>4 connectors linked</p>
              {(["Gmail","Google Reviews","OpenTable","Square POS"] as const).map((c, i) => (
                <div key={c} style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", marginBottom: "2px", fontFamily: "sans-serif" }}>
                  <span style={{ color: DARK }}>{c}</span>
                  <span style={{ color: i === 0 ? "#991B1B" : "#166534" }}>{i === 0 ? "error" : "connected"}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "white", border: `0.5px solid ${BORDER}`, borderRadius: "7px", padding: "9px" }}>
              <p style={{ fontSize: "9px", fontWeight: 600, color: DARK, fontFamily: "sans-serif", marginBottom: "6px" }}>Feedback & recovery</p>
              <p style={{ fontSize: "8px", color: MUTED, fontFamily: "sans-serif", marginBottom: "4px" }}>Flagged reviews and guest recovery drafts.</p>
              {[
                { name: "Priya Nair", detail: "score 2, allergy incident (needs owner follow-up)", urgent: true },
                { name: "Google review", detail: "follow-up still pending on prior complaint", urgent: false },
              ].map(({ name, detail, urgent }) => (
                <p key={name} style={{ fontSize: "8px", fontFamily: "sans-serif", marginBottom: "3px", lineHeight: 1.4 }}>
                  <span style={{ color: urgent ? "#991B1B" : DARK, fontWeight: 600 }}>• {name}</span>
                  <span style={{ color: MUTED }}> — {detail}</span>
                </p>
              ))}
              <p style={{ fontSize: "8px", color: EMBER, marginTop: "6px", fontFamily: "sans-serif" }}>Open feedback queue →</p>
            </div>
          </div>

          {/* AI Briefing + Recent Activity */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px" }}>
            <div style={{ background: "white", border: `0.5px solid ${BORDER}`, borderRadius: "7px", padding: "9px" }}>
              <p style={{ fontSize: "8px", fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px", fontFamily: "sans-serif" }}>AI MANAGER BRIEFING</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                <p style={{ fontSize: "9px", fontWeight: 600, color: DARK, fontFamily: "sans-serif" }}>2 overdue invoice(s) — collections focus</p>
                <span style={{ fontSize: "7px", background: "#FEE2E2", color: "#991B1B", padding: "1px 5px", borderRadius: "3px", flexShrink: 0, fontFamily: "sans-serif" }}>URGENT</span>
              </div>
              {["Revenue this week: $14,435", "Pending receivables: $1,798.50", "Net cash flow (week): $11,027"].map(l => (
                <p key={l} style={{ fontSize: "8px", color: MUTED, marginBottom: "2px", fontFamily: "sans-serif" }}>• {l}</p>
              ))}
            </div>
            <div style={{ background: "white", border: `0.5px solid ${BORDER}`, borderRadius: "7px", padding: "9px" }}>
              <p style={{ fontSize: "8px", fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px", fontFamily: "sans-serif" }}>RECENT AI ACTIVITY</p>
              {([
                { badge: "Customer Service", text: "INV-2025-002 overdue — Priya Nair $94.95", bc: "#1E40AF", bb: "#DBEAFE" },
                { badge: "Performance",      text: "End of day performance summary — Apr 11",  bc: "#166534", bb: "#DCFCE7" },
                { badge: "Marketing",        text: "Sofia Morales has not returned in 45 days", bc: "#7C3AED", bb: "#EDE9FE" },
              ] as const).map(({ badge, text, bc, bb }) => (
                <div key={text} style={{ marginBottom: "6px" }}>
                  <span style={{ fontSize: "7px", color: bc, background: bb, padding: "1px 5px", borderRadius: "3px", fontFamily: "sans-serif" }}>{badge}</span>
                  <p style={{ fontSize: "8px", color: DARK, fontFamily: "sans-serif", lineHeight: 1.4, marginTop: "2px" }}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Finance bar chart (SVG) ───────────────────────────────────────────────────

function FinanceBarChart() {
  // Real weekly data: Wed $118.58, Fri $181.22, Sat $522.39
  const days = [
    { label: "Mon", val: 0 },
    { label: "Tue", val: 0 },
    { label: "Wed", val: 118.58 },
    { label: "Thu", val: 0 },
    { label: "Fri", val: 181.22 },
    { label: "Sat", val: 522.39 },
    { label: "Sun", val: 0 },
  ]
  const max = 522.39
  const H = 56   // chart height
  const W = 36   // slot width per day

  return (
    <div>
      <svg width={days.length * W} height={H + 18} style={{ display: "block" }}>
        {days.map(({ label, val }, i) => {
          const barH = val > 0 ? Math.max(3, (val / max) * H) : 2
          const x = i * W + 6
          const bw = W - 12
          return (
            <g key={label}>
              <rect
                x={x} y={H - barH} width={bw} height={barH}
                rx="3" fill={val > 0 ? EMBER : "#E5DDD5"}
                opacity={val === max ? 1 : val > 0 ? 0.65 : 0.4}
              />
              <text x={x + bw / 2} y={H + 13} textAnchor="middle" fontSize="8" fill={MUTED} fontFamily="sans-serif">
                {label}
              </text>
              {val > 0 && (
                <text x={x + bw / 2} y={H - barH - 3} textAnchor="middle" fontSize="7" fill={MUTED} fontFamily="sans-serif">
                  ${val >= 100 ? Math.round(val) : val}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Feature section row helper ────────────────────────────────────────────────

function FeatureRow({ mock, text, flip = false }: {
  mock: React.ReactNode
  text: React.ReactNode
  flip?: boolean
}) {
  return (
    <div style={{
      maxWidth: "900px", margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "4rem",
      alignItems: "center",
    }}>
      {flip ? <>{text}{mock}</> : <>{mock}{text}</>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <style>{`html { scroll-behavior: smooth; }`}</style>
      <div style={{ background: BASE, color: DARK, fontFamily: "sans-serif" }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(250,250,248,0.92)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: `0.5px solid ${BORDER}`,
          padding: "0 5rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", height: "56px", gap: "2rem" }}>
            <Link href="/" style={{ fontSize: "15px", fontWeight: 700, color: DARK, textDecoration: "none", letterSpacing: "-0.03em" }}>
              Ops·Pilot
            </Link>
            <nav style={{ display: "flex", gap: "1.5rem", flex: 1 }}>
              <a href="#features" style={{ fontSize: "13px", color: MUTED, textDecoration: "none" }}>Features</a>
              <a href="#features" style={{ fontSize: "13px", color: EMBER, textDecoration: "none", fontWeight: 500 }}>Tour the product</a>
            </nav>
            <Link href="/dashboard" style={{
              fontSize: "12px", fontWeight: 600, color: "white",
              background: DARK, padding: "7px 18px", borderRadius: "6px", textDecoration: "none",
            }}>
              Open Dashboard
            </Link>
          </div>
        </header>

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section style={{ padding: "5rem 5rem 4rem", display: "flex", alignItems: "center", gap: "4rem", minHeight: "88vh" }}>
          <div style={{ flex: "0 0 360px" }}>
            <p style={{ fontSize: "11px", color: EMBER, textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: "1.5rem" }}>
              Restaurant operations, simplified
            </p>
            <h1 style={{ fontSize: "54px", fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, lineHeight: 1.05, color: DARK, marginBottom: "1.25rem" }}>
              Your restaurant.<br />One place.<br />Finally.
            </h1>
            <p style={{ fontSize: "15px", color: MUTED, lineHeight: 1.75, marginBottom: "2rem", maxWidth: "320px" }}>
              OpsPilot connects your reservations, invoices, guest feedback, and finances — and tells you what to do about it.
            </p>
            <div style={{ display: "flex", gap: "10px", marginBottom: "2.5rem" }}>
              <Link href="/dashboard" style={{ display: "inline-block", background: EMBER, color: "white", padding: "11px 26px", borderRadius: "7px", fontSize: "14px", fontWeight: 500, textDecoration: "none" }}>
                Open OpsPilot
              </Link>
              <a href="#features" style={{ display: "inline-block", border: `1px solid ${BORDER}`, color: MUTED, padding: "11px 26px", borderRadius: "7px", fontSize: "14px", fontWeight: 500, textDecoration: "none" }}>
                Learn more
              </a>
            </div>
            <div style={{ display: "flex", gap: "1.5rem" }}>
              {(["No credit card","Demo data included","Setup in 5 min"] as const).map(t => (
                <p key={t} style={{ fontSize: "11px", color: MUTED }}>✓ {t}</p>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <DashboardMock />
          </div>
        </section>

        <SectionDivider />

        {/* ── Pain-point stats ─────────────────────────────────────────────── */}
        <section style={{ padding: "3.5rem 5rem", background: "#F4F0EA" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "3rem" }}>
            {([
              { num: "6",    body: "tools the average restaurant owner uses just to manage one day" },
              { num: "$340", body: "in uncollected invoices the average week — because follow-ups slip" },
              { num: "1",    body: "platform that handles all of it, automatically, before you open the doors" },
            ] as const).map(({ num, body }) => (
              <div key={num}>
                <p style={{ fontSize: "48px", fontFamily: "Georgia, serif", color: EMBER, marginBottom: "8px", lineHeight: 1 }}>{num}</p>
                <p style={{ fontSize: "13px", color: MUTED, lineHeight: 1.65 }}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        <SectionDivider />

        {/* ── Features ────────────────────────────────────────────────────── */}
        <section id="features" style={{ padding: "5rem", background: BASE }}>

          {/* ── Reservations ── */}
          <FeatureRow
            mock={
              <MockCard title="RESERVATIONS · 12 TOTAL">
                {/* AI assistant strip */}
                <div style={{ background: "#F4F0EA", border: `0.5px solid ${BORDER}`, borderRadius: "6px", padding: "8px 10px", marginBottom: "10px", display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ fontSize: "9px", color: EMBER, fontFamily: "sans-serif", flexShrink: 0 }}>AI</span>
                  <p style={{ fontSize: "10px", color: MUTED, fontStyle: "italic", fontFamily: "sans-serif" }}>"Book a table for 4 this Saturday at 7pm"</p>
                </div>
                {([
                  { name: "Marcus Webb",  covers: 2, time: "7:00 PM", status: "Completed", dot: "#22c55e", col: "#166534", bg: "#DCFCE7" },
                  { name: "Priya Nair",   covers: 4, time: "2:00 PM", status: "Confirmed", dot: "#3B82F6", col: "#1E40AF", bg: "#DBEAFE" },
                  { name: "Daniel Kim",   covers: 4, time: "8:00 PM", status: "Confirmed", dot: "#3B82F6", col: "#1E40AF", bg: "#DBEAFE" },
                  { name: "Rachel Tran",  covers: 2, time: "3:00 PM", status: "Completed", dot: "#22c55e", col: "#166534", bg: "#DCFCE7" },
                ] as const).map((row, i, arr) => (
                  <div key={row.name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 0", borderBottom: i < arr.length - 1 ? `0.5px solid ${BORDER}` : undefined }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: row.dot, flexShrink: 0, display: "inline-block" }} />
                    <span style={{ fontSize: "12px", color: DARK, flex: 1, fontFamily: "sans-serif" }}>{row.name}</span>
                    <span style={{ fontSize: "10px", color: MUTED }}>{row.covers} covers</span>
                    <span style={{ fontSize: "10px", color: MUTED, marginLeft: "8px" }}>{row.time}</span>
                    <span style={{ fontSize: "10px", color: row.col, background: row.bg, padding: "2px 7px", borderRadius: "100px", marginLeft: "6px" }}>{row.status}</span>
                  </div>
                ))}
                <AiHint label="AI · Invoice generated on completion" text="INV-2025-003 created for Daniel Kim — Chef Tasting Menu ×4, Wine Pairing ×4 → $522.39" />
              </MockCard>
            }
            text={
              <FeatureText
                eyebrow="Reservations"
                heading={<>Smart bookings,<br />zero manual work.</>}
                body={`Type a request in plain English — "book a table for 4 this Saturday at 7pm" — and OpsPilot handles the rest. Conflict checks, confirmations, reminders, and follow-ups are all automatic. Complete a reservation and an invoice is generated instantly.`}
                pill="AI-powered booking assistant"
              />
            }
          />

          <div style={{ height: "0.5px", background: BORDER, maxWidth: "900px", margin: "4.5rem auto" }} />

          {/* ── Workflow ── */}
          <FeatureRow
            flip
            mock={
              <MockCard title="AI WORKFLOW · LAST 24 HOURS">
                {([
                  { agent: "Customer Service", agentCol: "#1E40AF", agentBg: "#DBEAFE", action: "send_reminder",        text: "INV-2025-002 overdue — Priya Nair $94.95",        status: "executed" },
                  { agent: "Performance",      agentCol: "#166534", agentBg: "#DCFCE7", action: "daily_summary",        text: "End of day performance summary — Apr 11",          status: "executed" },
                  { agent: "Marketing",        agentCol: "#7C3AED", agentBg: "#EDE9FE", action: "draft_return_nudge",   text: "Sofia Morales has not returned in 45 days",         status: "executed" },
                  { agent: "Inventory",        agentCol: "#92400E", agentBg: "#FEF3C7", action: "reorder_alert",        text: "Wagyu Ribeye at 4 portions, below reorder level",   status: "executed" },
                  { agent: "Customer Service", agentCol: "#1E40AF", agentBg: "#DBEAFE", action: "flag_and_draft",       text: "Priya Nair left score 2, allergy incident",         status: "executed" },
                ] as const).map(({ agent, agentCol, agentBg, action, text }, i, arr) => (
                  <div key={i} style={{ display: "flex", gap: "10px", paddingBottom: i < arr.length - 1 ? "10px" : 0, marginBottom: i < arr.length - 1 ? "10px" : 0, borderBottom: i < arr.length - 1 ? `0.5px solid ${BORDER}` : undefined }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", flexShrink: 0, paddingTop: "2px" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: agentCol, display: "inline-block" }} />
                      {i < arr.length - 1 && <span style={{ width: 1, flex: 1, background: BORDER, display: "inline-block" }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                        <span style={{ fontSize: "9px", color: agentCol, background: agentBg, padding: "1px 6px", borderRadius: "3px", fontFamily: "sans-serif" }}>{agent}</span>
                        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                          <span style={{ fontSize: "8px", color: MUTED, fontFamily: "sans-serif" }}>{action}</span>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                        </div>
                      </div>
                      <p style={{ fontSize: "11px", color: DARK, fontFamily: "sans-serif", lineHeight: 1.4 }}>{text}</p>
                    </div>
                  </div>
                ))}
              </MockCard>
            }
            text={
              <FeatureText
                eyebrow="Workflow"
                heading={<>Every AI action,<br />fully visible.</>}
                body="The workflow timeline shows every automated action taken across all four AI agents — Customer Service, Inventory, Marketing, and Performance. You see what ran, what it did, and whether it succeeded. Full audit trail, zero guesswork."
                pill="4 AI agents · live audit log"
              />
            }
          />

          <div style={{ height: "0.5px", background: BORDER, maxWidth: "900px", margin: "4.5rem auto" }} />

          {/* ── Invoices ── */}
          <FeatureRow
            mock={
              <MockCard title="INVOICES · 6 TOTAL">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "6px", marginBottom: "10px" }}>
                  {([
                    { label: "Collected", val: "$822", col: "#166534" },
                    { label: "Overdue",   val: "$382", col: "#991B1B" },
                    { label: "Reminders", val: "3",    col: DARK     },
                  ] as const).map(({ label, val, col }) => (
                    <div key={label} style={{ background: "#F4F0EA", borderRadius: "6px", padding: "7px 9px" }}>
                      <p style={{ fontSize: "8px", color: MUTED, fontFamily: "sans-serif", marginBottom: "2px" }}>{label}</p>
                      <p style={{ fontSize: "16px", fontFamily: "Georgia, serif", color: col }}>{val}</p>
                    </div>
                  ))}
                </div>
                {([
                  { num: "INV-2025-001", name: "Marcus Webb",  amt: "$181.22", status: "Paid",    col: "#166534", bg: "#DCFCE7" },
                  { num: "INV-2025-002", name: "Priya Nair",   amt: "$94.95",  status: "Overdue", col: "#991B1B", bg: "#FEE2E2" },
                  { num: "INV-2025-003", name: "Daniel Kim",   amt: "$522.39", status: "Paid",    col: "#166534", bg: "#DCFCE7" },
                  { num: "INV-2025-005", name: "Tom Okafor",   amt: "$218.81", status: "Overdue", col: "#991B1B", bg: "#FEE2E2" },
                ] as const).map((row, i, arr) => (
                  <div key={row.num} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 0", borderBottom: i < arr.length - 1 ? `0.5px solid ${BORDER}` : undefined }}>
                    <span style={{ fontSize: "10px", color: MUTED, fontFamily: "sans-serif", flexShrink: 0 }}>{row.num}</span>
                    <span style={{ fontSize: "12px", color: DARK, flex: 1, fontFamily: "sans-serif" }}>{row.name}</span>
                    <span style={{ fontSize: "12px", color: MUTED }}>{row.amt}</span>
                    <span style={{ fontSize: "10px", color: row.col, background: row.bg, padding: "2px 7px", borderRadius: "100px" }}>{row.status}</span>
                  </div>
                ))}
                <AiHint label="AI · Reminder sent — Gentle tone" text="Hi Priya, this is a gentle reminder that INV-2025-002 ($94.95) is now overdue..." />
              </MockCard>
            }
            text={
              <FeatureText
                eyebrow="Invoices"
                heading={<>Invoices that<br />chase themselves.</>}
                body="Auto-generated from completed reservations with full line-item detail — dishes, wine, tax, and tip. AI sends escalating payment reminders: gentle on day one, firm by day three, urgent after a week. Reminder tone adapts to how many times you've already asked."
                pill="Auto-generated · escalating reminders"
              />
            }
          />

          <div style={{ height: "0.5px", background: BORDER, maxWidth: "900px", margin: "4.5rem auto" }} />

          {/* ── Finance ── */}
          <FeatureRow
            flip
            mock={
              <MockCard>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "7px", marginBottom: "14px" }}>
                  {([
                    { label: "Revenue this week",    val: "$822",        col: "#166534" },
                    { label: "Overdue receivables",  val: "$382.02",     col: "#991B1B" },
                    { label: "Expenses this week",   val: "$3,748.50",   col: DARK      },
                    { label: "Net cash flow",         val: "−$2,926.50",  col: "#991B1B" },
                  ] as const).map(({ label, val, col }) => (
                    <div key={label} style={{ background: "#F4F0EA", borderRadius: "6px", padding: "9px" }}>
                      <p style={{ fontSize: "8px", color: MUTED, fontFamily: "sans-serif", marginBottom: "3px" }}>{label}</p>
                      <p style={{ fontSize: "17px", fontFamily: "Georgia, serif", color: col, lineHeight: 1 }}>{val}</p>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: "9px", color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "sans-serif", marginBottom: "8px" }}>WEEKLY REVENUE</p>
                <FinanceBarChart />
                <p style={{ fontSize: "9px", color: MUTED, fontFamily: "sans-serif", marginTop: "12px", marginBottom: "5px" }}>TOP REVENUE ITEMS</p>
                {([
                  { item: "Chef Tasting Menu ×6", amt: "$348" },
                  { item: "Braised Short Rib ×2", amt: "$84"  },
                  { item: "Wagyu Ribeye ×1",       amt: "$68"  },
                ] as const).map(({ item, amt }) => (
                  <div key={item} style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginBottom: "3px", fontFamily: "sans-serif" }}>
                    <span style={{ color: DARK }}>{item}</span>
                    <span style={{ color: "#166534", fontWeight: 600 }}>{amt}</span>
                  </div>
                ))}
              </MockCard>
            }
            text={
              <FeatureText
                eyebrow="Finance"
                heading={<>Cash flow you<br />can act on.</>}
                body="Weekly revenue, expenses by category, invoice aging, and tax write-off tracking — all in one panel. Expense breakdown shows labor at 74% of weekly costs (industry standard: 28–35%) with AI-generated insights flagging exactly where to focus. Bar chart updates each day as invoices are paid."
                pill="Live P&L · tax write-off tracking"
              />
            }
          />

          <div style={{ height: "0.5px", background: BORDER, maxWidth: "900px", margin: "4.5rem auto" }} />

          {/* ── Inventory ── */}
          <FeatureRow
            mock={
              <MockCard title="INVENTORY · STOCK HEALTH">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px", marginBottom: "10px" }}>
                  {([
                    { label: "Low stock",  val: "3", col: "#991B1B" },
                    { label: "Expiring",   val: "2", col: "#854D0E" },
                    { label: "Issues",     val: "1", col: "#7C3AED" },
                    { label: "Healthy",    val: "14",col: "#166534" },
                  ] as const).map(({ label, val, col }) => (
                    <div key={label} style={{ textAlign: "center", background: "#F4F0EA", borderRadius: "6px", padding: "7px 4px" }}>
                      <p style={{ fontSize: "18px", fontFamily: "Georgia, serif", color: col }}>{val}</p>
                      <p style={{ fontSize: "8px", color: MUTED, fontFamily: "sans-serif" }}>{label}</p>
                    </div>
                  ))}
                </div>
                {([
                  { item: "Wagyu Ribeye",      qty: "4 portions", status: "Critical",   col: "#991B1B", bg: "#FEE2E2" },
                  { item: "Braised Short Rib",  qty: "7 portions", status: "Low",        col: "#854D0E", bg: "#FEF3C7" },
                  { item: "Heirloom Beets",     qty: "2.5 kg",     status: "Low",        col: "#854D0E", bg: "#FEF3C7" },
                  { item: "Pan-Seared Duck",    qty: "12 portions", status: "Healthy",   col: "#166534", bg: "#DCFCE7" },
                  { item: "Pinot Noir (bottle)","qty": "6 bottles", status: "Healthy",   col: "#166534", bg: "#DCFCE7" },
                ] as const).map((row, i, arr) => (
                  <div key={row.item} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 0", borderBottom: i < arr.length - 1 ? `0.5px solid ${BORDER}` : undefined }}>
                    <span style={{ fontSize: "12px", color: DARK, flex: 1, fontFamily: "sans-serif" }}>{row.item}</span>
                    <span style={{ fontSize: "10px", color: MUTED }}>{row.qty}</span>
                    <span style={{ fontSize: "10px", color: row.col, background: row.bg, padding: "2px 7px", borderRadius: "100px", marginLeft: "6px" }}>{row.status}</span>
                  </div>
                ))}
                <AiHint label="AI · Reorder alert" text="Wagyu Ribeye at 4 portions — below reorder threshold of 10. Suggested order: 20 portions from Premium Meats Co." />
              </MockCard>
            }
            text={
              <FeatureText
                eyebrow="Inventory"
                heading={<>Know before<br />you run out.</>}
                body="Real-time stock counts across every ingredient, with critical/low/expiring status flags. Wagyu Ribeye hits critical at 4 portions before service. AI surfaces a reorder alert immediately — quantity suggestion, preferred vendor, and cost estimate included. Expiry tracking prevents waste before it happens."
                pill="AI reorder alerts · expiry tracking"
              />
            }
          />

          <div style={{ height: "0.5px", background: BORDER, maxWidth: "900px", margin: "4.5rem auto" }} />

          {/* ── Shipments ── */}
          <FeatureRow
            flip
            mock={
              <MockCard title="PROCUREMENT · INBOUND ORDERS">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "6px", marginBottom: "10px" }}>
                  {([
                    { label: "Arriving today", val: "1" },
                    { label: "In transit",     val: "2" },
                    { label: "Week spend",     val: "$790" },
                  ] as const).map(({ label, val }) => (
                    <div key={label} style={{ background: "#F4F0EA", borderRadius: "6px", padding: "8px 9px" }}>
                      <p style={{ fontSize: "8px", color: MUTED, fontFamily: "sans-serif", marginBottom: "2px" }}>{label}</p>
                      <p style={{ fontSize: "18px", fontFamily: "Georgia, serif", color: DARK }}>{val}</p>
                    </div>
                  ))}
                </div>
                {([
                  { vendor: "Premium Meats Co.",    items: "Wagyu Ribeye ×20, Short Rib ×15", arriving: "Today",  amt: "$284", status: "In Transit",    col: "#1E40AF", bg: "#DBEAFE" },
                  { vendor: "Local Farm Direct",    items: "Heirloom Beets 5kg, Microgreens", arriving: "Apr 15", amt: "$62",  status: "Confirmed",     col: "#166534", bg: "#DCFCE7" },
                  { vendor: "Vine Street Imports",  items: "Pinot Noir ×24, Champagne ×6",   arriving: "Apr 16", amt: "$192", status: "Pending",       col: "#854D0E", bg: "#FEF3C7" },
                ] as const).map((row, i, arr) => (
                  <div key={row.vendor} style={{ padding: "8px 0", borderBottom: i < arr.length - 1 ? `0.5px solid ${BORDER}` : undefined }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: DARK, fontFamily: "sans-serif" }}>{row.vendor}</span>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "#166534", fontWeight: 600, fontFamily: "sans-serif" }}>{row.amt}</span>
                        <span style={{ fontSize: "9px", color: row.col, background: row.bg, padding: "1px 6px", borderRadius: "100px" }}>{row.status}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: "10px", color: MUTED, fontFamily: "sans-serif" }}>{row.items} · Arriving {row.arriving}</p>
                  </div>
                ))}
              </MockCard>
            }
            text={
              <FeatureText
                eyebrow="Shipments"
                heading={<>Every order,<br />tracked to the door.</>}
                body="Procurement tracks every inbound shipment from confirmed order to arrival. See what's in transit from Premium Meats Co., what's arriving today, and what still needs a vendor confirmation. Weekly spend rolls up automatically so you always know what's committed before invoices arrive."
                pill="Inbound tracking · vendor management"
              />
            }
          />

          <div style={{ height: "0.5px", background: BORDER, maxWidth: "900px", margin: "4.5rem auto" }} />

          {/* ── Feedback ── */}
          <FeatureRow
            mock={
              <MockCard title="FEEDBACK · CUSTOMER SERVICE">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px", marginBottom: "12px" }}>
                  {([
                    { label: "Avg rating",  val: "3.2 ★", col: DARK      },
                    { label: "Flagged",     val: "2",      col: "#991B1B" },
                    { label: "Approvals",   val: "1",      col: "#854D0E" },
                    { label: "Happy",       val: "3",      col: "#166534" },
                  ] as const).map(({ label, val, col }) => (
                    <div key={label} style={{ background: "#F4F0EA", borderRadius: "6px", padding: "7px 6px", textAlign: "center" }}>
                      <p style={{ fontSize: "15px", fontFamily: "Georgia, serif", color: col }}>{val}</p>
                      <p style={{ fontSize: "8px", color: MUTED, fontFamily: "sans-serif", marginTop: "1px" }}>{label}</p>
                    </div>
                  ))}
                </div>
                {/* Flagged review */}
                <div style={{ border: "0.5px solid #FCA5A5", borderRadius: "8px", padding: "10px", marginBottom: "8px", background: "#FFF8F8" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: DARK, fontFamily: "sans-serif" }}>Priya Nair</span>
                      <span style={{ fontSize: "10px", color: "#991B1B", fontFamily: "sans-serif" }}>★★☆☆☆ score 2</span>
                    </div>
                    <span style={{ fontSize: "8px", background: "#FEE2E2", color: "#991B1B", padding: "1px 6px", borderRadius: "3px", fontFamily: "sans-serif" }}>SAFETY FLAG · Urgency 5/5</span>
                  </div>
                  <p style={{ fontSize: "10px", fontStyle: "italic", color: MUTED, lineHeight: 1.5, marginBottom: "6px" }}>
                    "Server brought wrong dish despite my nut allergy being on file. I had a reaction."
                  </p>
                  <p style={{ fontSize: "9px", color: MUTED, fontFamily: "sans-serif", marginBottom: "5px" }}>AI-drafted recovery reply ready for approval</p>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <span style={{ fontSize: "10px", background: EMBER, color: "white", padding: "4px 10px", borderRadius: "5px", fontFamily: "sans-serif" }}>Approve & Send</span>
                    <span style={{ fontSize: "10px", border: `0.5px solid ${BORDER}`, color: MUTED, padding: "4px 10px", borderRadius: "5px", fontFamily: "sans-serif" }}>Decline</span>
                  </div>
                </div>
                <AiHint label="AI · Pending return nudge" text="Sofia Morales hasn't visited in 45 days — draft return message awaiting your approval." />
              </MockCard>
            }
            text={
              <FeatureText
                eyebrow="Feedback"
                heading={<>Every complaint<br />resolved before<br />it goes public.</>}
                body="The AI reads every review from every source — internal forms, Google, OpenTable, Yelp. Safety mentions (allergies, illness) are flagged at urgency 5 immediately. Low scores trigger recovery message drafts that you approve before sending. Priya Nair's nut allergy incident surfaces within seconds."
                pill="AI flagging · recovery drafts · approvals"
              />
            }
          />

          <div style={{ height: "0.5px", background: BORDER, maxWidth: "900px", margin: "4.5rem auto" }} />

          {/* ── Integrations ── */}
          <FeatureRow
            flip
            mock={
              <MockCard title="INTEGRATIONS · MCP BRIDGE">
                <div style={{ background: "#F4F0EA", border: `0.5px solid ${BORDER}`, borderRadius: "6px", padding: "9px 11px", marginBottom: "12px" }}>
                  <p style={{ fontSize: "9px", color: MUTED, fontFamily: "sans-serif", lineHeight: 1.6 }}>
                    External tools POST to <span style={{ fontFamily: "monospace", color: DARK, fontSize: "9px" }}>/api/integrations/webhooks/provider</span>. Events are normalized and flow into the same services as the UI.
                  </p>
                </div>
                {([
                  { name: "Gmail",          display: "Email notifications",    status: "error",     last: "Auth expired" },
                  { name: "Google Reviews", display: "Review aggregator",      status: "connected", last: "Apr 12, 8:15 AM" },
                  { name: "OpenTable",      display: "Reservation platform",   status: "connected", last: "Apr 14, 6:02 AM" },
                  { name: "Square POS",     display: "Point of sale",          status: "connected", last: "Apr 14, 7:44 AM" },
                ] as const).map((row, i, arr) => (
                  <div key={row.name} style={{ padding: "9px 0", borderBottom: i < arr.length - 1 ? `0.5px solid ${BORDER}` : undefined }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ fontSize: "12px", fontWeight: 600, color: DARK, fontFamily: "sans-serif" }}>{row.name}</p>
                        <p style={{ fontSize: "10px", color: MUTED, fontFamily: "sans-serif", marginTop: "1px" }}>{row.display}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{
                          fontSize: "9px", fontFamily: "sans-serif",
                          color: row.status === "connected" ? "#166534" : "#991B1B",
                          background: row.status === "connected" ? "#DCFCE7" : "#FEE2E2",
                          padding: "2px 7px", borderRadius: "100px",
                        }}>
                          {row.status}
                        </span>
                        <p style={{ fontSize: "8px", color: MUTED, fontFamily: "sans-serif", marginTop: "3px" }}>{row.last}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </MockCard>
            }
            text={
              <FeatureText
                eyebrow="Integrations"
                heading={<>Your tools,<br />finally talking<br />to each other.</>}
                body="OpsPilot's MCP bridge connects Square POS, OpenTable, Google Reviews, and Gmail through a single webhook endpoint. Events from all sources are normalized and flow into the same reservations, invoices, and feedback pipelines. One connector error is visible immediately — no silent failures."
                pill="MCP bridge · real-time webhooks"
              />
            }
          />

        </section>

        <SectionDivider />

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <section style={{ padding: "5rem", background: DARK, textAlign: "center" }}>
          <h2 style={{ fontSize: "48px", fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, color: "white", lineHeight: 1.1, marginBottom: "1rem" }}>
            Ready to run itself.
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.4)", marginBottom: "2rem" }}>
            Stop managing operations. Start running a restaurant.
          </p>
          <Link href="/dashboard" style={{ display: "inline-block", background: EMBER, color: "white", padding: "13px 32px", borderRadius: "8px", fontSize: "14px", fontWeight: 500, textDecoration: "none" }}>
            Open OpsPilot →
          </Link>
        </section>

      </div>
    </>
  )
}
