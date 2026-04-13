import "server-only"

type LogLevel = "info" | "warn" | "error"

function emit(level: LogLevel, event: string, fields: Record<string, unknown>) {
  const line = JSON.stringify({ level, event, ts: new Date().toISOString(), ...fields })
  if (level === "error") console.error(line)
  else if (level === "warn") console.warn(line)
  else console.log(line)
}

export function logWebhookProcessed(fields: {
  provider:          string
  normalizedEvent:   string | null
  syncEventId?:      string
  skipped?:          boolean
  durationMs?:       number
}) {
  emit("info", "integration_webhook_processed", fields)
}

export function logAiCall(fields: {
  feature:     string
  model?:      string
  ok:          boolean
  durationMs?: number
  error?:      string
}) {
  emit(fields.ok ? "info" : "warn", "ai_call", fields)
}
