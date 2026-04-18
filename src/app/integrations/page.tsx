import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { getLedgerSchemaHealth } from "@/lib/db/ledger-schema"
import { listConnectors } from "@/lib/services/integrations"
import { isSupabaseConfigured } from "@/lib/env"
import { LedgerSchemaBanner } from "@/components/ops/ledger-schema-banner"
import { CONNECTOR_STATUS_LABEL } from "@/lib/constants/enums"
import type { ConnectorStatus } from "@/lib/constants/enums"
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react"
import { Fragment } from "react"
import { ClearConnectorErrorButton } from "@/components/integrations/clear-connector-error-button"

export const dynamic = "force-dynamic"

function statusDot(status: ConnectorStatus) {
  if (status === "connected") return <span className="h-1.5 w-1.5 rounded-full bg-teal shrink-0" />
  if (status === "error")     return <span className="h-1.5 w-1.5 rounded-full bg-crimson shrink-0" />
  return                              <span className="h-1.5 w-1.5 rounded-full bg-steel shrink-0" />
}

function statusIcon(status: ConnectorStatus) {
  if (status === "connected") return <CheckCircle2 className="h-4 w-4 text-teal" />
  if (status === "error")     return <XCircle       className="h-4 w-4 text-crimson" />
  return                              <MinusCircle   className="h-4 w-4 text-steel" />
}

function getErrorString(value: unknown): string {
  if (value == null) return "Unknown error"
  if (typeof value === "string") return value
  return String(value)
}

