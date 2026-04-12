import { z } from "zod"
import { CONNECTOR_STATUS, PROCESSING_STATUS } from "@/lib/constants/enums"

export const ConnectorStatusSchema   = z.enum(CONNECTOR_STATUS)
export const ProcessingStatusSchema  = z.enum(PROCESSING_STATUS)

// ─── DB row shapes ───────────────────────────────────────────────────────

export const IntegrationConnectorRowSchema = z.object({
  id:              z.string().uuid(),
  organization_id: z.string().uuid(),
  provider:        z.string(),
  display_name:    z.string(),
  status:          ConnectorStatusSchema,
  last_sync_at:    z.string().nullable(),
  last_error:      z.string().nullable(),
  config_json:     z.record(z.string(), z.unknown()),
  created_at:      z.string(),
  updated_at:      z.string(),
})

export type IntegrationConnectorRow = z.infer<typeof IntegrationConnectorRowSchema>

export const IntegrationSyncEventRowSchema = z.object({
  id:                       z.string().uuid(),
  connector_id:             z.string().uuid(),
  organization_id:          z.string().uuid(),
  direction:                z.enum(["inbound", "outbound"]),
  external_event_id:        z.string().nullable(),
  event_type:               z.string().nullable(),
  payload_json:             z.record(z.string(), z.unknown()),
  normalized_domain_event:  z.string().nullable(),
  processing_status:        ProcessingStatusSchema,
  error_message:            z.string().nullable(),
  created_at:               z.string(),
  processed_at:             z.string().nullable(),
})

export type IntegrationSyncEventRow = z.infer<typeof IntegrationSyncEventRowSchema>

// ─── API response shapes ─────────────────────────────────────────────────

export const IntegrationConnectorResponseSchema = z.object({
  id:          z.string(),
  provider:    z.string(),
  displayName: z.string(),
  status:      ConnectorStatusSchema,
  lastSyncAt:  z.string().nullable(),
  lastError:   z.string().nullable(),
})

export type IntegrationConnectorResponse = z.infer<typeof IntegrationConnectorResponseSchema>

// ─── Inbound webhook payload ─────────────────────────────────────────────

export const WebhookPayloadSchema = z.object({
  /** Provider-assigned unique identifier for this event (used for dedupe) */
  externalEventId: z.string().optional(),
  /** Provider-defined event type name */
  eventType:       z.string().optional(),
  /** Arbitrary provider-specific payload */
  data:            z.record(z.string(), z.unknown()),
  /** ISO-8601 timestamp when the external event occurred */
  occurredAt:      z.string().optional(),
  /** Schema version for forward-compatibility */
  schemaVersion:   z.string().optional().default("1"),
})

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>

const WebhookPayloadInputSchema = z
  .object({
    externalEventId: z.string().optional(),
    external_event_id: z.string().optional(),
    externalId: z.string().optional(),
    external_id: z.string().optional(),
    eventType: z.string().optional(),
    event_type: z.string().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
    occurredAt: z.string().optional(),
    occurred_at: z.string().optional(),
    schemaVersion: z.string().optional(),
    schema_version: z.string().optional(),
  })
  .passthrough()

export function normalizeWebhookPayload(input: unknown): WebhookPayload {
  const raw = WebhookPayloadInputSchema.parse(input)

  return WebhookPayloadSchema.parse({
    externalEventId:
      raw.externalEventId ??
      raw.external_event_id ??
      raw.externalId ??
      raw.external_id,
    eventType: raw.eventType ?? raw.event_type,
    data: raw.data ?? raw.payload ?? {},
    occurredAt: raw.occurredAt ?? raw.occurred_at,
    schemaVersion: raw.schemaVersion ?? raw.schema_version ?? "1",
  })
}

// ─── Known provider names ────────────────────────────────────────────────

export const KNOWN_PROVIDERS = [
  "opentable",
  "square",
  "toast",
  "stripe",
  "google_reviews",
  "yelp",
  "gmail",
  "manual",
] as const

export type KnownProvider = (typeof KNOWN_PROVIDERS)[number]
