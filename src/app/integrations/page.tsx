import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { listConnectors } from "@/lib/services/integrations"
import { isSupabaseConfigured } from "@/lib/env"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CONNECTOR_STATUS_LABEL } from "@/lib/constants/enums"
import type { ConnectorStatus } from "@/lib/constants/enums"
import { CheckCircle2, XCircle, MinusCircle, Plug } from "lucide-react"
import { Fragment } from "react"

function statusIcon(status: ConnectorStatus) {
  if (status === "connected") return <CheckCircle2 className="h-4 w-4 text-green-500" />
  if (status === "error")     return <XCircle       className="h-4 w-4 text-red-500" />
  return                              <MinusCircle   className="h-4 w-4 text-zinc-400" />
}

function getErrorString(value: unknown): string {
  if (value == null) return "Unknown error"
  if (typeof value === "string") return value
  return String(value)
}

function ConnectorCard({ connector }: { connector: Record<string, unknown> }) {
  const status = connector.status as ConnectorStatus
  const lastError = getErrorString(connector.last_error)
  const showError = Boolean(connector.last_error && lastError)

  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        {statusIcon(status)}
        <div>
          <p className="text-sm font-medium text-foreground">{connector.display_name as string}</p>
          <p className="text-xs text-muted-foreground">
            {connector.last_sync_at
              ? `Last sync: ${new Date(connector.last_sync_at as string).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
              : "Never synced"}
          </p>
        </div>
      </div>
      <div className="text-right">
        <span className={`text-xs font-medium ${
          status === "connected" ? "text-green-600" :
          status === "error"     ? "text-red-600" :
          "text-zinc-500"
        }`}>
          {CONNECTOR_STATUS_LABEL[status]}
        </span>
        {showError && (
          <p className="text-[10px] text-red-500 mt-0.5 max-w-xs text-right">
            {lastError}
          </p>
        )}
      </div>
    </div>
  )
}

export default async function IntegrationsPage() {
  let connectors: Record<string, unknown>[] = []

  if (isSupabaseConfigured()) {
    const client = createServerSupabaseClient()
    connectors   = await listConnectors(client, DEMO_ORG_ID).catch(() => []) as Record<string, unknown>[]
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          MCP bridge connectors — external data sources normalised into OpsPilot
        </p>
      </div>

      {/* MCP concept banner */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-4 text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground text-sm">How the MCP bridge works</p>
          <p>
            External tools (OpenTable, Square, Google Reviews) send events to{" "}
            <code className="font-mono text-xs bg-muted px-1 rounded">POST /api/integrations/webhooks/:provider</code>.
            OpsPilot validates, normalises, and routes each event through the same
            deterministic service layer used by the UI — never bypassing invoice or finance truth.
          </p>
        </CardContent>
      </Card>

      {/* Connector list */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Connectors</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {connectors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isSupabaseConfigured()
                ? "No connectors found. Run the seed to populate demo connectors."
                : "Supabase not configured — connect a project to see connectors."}
            </p>
          ) : (
            <div className="space-y-3">
              {connectors.map((c) => (
                <Fragment key={c.id as string}>
                  <ConnectorCard connector={c} />
                </Fragment>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook test hint */}
      <Card className="border-dashed">
        <CardContent className="pt-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground text-sm mb-1">Test the MCP bridge locally</p>
          <pre className="bg-muted rounded p-3 overflow-x-auto text-[11px]">{`curl -X POST http://localhost:3000/api/integrations/webhooks/square \\
  -H "Content-Type: application/json" \\
  -d '{"externalEventId":"sq_evt_001","eventType":"payment.completed","data":{"amount":207.10}}'`}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
