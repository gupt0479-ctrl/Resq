import type { SupabaseClient } from "@supabase/supabase-js"
import type { WebhookPayload } from "@/lib/schemas/integrations"
import {
  cancelAppointment,
  completeAppointment,
  rescheduleAppointment,
} from "@/lib/services/appointments"
import { sendInvoice, markInvoicePaid } from "@/lib/services/invoices"
import {
  analyzeAndPersistFeedback,
  ingestFeedbackRow,
  resolveCustomerIdByEmail,
} from "@/lib/services/feedback"
import { logWebhookProcessed } from "@/lib/logging/server-log"
import {
  MUTATING_INTEGRATION_EVENTS,
  getWebhookDispatchValidationError,
  normalizeDomainEvent,
  getString,
  getNumber,
} from "@/lib/integrations/webhook-domain"

export { MUTATING_INTEGRATION_EVENTS, normalizeDomainEvent } from "@/lib/integrations/webhook-domain"

// List connectors

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

// Get connector by provider

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

export async function clearConnectorError(
  client: SupabaseClient,
  organizationId: string,
  provider: string
) {
  const connector = await getConnectorByProvider(client, organizationId, provider)
  if (!connector) {
    throw new Error(`Connector not found for provider: ${provider}`)
  }

  const nextStatus = connector.last_sync_at ? "connected" : "disabled"
  const { data, error } = await client
    .from("integration_connectors")
    .update({
      status: nextStatus,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connector.id)
    .eq("organization_id", organizationId)
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to clear connector error")
  }

  return data
}

// Ingest webhook payload (MCP bridge)

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

  const normalizedEvent = normalizeDomainEvent(provider, payload.eventType)

  if (
    normalizedEvent &&
    (MUTATING_INTEGRATION_EVENTS as readonly string[]).includes(normalizedEvent) &&
    !payload.externalEventId
  ) {
    throw new Error(
      "externalEventId is required for mutating integration webhooks (deduplication): " +
        MUTATING_INTEGRATION_EVENTS.join(", ")
    )
  }

  // 2. Attempt to insert the sync event (unique index handles dedupe)
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
    // Unique constraint violation -> duplicate event, skip silently
    if (insertErr.code === "23505") {
      if (payload.externalEventId && connector) {
        const { data: existing } = await client
          .from("integration_sync_events")
          .select("id, processing_status")
          .eq("connector_id", connector.id)
          .eq("external_event_id", payload.externalEventId)
          .maybeSingle()

        if (existing && (existing as { processing_status: string }).processing_status === "failed") {
          const existingId = (existing as { id: string }).id
          const tRetry = Date.now()
          try {
            await dispatchWebhookCommand(
              client,
              organizationId,
              provider,
              normalizedEvent,
              payload,
              existingId
            )
            await client
              .from("integration_sync_events")
              .update({
                processing_status: "processed",
                processed_at:        new Date().toISOString(),
                error_message:       null,
              })
              .eq("id", existingId)
            await client
              .from("integration_connectors")
              .update({
                last_sync_at: new Date().toISOString(),
                status:       "connected",
                last_error:   null,
              })
              .eq("id", connector.id)
            logWebhookProcessed({
              provider,
              normalizedEvent,
              syncEventId: existingId,
              skipped:     false,
              durationMs:  Date.now() - tRetry,
            })
            return {
              syncEventId:            existingId,
              processing_status:      "processed",
              normalized_domain_event: normalizedEvent,
              skipped:                false,
            }
          } catch (retryErr) {
            const msg =
              retryErr instanceof Error ? retryErr.message : "Webhook dispatch failed on retry"
            await client
              .from("integration_sync_events")
              .update({
                processing_status: "failed",
                processed_at:      new Date().toISOString(),
                error_message:     msg.slice(0, 4000),
              })
              .eq("id", existingId)
            await client
              .from("integration_connectors")
              .update({
                status:     "error",
                last_error: msg.slice(0, 2000),
                updated_at: new Date().toISOString(),
              })
              .eq("id", connector.id)
            throw retryErr
          }
        }
      }

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

  const t0 = Date.now()
  try {
    await dispatchWebhookCommand(
      client,
      organizationId,
      provider,
      normalizedEvent,
      payload,
      syncEvent.id as string
    )
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
        error_message: message.slice(0, 4000),
      })
      .eq("id", syncEvent.id)
    await client
      .from("integration_connectors")
      .update({
        status:     "error",
        last_error: message.slice(0, 2000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connector.id)
    throw error
  }

  logWebhookProcessed({
    provider,
    normalizedEvent,
    syncEventId: syncEvent.id as string,
    skipped:     false,
    durationMs:  Date.now() - t0,
  })

  return {
    syncEventId:            syncEvent.id,
    processing_status:      "processed",
    normalized_domain_event: normalizedEvent,
    skipped:                false,
  }
}

// Helpers

