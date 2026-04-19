import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { eq, and, asc } from "drizzle-orm"
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
  organizationId: string
) {
  const data = await db
    .select()
    .from(schema.integrationConnectors)
    .where(eq(schema.integrationConnectors.organizationId, organizationId))
    .orderBy(asc(schema.integrationConnectors.provider))

  return data
}

// Get connector by provider

export async function getConnectorByProvider(
  organizationId: string,
  provider: string
) {
  const [row] = await db
    .select()
    .from(schema.integrationConnectors)
    .where(
      and(
        eq(schema.integrationConnectors.organizationId, organizationId),
        eq(schema.integrationConnectors.provider, provider),
      ),
    )
    .limit(1)

  return row ?? null
}

export async function clearConnectorError(
  organizationId: string,
  provider: string
) {
  const connector = await getConnectorByProvider(organizationId, provider)
  if (!connector) {
    throw new Error(`Connector not found for provider: ${provider}`)
  }

  const nextStatus = connector.lastSyncAt ? "connected" : "disabled"
  const [data] = await db
    .update(schema.integrationConnectors)
    .set({
      status:    nextStatus,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.integrationConnectors.id, connector.id),
        eq(schema.integrationConnectors.organizationId, organizationId),
      ),
    )
    .returning()

  if (!data) {
    throw new Error("Failed to clear connector error")
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
  organizationId: string,
  provider: string,
  payload: WebhookPayload,
  rawPayload: Record<string, unknown> = payload.data
): Promise<IngestWebhookResult> {
  // 1. Find or create the connector row
  let connector = await getConnectorByProvider(organizationId, provider)

  if (!connector) {
    const [newConn] = await db
      .insert(schema.integrationConnectors)
      .values({
        organizationId,
        provider,
        displayName: providerDisplayName(provider),
        status:      "connected",
        lastSyncAt:  new Date(),
      })
      .returning()

    if (!newConn) {
      throw new Error("Failed to register connector")
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
  let syncEvent: { id: string }
  try {
    const [inserted] = await db
      .insert(schema.integrationSyncEvents)
      .values({
        connectorId:           connector.id,
        organizationId,
        direction:             "inbound",
        externalEventId:       payload.externalEventId ?? null,
        eventType:             payload.eventType ?? null,
        payloadJson:           rawPayload,
        normalizedDomainEvent: normalizedEvent,
        processingStatus:      "pending",
      })
      .returning({ id: schema.integrationSyncEvents.id })

    if (!inserted) throw new Error("Failed to log sync event")
    syncEvent = inserted
  } catch (insertErr) {
    // Unique constraint violation -> duplicate event, skip silently
    if ((insertErr as { code?: string }).code === "23505") {
      if (payload.externalEventId && connector) {
        const [existing] = await db
          .select({
            id:               schema.integrationSyncEvents.id,
            processingStatus: schema.integrationSyncEvents.processingStatus,
          })
          .from(schema.integrationSyncEvents)
          .where(
            and(
              eq(schema.integrationSyncEvents.connectorId, connector.id),
              eq(schema.integrationSyncEvents.externalEventId, payload.externalEventId),
            ),
          )
          .limit(1)

        if (existing && existing.processingStatus === "failed") {
          const existingId = existing.id
          const tRetry = Date.now()
          try {
            await dispatchWebhookCommand(
              organizationId,
              provider,
              normalizedEvent,
              payload,
              existingId
            )
            await db
              .update(schema.integrationSyncEvents)
              .set({
                processingStatus: "processed",
                processedAt:      new Date(),
                errorMessage:     null,
              })
              .where(eq(schema.integrationSyncEvents.id, existingId))
            await db
              .update(schema.integrationConnectors)
              .set({
                lastSyncAt: new Date(),
                status:     "connected",
                lastError:  null,
              })
              .where(eq(schema.integrationConnectors.id, connector.id))
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
            await db
              .update(schema.integrationSyncEvents)
              .set({
                processingStatus: "failed",
                processedAt:      new Date(),
                errorMessage:     msg.slice(0, 4000),
              })
              .where(eq(schema.integrationSyncEvents.id, existingId))
            await db
              .update(schema.integrationConnectors)
              .set({
                status:     "error",
                lastError:  msg.slice(0, 2000),
                updatedAt:  new Date(),
              })
              .where(eq(schema.integrationConnectors.id, connector.id))
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
    throw new Error(`Failed to log sync event: ${(insertErr as Error).message}`)
  }

  // 3. Update connector last_sync_at
  await db
    .update(schema.integrationConnectors)
    .set({ lastSyncAt: new Date(), status: "connected", lastError: null })
    .where(eq(schema.integrationConnectors.id, connector.id))

  const t0 = Date.now()
  try {
    await dispatchWebhookCommand(
      organizationId,
      provider,
      normalizedEvent,
      payload,
      syncEvent.id
    )
    await db
      .update(schema.integrationSyncEvents)
      .set({ processingStatus: "processed", processedAt: new Date() })
      .where(eq(schema.integrationSyncEvents.id, syncEvent.id))
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook dispatch failed"
    await db
      .update(schema.integrationSyncEvents)
      .set({
        processingStatus: "failed",
        processedAt:      new Date(),
        errorMessage:     message.slice(0, 4000),
      })
      .where(eq(schema.integrationSyncEvents.id, syncEvent.id))
    await db
      .update(schema.integrationConnectors)
      .set({
        status:     "error",
        lastError:  message.slice(0, 2000),
        updatedAt:  new Date(),
      })
      .where(eq(schema.integrationConnectors.id, connector.id))
    throw error
  }

  logWebhookProcessed({
    provider,
    normalizedEvent,
    syncEventId: syncEvent.id,
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
    await cancelAppointment(appointmentId, organizationId)
    return
  }

  if (normalizedEvent === "reservation.rescheduled") {
    const startsAt = getString(payload.data, "startsAt", "starts_at", "startAt")
    const endsAt = getString(payload.data, "endsAt", "ends_at", "endAt")
    if (!appointmentId) throw new Error("reservation.rescheduled requires appointmentId in webhook data.")
    if (!startsAt || !endsAt) {
      throw new Error("reservation.rescheduled requires startsAt and endsAt in webhook data.")
    }
    await rescheduleAppointment(appointmentId, organizationId, startsAt, endsAt)
    return
  }

  if (normalizedEvent === "reservation.completed") {
    if (!appointmentId) throw new Error("reservation.completed requires appointmentId in webhook data.")
    await completeAppointment(
      appointmentId,
      organizationId,
      `Completed by ${provider} webhook`
    )
    return
  }

  if (normalizedEvent === "invoice.sent") {
    if (!invoiceId) throw new Error("invoice.sent requires invoiceId in webhook data.")
    await sendInvoice(invoiceId, organizationId, `Sent by ${provider} webhook`)
    return
  }

  if (normalizedEvent === "invoice.paid") {
    if (!invoiceId) throw new Error("invoice.paid requires invoiceId in webhook data.")
    let amountPaid = getNumber(payload.data, "amountPaid", "amount_paid", "amount")

    const [inv] = await db
      .select({ totalAmount: schema.invoices.totalAmount })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.id, invoiceId),
          eq(schema.invoices.organizationId, organizationId),
        ),
      )
      .limit(1)

    if (inv && amountPaid != null) {
      const cap = Number(inv.totalAmount) || 0
      if (amountPaid > cap) amountPaid = cap
    }

    await markInvoicePaid(invoiceId, organizationId, {
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
      customerId = await resolveCustomerIdByEmail(organizationId, email)
    }
    if (!guestName && customerId) {
      const [cust] = await db
        .select({ fullName: schema.customers.fullName })
        .from(schema.customers)
        .where(
          and(
            eq(schema.customers.id, customerId),
            eq(schema.customers.organizationId, organizationId),
          ),
        )
        .limit(1)
      guestName = cust?.fullName ?? "Guest"
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

    const { feedbackId } = await ingestFeedbackRow({
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

    await analyzeAndPersistFeedback(organizationId, feedbackId, {
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
