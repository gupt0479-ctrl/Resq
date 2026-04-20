import { Fragment } from "react"
import { AlertTriangle, CheckCircle2, MinusCircle, Plug, XCircle } from "lucide-react"
import { redirect } from "next/navigation"
import { getUserOrg } from "@/lib/auth/get-user-org"
import { getLedgerSchemaHealth } from "@/lib/db/ledger-schema"
import { isDatabaseConfigured } from "@/lib/env"
import { CONNECTOR_STATUS_LABEL } from "@/lib/constants/enums"
import type { ConnectorStatus } from "@/lib/constants/enums"
import { listConnectors } from "@/lib/services/integrations"
import { healthCheck } from "@/lib/tinyfish/client"
import { ClearConnectorErrorButton } from "@/components/integrations/clear-connector-error-button"
import { LedgerSchemaBanner } from "@/components/ops/ledger-schema-banner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

function statusIcon(status: ConnectorStatus) {
  if (status === "connected") return <CheckCircle2 className="h-4 w-4 text-green-500" />
  if (status === "error") return <XCircle className="h-4 w-4 text-red-500" />
  return <MinusCircle className="h-4 w-4 text-zinc-400" />
}

function modeTone(mode: string) {
  switch (mode) {
    case "live":
      return "border-emerald-200 bg-emerald-50 text-emerald-800"
    case "misconfigured":
      return "border-amber-200 bg-amber-50 text-amber-800"
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700"
  }
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
    <div className="border-b border-border py-2 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {statusIcon(status)}
          <div>
            <p className="text-sm font-medium text-foreground">{connector.display_name as string}</p>
            <p className="text-xs text-muted-foreground">
              {connector.last_sync_at
                ? `Last sync: ${new Date(connector.last_sync_at as string).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}`
                : "Never synced"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className={`text-xs font-medium ${
            status === "connected"
              ? "text-green-600"
              : status === "error"
                ? "text-red-600"
                : "text-zinc-500"
          }`}>
            {CONNECTOR_STATUS_LABEL[status]}
          </span>
          {showError ? (
            <>
              <p className="mt-0.5 max-w-xs text-right text-[10px] text-red-500">{lastError}</p>
              <ClearConnectorErrorButton provider={provider} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default async function IntegrationsPage() {
  const ctx = await getUserOrg()
  if (!ctx) redirect("/login")

  const tinyfish = await healthCheck()
  let connectors: Record<string, unknown>[] = []
  let connectorsLoadError: string | null = null

  if (isDatabaseConfigured()) {
    const schema = await getLedgerSchemaHealth()
    if (!schema.ok) {
      return <LedgerSchemaBanner message={schema.message} />
    }
    try {
      connectors = (await listConnectors(ctx.organizationId)) as unknown as Record<string, unknown>[]
    } catch (err: unknown) {
      connectorsLoadError = err instanceof Error ? err.message : String(err)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Integrations & System Truth</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Live dependency status, deterministic connector health, and the safety rails behind the rescue demo.
        </p>
      </div>

      <Card className={`border ${modeTone(tinyfish.mode)}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <CardTitle className="text-sm font-semibold">TinyFish runtime</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-current/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">
              {tinyfish.mode}
            </span>
          </div>
          <p>{tinyfish.details ?? "No TinyFish status details available."}</p>
          {tinyfish.warning ? (
            <p className="rounded-md border border-current/20 bg-white/40 px-3 py-2 text-[12px]">
              {tinyfish.warning}
            </p>
          ) : null}
          <p className="text-xs opacity-80">
            Financing scout is the only required live external lane. This card reports configuration state only; degraded-from-live truth shows up on executed runs and in the workflow timeline.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="space-y-1 pt-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Why this page matters</p>
          <p>
            PostgreSQL and deterministic services remain the source of truth. TinyFish is the external
            investigation layer. If live dependencies degrade, the demo still works through mock fixtures and an auditable warning path.
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
            <p className="whitespace-pre-wrap rounded-md border border-red-200 bg-red-50/50 p-3 font-mono text-xs text-red-800">
              {connectorsLoadError}
            </p>
          ) : connectors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isDatabaseConfigured()
                ? "No connectors found for this organization. Seed the database with the provided SQL scripts or register connectors via webhooks."
                : "DATABASE_URL not configured — connect a PostgreSQL database to load connectors."}
            </p>
          ) : (
            <div className="space-y-3">
              {connectors.map((connector) => (
                <Fragment key={connector.id as string}>
                  <ConnectorRow connector={connector} />
                </Fragment>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="pt-4 text-xs text-muted-foreground">
          <p className="mb-1 text-sm font-medium text-foreground">Local demo checks</p>
          <p className="mb-3">
            Use these probes before demo time. They align with the actual hackathon story more directly than generic webhook tests.
          </p>
          <pre className="overflow-x-auto rounded bg-muted p-3 text-[11px]">{`curl -s http://localhost:3000/api/tinyfish/health | jq

curl -s -X POST http://localhost:3000/api/tinyfish/demo-run \\
  -H "Content-Type: application/json" \\
  -d '{"scenario":"financing"}' | jq

curl -s -X POST http://localhost:3000/api/tinyfish/demo-run \\
  -H "Content-Type: application/json" \\
  -d '{"scenario":"full_survival_scan"}' | jq`}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
