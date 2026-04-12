import type { SupabaseClient } from "@supabase/supabase-js"
import type { WebhookPayload } from "@/lib/schemas/integrations"
import { completeAppointment } from "@/lib/services/appointments"
import { sendInvoice, markInvoicePaid } from "@/lib/services/invoices"

// ─── List connectors ──────────────────────────────────────────────────────

export async function listConnectors(
  client: SupabaseClient,
  organizationId: string
) {
  const { data, error } = await client
    .from("integration_connectors")
    .select("*")
    .eq("organization_id", organizationId)
    .order("provider", { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

// ─── Get connector by provider ────────────────────────────────────────────

export async function getConnectorByProvider(
  client: SupabaseClient,
  organizationId: string,
  provider: string
) {
  const { data, error } = await client
    .from("integration_connectors")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

// ─── Ingest webhook payload (MCP bridge) ─────────────────────────────────

export interface IngestWebhookResult {
  syncEventId:            string
  processing_status:      string
  normalized_domain_event: string | null
  skipped:                boolean
}

/**
 * Validates, deduplicates, and persists an inbound connector payload.
 * Dispatches to internal domain commands via the same service layer used by UI routes.
 *
 * Returns a result describing whether the event was processed or skipped as a duplicate.
 */
export async function ingestWebhookPayload(
  client: SupabaseClient,
  organizationId: string,
  provider: string,
  payload: WebhookPayload,
  rawPayload: Record<string, unknown> = payload.data
): Promise<IngestWebhookResult> {
  // 1. Find or create the connector row
  let connector = await getConnectorByProvider(client, organizationId, provider)

  if (!connector) {
    const { data: newConn, error: createErr } = await client
      .from("integration_connectors")
      .insert({
        organization_id: organizationId,
        provider,
        display_name: providerDisplayName(provider),
        status: "connected",
        last_sync_at: new Date().toISOString(),
      })
      .select("*")
      .single()

    if (createErr || !newConn) {
      throw new Error(createErr?.message ?? "Failed to register connector")
    }
    connector = newConn
  }

  // 2. Attempt to insert the sync event (unique index handles dedupe)
  const normalizedEvent = normalizeDomainEvent(provider, payload.eventType)

  const { data: syncEvent, error: insertErr } = await client
    .from("integration_sync_events")
    .insert({
      connector_id:             connector.id,
      organization_id:          organizationId,
      direction:                "inbound",
      external_event_id:        payload.externalEventId ?? null,
      event_type:               payload.eventType ?? null,
      payload_json:             rawPayload,
      normalized_domain_event:  normalizedEvent,
      processing_status:        "pending",
    })
    .select("id")
    .single()

  if (insertErr) {
    // Unique constraint violation → duplicate event, skip silently
    if (insertErr.code === "23505") {
      return {
        syncEventId:            "",
        processing_status:      "skipped",
        normalized_domain_event: normalizedEvent,
        skipped:                true,
      }
    }
    throw new Error(`Failed to log sync event: ${insertErr.message}`)
  }

  // 3. Update connector last_sync_at
  await client
    .from("integration_connectors")
    .update({ last_sync_at: new Date().toISOString(), status: "connected", last_error: null })
    .eq("id", connector.id)

  try {
    await dispatchWebhookCommand(client, organizationId, provider, normalizedEvent, payload)
    await client
      .from("integration_sync_events")
      .update({ processing_status: "processed", processed_at: new Date().toISOString() })
      .eq("id", syncEvent.id)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook dispatch failed"
    await client
      .from("integration_sync_events")
      .update({
        processing_status: "failed",
        processed_at: new Date().toISOString(),
        error_message: message,
      })
      .eq("id", syncEvent.id)
    throw error
  }

  return {
    syncEventId:            syncEvent.id,
    processing_status:      "processed",
    normalized_domain_event: normalizedEvent,
    skipped:                false,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

async function dispatchWebhookCommand(
  client: SupabaseClient,
  organizationId: string,
  provider: string,
  normalizedEvent: string | null,
  payload: WebhookPayload
) {
  if (!normalizedEvent) return

  const invoiceId = getString(payload.data, "invoiceId", "invoice_id")
  const appointmentId = getString(payload.data, "appointmentId", "appointment_id")

  if (normalizedEvent === "reservation.completed" && appointmentId) {
    await completeAppointment(
      client,
      appointmentId,
      organizationId,
      `Completed by ${provider} webhook`
    )
    return
  }

  if (normalizedEvent === "invoice.sent" && invoiceId) {
    await sendInvoice(client, invoiceId, organizationId, `Sent by ${provider} webhook`)
    return
  }

  if (normalizedEvent === "invoice.paid" && invoiceId) {
    await markInvoicePaid(client, invoiceId, organizationId, {
      paymentMethod: getString(payload.data, "paymentMethod", "payment_method") ?? "card",
      amountPaid: getNumber(payload.data, "amountPaid", "amount_paid", "amount") ?? undefined,
      notes: `Paid by ${provider} webhook`,
    })
  }
}

function normalizeDomainEvent(
  provider: string,
  externalEventType?: string
): string | null {
  if (!externalEventType) return null

  const et = externalEventType.toLowerCase()

  if (et === "reservation.completed" || et === "invoice.sent" || et === "invoice.paid") {
    return et
  }

  // Simple normalization map — extend per provider as integrations grow
  if (et.includes("reservation") && et.includes("creat")) return "reservation.created"
  if (et.includes("reservation") && et.includes("complet")) return "reservation.completed"
  if (et.includes("invoice") && et.includes("sent")) return "invoice.sent"
  if (et.includes("payment") && (et.includes("success") || et.includes("complete"))) {
    return "invoice.paid"
  }
  if (et.includes("payment") && et.includes("fail")) return "invoice.overdue"
  if (et.includes("review") || et.includes("feedback")) return "feedback.received"

  return `${provider}.${externalEventType}`
}

function providerDisplayName(provider: string): string {
  const names: Record<string, string> = {
    opentable:      "OpenTable",
    square:         "Square POS",
    toast:          "Toast POS",
    stripe:         "Stripe",
    google_reviews: "Google Reviews",
    yelp:           "Yelp",
    gmail:          "Gmail",
    manual:         "Manual / Webhook",
  }
  return names[provider] ?? provider
}

function getString(
  data: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = data[key]
    if (typeof value === "string" && value.length > 0) {
      return value
    }
  }
}

function getNumber(
  data: Record<string, unknown>,
  ...keys: string[]
): number | undefined {
  for (const key of keys) {
    const value = data[key]
    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }
}