function ConnectorRow({ connector }: { connector: Record<string, unknown> }) {
  const status    = connector.status as ConnectorStatus
  const lastError = getErrorString(connector.last_error)
  const showError = Boolean(connector.last_error && lastError)
  const provider  = connector.provider as string

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        {statusIcon(status)}
        <div>
          <p className="text-[13.5px] font-medium">{connector.display_name as string}</p>
          <p className="text-[11.5px] text-steel">
            {connector.last_sync_at
              ? `Last sync: ${new Date(connector.last_sync_at as string).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
              : "Never synced"}
          </p>
        </div>
      </div>
      <div className="text-right">
        <span className={`text-[12px] font-medium ${
          status === "connected" ? "text-teal" :
          status === "error"     ? "text-crimson" :
          "text-steel"
        }`}>
          {CONNECTOR_STATUS_LABEL[status]}
        </span>
        {showError && (
          <>
            <p className="text-[10px] text-crimson mt-0.5 max-w-xs text-right">{lastError}</p>
            <ClearConnectorErrorButton provider={provider} />
          </>
        )}
      </div>
    </div>
  )
}

const MCP_NODES = [
  { id: "opspilot", label: "OpsPilot", x: 200, y: 120, primary: true },
  { id: "stripe",   label: "Stripe",   x: 60,  y: 40 },
  { id: "gmail",    label: "Gmail",    x: 340, y: 40 },
  { id: "supabase", label: "Supabase", x: 60,  y: 200 },
  { id: "tinyfish", label: "TinyFish", x: 340, y: 200 },
]

const MCP_EDGES = [
  ["opspilot", "stripe"],
  ["opspilot", "gmail"],
  ["opspilot", "supabase"],
  ["opspilot", "tinyfish"],
]

function McpGraph() {
  const nodeMap = Object.fromEntries(MCP_NODES.map(n => [n.id, n]))
  return (
    <svg viewBox="0 30 400 200" className="w-full max-w-sm mx-auto" aria-hidden="true">
      {MCP_EDGES.map(([a, b]) => {
        const na = nodeMap[a], nb = nodeMap[b]
        return (
          <line key={`${a}-${b}`}
            x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
            stroke="hsl(220 13% 91%)" strokeWidth="1.5" strokeDasharray="4 3"
          />
        )
      })}
      {MCP_NODES.map(n => (
        <g key={n.id} transform={`translate(${n.x},${n.y})`}>
          <circle r={n.primary ? 22 : 16} fill={n.primary ? "hsl(0 0% 10%)" : "white"} stroke="hsl(220 13% 91%)" strokeWidth="1.5" />
          <text textAnchor="middle" dy="4" fontSize={n.primary ? 8 : 7} fill={n.primary ? "white" : "hsl(0 0% 10%)"} fontFamily="Inter, sans-serif" fontWeight="600">
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

export default async function IntegrationsPage() {
  let connectors: Record<string, unknown>[] = []
  let connectorsLoadError: string | null = null

  if (isSupabaseConfigured()) {
    const client = createServerSupabaseClient()
    const schema = await getLedgerSchemaHealth(client)
    if (!schema.ok) {
      return <LedgerSchemaBanner message={schema.message} />
    }
    try {
      connectors = (await listConnectors(client, DEMO_ORG_ID)) as Record<string, unknown>[]
    } catch (err: unknown) {
      connectorsLoadError = err instanceof Error ? err.message : String(err)
    }
  }

  return (
    <div className="p-8 lg:p-10 max-w-[1280px] mx-auto">
      {/* Page header */}
      <div className="mb-10">
        <div className="text-[11px] uppercase tracking-[0.18em] text-steel">Systems · MCP bridge</div>
        <h1 className="font-display text-2xl lg:text-3xl mt-1">Integrations</h1>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: MCP graph + agent health */}
        <div className="lg:col-span-5 space-y-6">
          <div className="card-elevated p-6">
            <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-4">MCP Bridge</div>
            <McpGraph />
            <p className="text-[11.5px] text-steel mt-4 text-center leading-relaxed">
              External tools send events to OpsPilot via MCP. The agent validates, normalises, and routes each event through the deterministic service layer.
            </p>
          </div>

          {/* System health */}
          <div className="card-elevated p-6">
            <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-4">System health</div>
            <div className="space-y-3">
              {[
                { label: "TinyFish Browser",  status: process.env.TINYFISH_API_KEY ? "connected" : "disconnected" },
                { label: "Stripe Payments",   status: process.env.STRIPE_SECRET_KEY ? "connected" : "disconnected" },
                { label: "Supabase Database", status: isSupabaseConfigured() ? "connected" : "disconnected" },
                { label: "Gmail / SMTP",      status: "disconnected" },
              ].map(({ label, status }) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {statusDot(status as ConnectorStatus)}
                    <span className="text-[12.5px]">{label}</span>
                  </div>
                  <span className={`text-[11px] ${status === "connected" ? "text-teal" : status === "error" ? "text-crimson" : "text-steel"}`}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: connectors + webhook docs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="card-elevated p-6">
            <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-4">Connectors</div>
            {connectorsLoadError ? (
              <pre className="text-[11px] font-mono text-crimson whitespace-pre-wrap rounded-md border border-crimson/20 bg-crimson/5 p-3">
                {connectorsLoadError}
              </pre>
            ) : connectors.length === 0 ? (
              <p className="text-[12.5px] text-steel">
                {isSupabaseConfigured()
                  ? "No connectors found for this organization. Run supabase/seed.sql (demo org) or register connectors via webhooks."
                  : "Supabase not configured — connect a project to see connectors."}
              </p>
            ) : (
              <div>
                {connectors.map((c) => (
                  <Fragment key={c.id as string}>
                    <ConnectorRow connector={c} />
                  </Fragment>
                ))}
              </div>
            )}
          </div>

          <div className="card-elevated p-6">
            <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-3">How the MCP bridge works</div>
            <p className="text-[12.5px] text-steel leading-relaxed mb-4">
              External tools send events to{" "}
              <code className="font-mono text-[11px] bg-surface-muted px-1 rounded">POST /api/integrations/webhooks/:provider</code>.
              OpsPilot validates, normalises, and routes each event through the same deterministic service layer used by the UI — never bypassing invoice or finance truth.
            </p>

            <div className="text-[10px] uppercase tracking-[0.18em] text-steel mb-2">Test locally</div>
            <pre className="bg-surface-muted rounded-md p-3 overflow-x-auto text-[11px] font-mono text-steel">{`curl -X POST http://localhost:3000/api/integrations/webhooks/google_reviews \\
  -H "Content-Type: application/json" \\
  -H "x-webhook-secret: $INTEGRATIONS_WEBHOOK_SECRET" \\
  -d '{"externalEventId":"google_evt_001","eventType":"feedback.received","data":{"score":2,"guestName":"Priya Nair","comment":"Slow seating.","source":"google"}}'`}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}
