import { createServerSupabaseClient, DEMO_ORG_ID } from "@/lib/db/supabase-server"
import { getLedgerSchemaHealth } from "@/lib/db/ledger-schema"
import { listConnectors } from "@/lib/services/integrations"
import { isSupabaseConfigured } from "@/lib/env"
import { LedgerSchemaBanner } from "@/components/ops/ledger-schema-banner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CONNECTOR_STATUS_LABEL } from "@/lib/constants/enums"
import type { ConnectorStatus } from "@/lib/constants/enums"
import { CheckCircle2, XCircle, MinusCircle, Plug } from "lucide-react"
import { Fragment } from "react"
import { ClearConnectorErrorButton } from "@/components/integrations/clear-connector-error-button"

export const dynamic = "force-dynamic"

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
  const provider = connector.provider as string

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
          <>
            <p className="text-[10px] text-red-500 mt-0.5 max-w-xs text-right">
              {lastError}
            </p>
            <ClearConnectorErrorButton provider={provider} />
          </>
        )}
      </div>
    </div>
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          MCP bridge connectors — external systems normalised into the same deterministic OpsPilot workflow used by the UI
        </p>
      </div>

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-4 text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground text-sm">How the MCP bridge works</p>
          <p>
            External tools (OpenTable, Square, Google Reviews) send events to{" "}
            <code className="font-mono text-xs bg-muted px-1 rounded">POST /api/integrations/webhooks/:provider</code>.
            OpsPilot validates, normalises, and routes each event through the same
            deterministic service layer used by the UI — never bypassing invoice or finance truth.
            Mutating events (<code className="font-mono text-xs">reservation.completed</code>,{" "}
            <code className="font-mono text-xs">invoice.sent</code>,{" "}
            <code className="font-mono text-xs">invoice.paid</code>,{" "}
            <code className="font-mono text-xs">feedback.received</code>) require{" "}
            <code className="font-mono text-xs">externalEventId</code> for deduplication. Production requires{" "}
            <code className="font-mono text-xs">INTEGRATIONS_WEBHOOK_SECRET</code>; under{" "}
            <code className="font-mono text-xs">next dev</code> with no secret, unsigned test POSTs are allowed (set the
            secret or <code className="font-mono text-xs">INTEGRATIONS_WEBHOOK_ALLOW_UNSIGNED=false</code> to enforce
            signing in dev).
          </p>
          <p>
            Connector errors shown below come from persisted bridge state (`status`, `last_sync_at`, `last_error`). The
            demo-safe reset action only clears the local error marker so you can rehearse the happy path without faking
            OAuth or changing provider config.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Connectors</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {connectorsLoadError ? (
            <p className="text-xs font-mono text-red-800 whitespace-pre-wrap rounded-md border border-red-200 bg-red-50/50 p-3">
              {connectorsLoadError}
            </p>
          ) : connectors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isSupabaseConfigured()
                ? "No connectors found for this organization. Run supabase/seed.sql (demo org) or register connectors via webhooks."
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
          <p className="mb-3">
            This example exercises a supported review-ingest path and creates a replay-safe sync event because it includes
            both <code className="rounded bg-muted px-1">externalEventId</code> and a valid review score.
          </p>
          <pre className="bg-muted rounded p-3 overflow-x-auto text-[11px]">{`curl -X POST http://localhost:3000/api/integrations/webhooks/google_reviews \\
  -H "Content-Type: application/json" \\
  -H "x-webhook-secret: $INTEGRATIONS_WEBHOOK_SECRET" \\
  -d '{"externalEventId":"google_evt_001","eventType":"feedback.received","data":{"score":2,"guestName":"Priya Nair","comment":"Slow seating and cold bread.","source":"google"}}'`}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