async function dispatchWebhookCommand(
  client: SupabaseClient,
  organizationId: string,
  provider: string,
  normalizedEvent: string | null,
  payload: WebhookPayload,
  syncEventId: string
) {
  if (!normalizedEvent) return

  const validationError = getWebhookDispatchValidationError(normalizedEvent, payload.data)
  if (validationError) {
    throw new Error(validationError)
  }

  const invoiceId = getString(payload.data, "invoiceId", "invoice_id")
  const appointmentId = getString(payload.data, "appointmentId", "appointment_id")

  if (normalizedEvent === "reservation.cancelled") {
    if (!appointmentId) throw new Error("reservation.cancelled requires appointmentId in webhook data.")
    await cancelAppointment(client, appointmentId, organizationId)
    return
  }

  if (normalizedEvent === "reservation.rescheduled") {
    const startsAt = getString(payload.data, "startsAt", "starts_at", "startAt")
    const endsAt = getString(payload.data, "endsAt", "ends_at", "endAt")
    if (!appointmentId) throw new Error("reservation.rescheduled requires appointmentId in webhook data.")
    if (!startsAt || !endsAt) {
      throw new Error("reservation.rescheduled requires startsAt and endsAt in webhook data.")
    }
    await rescheduleAppointment(client, appointmentId, organizationId, startsAt, endsAt)
    return
  }

  if (normalizedEvent === "reservation.completed") {
    if (!appointmentId) throw new Error("reservation.completed requires appointmentId in webhook data.")
    await completeAppointment(
      client,
      appointmentId,
      organizationId,
      `Completed by ${provider} webhook`
    )
    return
  }

  if (normalizedEvent === "invoice.sent") {
    if (!invoiceId) throw new Error("invoice.sent requires invoiceId in webhook data.")
    await sendInvoice(client, invoiceId, organizationId, `Sent by ${provider} webhook`)
    return
  }

  if (normalizedEvent === "invoice.paid") {
    if (!invoiceId) throw new Error("invoice.paid requires invoiceId in webhook data.")
    let amountPaid = getNumber(payload.data, "amountPaid", "amount_paid", "amount")
    const { data: inv } = await client
      .from("invoices")
      .select("total_amount")
      .eq("id", invoiceId)
      .eq("organization_id", organizationId)
      .maybeSingle()

    if (inv && amountPaid != null) {
      const cap = Number(inv.total_amount) || 0
      if (amountPaid > cap) amountPaid = cap
    }

    await markInvoicePaid(client, invoiceId, organizationId, {
      paymentMethod: getString(payload.data, "paymentMethod", "payment_method") ?? "card",
      amountPaid:    amountPaid ?? undefined,
      notes:         `Paid by ${provider} webhook`,
    })
    return
  }

  if (normalizedEvent === "feedback.received") {
    const data = payload.data
    const score = getNumber(data, "score", "rating", "stars")
    if (score == null || score < 1 || score > 5) {
      throw new Error("feedback.received requires numeric score between 1 and 5.")
    }
    let guestName =
      getString(data, "guestName", "guest_name", "reviewerName", "reviewer_name") ?? ""
    const comment = getString(data, "comment", "text", "body") ?? ""
    let customerId = getString(data, "customerId", "customer_id") ?? null
    const email = getString(data, "guestEmail", "guest_email", "email")
    if (!customerId && email) {
      customerId = await resolveCustomerIdByEmail(client, organizationId, email)
    }
    if (!guestName && customerId) {
      const { data: cust } = await client
        .from("customers")
        .select("full_name")
        .eq("id", customerId)
        .eq("organization_id", organizationId)
        .maybeSingle()
      guestName = (cust as { full_name?: string } | null)?.full_name ?? "Guest"
    }
    if (!guestName) guestName = "Guest"

    const sourceRaw =
      getString(data, "source", "review_source", "channel")?.toLowerCase() ?? provider
    const source =
      sourceRaw.includes("yelp") ? "yelp" :
      sourceRaw.includes("google") ? "google" :
      sourceRaw.includes("opentable") ? "opentable" :
      "internal"

    const externalReviewId =
      getString(data, "externalReviewId", "external_review_id", "reviewId", "review_id") ??
      payload.externalEventId ??
      null
    const externalSource = getString(data, "externalSource", "external_source") ?? provider

    const { feedbackId } = await ingestFeedbackRow(client, {
      organizationId,
      customerId,
      appointmentId:            getString(data, "appointmentId", "appointment_id") ?? null,
      integrationSyncEventId:   syncEventId,
      guestName,
      score,
      comment,
      source,
      externalReviewId,
      externalSource,
    })

    await analyzeAndPersistFeedback(client, organizationId, feedbackId, {
      guestName,
      score,
      comment,
      source,
      customerId,
    }, { skipIfAlreadyAnalyzed: true })
  }
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
    tinyfish:       "TinyFish Web Agent",
  }
  return names[provider] ?? provider
}
