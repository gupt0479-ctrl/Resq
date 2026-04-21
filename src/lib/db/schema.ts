import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// ─── Enums ─────────────────────────────────────────────────────────────────

export const recoveryStatusEnum = pgEnum("recovery_status", [
  "none",
  "queued",
  "reminder_sent",
  "payment_plan_offered",
  "settlement_offered",
  "escalated",
  "disputed",
  "resolved",
  "written_off",
])

// ─── Organizations ─────────────────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  timezone: text("timezone").notNull().default("America/Chicago"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// ─── Organization Memberships ───────────────────────────────────────────────

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    organizationId: uuid("organization_id").notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_org_memberships_user").on(table.userId),
    index("idx_org_memberships_org").on(table.organizationId),
    uniqueIndex("org_memberships_user_org").on(table.userId, table.organizationId),
    uniqueIndex("org_memberships_one_default_per_user")
      .on(table.userId)
      .where(sql`${table.isDefault} = true`),
  ],
)

// ─── Customers ─────────────────────────────────────────────────────────────

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    preferredContactChannel: text("preferred_contact_channel").notNull().default("email"),
    lastVisitAt: timestamp("last_visit_at", { withTimezone: true }),
    lifetimeValue: numeric("lifetime_value", { precision: 12, scale: 2 }).notNull().default("0"),
    avgFeedbackScore: numeric("avg_feedback_score", { precision: 3, scale: 2 }),
    riskStatus: text("risk_status").notNull().default("none"),
    notes: text("notes"),
    stripeCustomerId: text("stripe_customer_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_customers_org").on(table.organizationId),
    index("idx_customers_stripe").on(table.stripeCustomerId),
  ],
)

// ─── Staff ─────────────────────────────────────────────────────────────────

export const staff = pgTable(
  "staff",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    role: text("role").notNull(),
    email: text("email"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_staff_org").on(table.organizationId)],
)

// ─── Services ──────────────────────────────────────────────────────────────

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull().default("main_course"),
    pricePerPerson: numeric("price_per_person", { precision: 10, scale: 2 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_services_org").on(table.organizationId)],
)

// ─── Appointments ──────────────────────────────────────────────────────────

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").notNull().references(() => customers.id),
    staffId: uuid("staff_id").references(() => staff.id),
    serviceId: uuid("service_id").notNull().references(() => services.id),
    covers: integer("covers").notNull().default(2),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("scheduled"),
    bookingSource: text("booking_source").notNull().default("manual"),
    confirmationSentAt: timestamp("confirmation_sent_at", { withTimezone: true }),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    rescheduledFromAppointmentId: uuid("rescheduled_from_appointment_id"),
    cancellationReason: text("cancellation_reason"),
    notes: text("notes"),
    occasion: text("occasion"),
    followUpSent: boolean("follow_up_sent").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_appointments_org_status").on(table.organizationId, table.status),
    index("idx_appointments_org_starts").on(table.organizationId, table.startsAt),
    index("idx_appointments_customer").on(table.customerId),
  ],
)

// ─── Appointment Events ────────────────────────────────────────────────────

export const appointmentEvents = pgTable(
  "appointment_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    eventType: text("event_type").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    notes: text("notes"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_appointment_events_appointment").on(table.appointmentId),
    index("idx_appointment_events_org").on(table.organizationId, table.createdAt),
  ],
)

// ─── Invoices ──────────────────────────────────────────────────────────────

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id").references(() => appointments.id),
    customerId: uuid("customer_id").notNull().references(() => customers.id),
    invoiceNumber: text("invoice_number").notNull().unique(),
    currency: text("currency").notNull().default("USD"),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    taxRate: numeric("tax_rate", { precision: 5, scale: 4 }).notNull().default("0.0900"),
    taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("draft"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    pdfPath: text("pdf_path"),
    notes: text("notes"),
    reminderCount: integer("reminder_count").notNull().default(0),
    lastRemindedAt: timestamp("last_reminded_at", { withTimezone: true }),
    recoveryStatus: recoveryStatusEnum("recovery_status").notNull().default("none"),
    recoveryUpdatedAt: timestamp("recovery_updated_at", { withTimezone: true }),
    stripeInvoiceId: text("stripe_invoice_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    daysOverdue: integer("days_overdue"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_invoices_org_status").on(table.organizationId, table.status),
    index("idx_invoices_org_due_at").on(table.organizationId, table.dueAt),
    index("idx_invoices_customer").on(table.customerId),
    index("idx_invoices_appointment").on(table.appointmentId),
    index("idx_invoices_recovery_status").on(table.organizationId, table.recoveryStatus),
  ],
)

// ─── Invoice Items ─────────────────────────────────────────────────────────

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    serviceId: uuid("service_id").references(() => services.id),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_invoice_items_invoice").on(table.invoiceId)],
)

// ─── Finance Transactions ──────────────────────────────────────────────────

export const financeTransactions = pgTable(
  "finance_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id").references(() => invoices.id),
    type: text("type").notNull(),
    category: text("category").notNull().default("uncategorized"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    direction: text("direction").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    paymentMethod: text("payment_method"),
    taxRelevant: boolean("tax_relevant").notNull().default(false),
    writeoffEligible: boolean("writeoff_eligible").notNull().default(false),
    receiptId: uuid("receipt_id"),
    notes: text("notes"),
    externalRef: text("external_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_finance_transactions_org").on(table.organizationId),
    index("idx_finance_transactions_invoice").on(table.invoiceId),
    index("idx_finance_transactions_org_occurred").on(table.organizationId, table.occurredAt),
    index("idx_finance_transactions_org_type").on(table.organizationId, table.type),
  ],
)

// ─── Integration Connectors ────────────────────────────────────────────────

export const integrationConnectors = pgTable(
  "integration_connectors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    displayName: text("display_name").notNull(),
    status: text("status").notNull().default("disabled"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastError: text("last_error"),
    configJson: jsonb("config_json").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_integration_connectors_org").on(table.organizationId),
    uniqueIndex("integration_connectors_org_provider").on(table.organizationId, table.provider),
  ],
)

// ─── Integration Sync Events ───────────────────────────────────────────────

export const integrationSyncEvents = pgTable(
  "integration_sync_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    connectorId: uuid("connector_id").notNull().references(() => integrationConnectors.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    direction: text("direction").notNull().default("inbound"),
    externalEventId: text("external_event_id"),
    eventType: text("event_type"),
    payloadJson: jsonb("payload_json").notNull(),
    normalizedDomainEvent: text("normalized_domain_event"),
    processingStatus: text("processing_status").notNull().default("pending"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_integration_sync_events_connector").on(table.connectorId),
    index("idx_integration_sync_events_org").on(table.organizationId, table.createdAt),
  ],
)

// ─── AI Summaries ──────────────────────────────────────────────────────────

export const aiSummaries = pgTable(
  "ai_summaries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    scope: text("scope").notNull().default("daily_manager"),
    payloadJson: jsonb("payload_json").notNull().default({}),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_ai_summaries_org").on(table.organizationId, table.generatedAt)],
)

// ─── AI Actions ────────────────────────────────────────────────────────────

export const aiActions = pgTable(
  "ai_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    triggerType: text("trigger_type").notNull(),
    actionType: text("action_type").notNull(),
    inputSummary: text("input_summary"),
    outputPayloadJson: jsonb("output_payload_json"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    executedAt: timestamp("executed_at", { withTimezone: true }),
  },
  (table) => [index("idx_ai_actions_org").on(table.organizationId, table.createdAt)],
)

// ─── Feedback ──────────────────────────────────────────────────────────────

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    integrationSyncEventId: uuid("integration_sync_event_id").references(() => integrationSyncEvents.id, { onDelete: "set null" }),
    source: text("source").notNull().default("internal"),
    guestNameSnapshot: text("guest_name_snapshot"),
    score: integer("score").notNull(),
    comment: text("comment").notNull().default(""),
    sentiment: text("sentiment"),
    topics: jsonb("topics").notNull().default([]),
    urgency: integer("urgency").notNull().default(1),
    safetyFlag: boolean("safety_flag").notNull().default(false),
    followUpStatus: text("follow_up_status").notNull().default("none"),
    flagged: boolean("flagged").notNull().default(false),
    replyDraft: text("reply_draft"),
    internalNote: text("internal_note"),
    managerSummary: text("manager_summary"),
    analysisJson: jsonb("analysis_json"),
    analysisSource: text("analysis_source").notNull().default("none"),
    externalReviewId: text("external_review_id"),
    externalSource: text("external_source"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_feedback_org").on(table.organizationId),
    index("idx_feedback_org_flagged").on(table.organizationId, table.flagged),
    index("idx_feedback_org_received").on(table.organizationId, table.receivedAt),
    index("idx_feedback_customer").on(table.customerId),
  ],
)

// ─── Follow-up Actions ─────────────────────────────────────────────────────

export const followUpActions = pgTable(
  "follow_up_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    feedbackId: uuid("feedback_id").notNull().references(() => feedback.id, { onDelete: "cascade" }),
    actionType: text("action_type").notNull(),
    status: text("status").notNull().default("pending"),
    channel: text("channel").notNull().default("none"),
    priority: text("priority").notNull().default("normal"),
    messageDraft: text("message_draft"),
    metadataJson: jsonb("metadata_json").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_follow_up_actions_feedback").on(table.feedbackId),
    index("idx_follow_up_actions_org").on(table.organizationId, table.createdAt),
  ],
)

// ─── Inventory Items ───────────────────────────────────────────────────────

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemName: text("item_name").notNull(),
  category: text("category").notNull().default("other"),
  quantityOnHand: numeric("quantity_on_hand", { precision: 10, scale: 3 }).notNull().default("0"),
  reorderLevel: numeric("reorder_level", { precision: 10, scale: 3 }).notNull().default("0"),
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  previousUnitCost: numeric("previous_unit_cost", { precision: 10, scale: 2 }),
  expiresAt: date("expires_at"),
  vendorName: text("vendor_name").notNull().default("Unknown Vendor"),
  issueStatus: text("issue_status").notNull().default("none"),
  priceTrendStatus: text("price_trend_status").notNull().default("stable"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// ─── Shipments ─────────────────────────────────────────────────────────────

export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  vendorName: text("vendor_name").notNull(),
  status: text("status").notNull().default("pending"),
  expectedDeliveryDate: date("expected_delivery_date").notNull(),
  actualDeliveryDate: date("actual_delivery_date"),
  orderedAt: timestamp("ordered_at", { withTimezone: true }).notNull().defaultNow(),
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  notes: text("notes"),
  totalCost: numeric("total_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// ─── Shipment Line Items ───────────────────────────────────────────────────

export const shipmentLineItems = pgTable(
  "shipment_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shipmentId: uuid("shipment_id").notNull().references(() => shipments.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    itemName: text("item_name").notNull(),
    quantityOrdered: numeric("quantity_ordered", { precision: 10, scale: 3 }).notNull(),
    unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).notNull(),
    totalCost: numeric("total_cost", { precision: 10, scale: 2 }).notNull(),
  },
  (table) => [index("idx_shipment_line_items_shipment").on(table.shipmentId)],
)

// ─── Invoice Recovery Actions ──────────────────────────────────────────────

export const invoiceRecoveryActions = pgTable(
  "invoice_recovery_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").notNull().references(() => customers.id),
    actionType: text("action_type").notNull(),
    fromRecoveryStatus: text("from_recovery_status").notNull().default("none"),
    toRecoveryStatus: text("to_recovery_status").notNull(),
    riskScore: integer("risk_score"),
    clientCreditScore: integer("client_credit_score"),
    stripeReminderId: text("stripe_reminder_id"),
    urgency: text("urgency"),
    outreachDraft: text("outreach_draft"),
    escalateToFinancing: boolean("escalate_to_financing").notNull().default(false),
    reason: text("reason"),
    dryRun: boolean("dry_run").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_recovery_actions_org").on(table.organizationId, table.createdAt),
    index("idx_recovery_actions_invoice").on(table.invoiceId),
    index("idx_recovery_actions_customer").on(table.customerId),
  ],
)

// ─── Client Credit Scores ──────────────────────────────────────────────────

export const clientCreditScores = pgTable(
  "client_credit_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    tier: text("tier").notNull(),
    factorsJson: jsonb("factors_json").notNull().default({}),
    rationale: text("rationale"),
    scoredAt: timestamp("scored_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_client_credit_scores_org").on(table.organizationId, table.score),
    index("idx_client_credit_scores_customer").on(table.customerId),
    uniqueIndex("client_credit_scores_org_customer").on(table.organizationId, table.customerId),
  ],
)

// ─── Stripe Events ─────────────────────────────────────────────────────────

export const stripeEvents = pgTable(
  "stripe_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
    stripeEventId: text("stripe_event_id").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    eventType: text("event_type").notNull(),
    payloadJson: jsonb("payload_json").notNull().default({}),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_stripe_events_stripe_event_id").on(table.stripeEventId),
    index("idx_stripe_events_org_type").on(table.organizationId, table.eventType, table.createdAt),
    index("idx_stripe_events_customer").on(table.stripeCustomerId),
  ],
)

// ─── Client Reminders ──────────────────────────────────────────────────────

export const clientReminders = pgTable(
  "client_reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").notNull().references(() => customers.id),
    channel: text("channel").notNull().default("email"),
    subject: text("subject"),
    body: text("body"),
    stripeReminderId: text("stripe_reminder_id"),
    status: text("status").notNull().default("sent"),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_client_reminders_org").on(table.organizationId, table.sentAt),
    index("idx_client_reminders_customer").on(table.customerId),
    index("idx_client_reminders_invoice").on(table.invoiceId),
  ],
)

// ─── Cash Obligations ──────────────────────────────────────────────────────

export const cashObligations = pgTable(
  "cash_obligations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    recurrence: text("recurrence").notNull().default("one_time"),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_cash_obligations_org").on(table.organizationId, table.dueAt),
    index("idx_cash_obligations_active").on(table.organizationId, table.isActive),
  ],
)

// ─── Cash Forecast Snapshots ───────────────────────────────────────────────

export const cashForecastSnapshots = pgTable(
  "cash_forecast_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    forecastJson: jsonb("forecast_json").notNull(),
    breakpointWeek: integer("breakpoint_week"),
    breakpointAmount: numeric("breakpoint_amount", { precision: 12, scale: 2 }),
    thresholdUsed: numeric("threshold_used", { precision: 12, scale: 2 }).notNull(),
    scenarioType: text("scenario_type").notNull().default("base"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_cash_forecast_snapshots_org").on(table.organizationId, table.createdAt),
  ],
)

// ─── Legacy tables (used by reservation.service.ts / invoice.service.ts) ──

export const reservations = pgTable("reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id").references(() => customers.id),
  partySize: integer("party_size").default(2),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  notes: text("notes"),
  occasion: text("occasion"),
  status: text("status").notNull().default("confirmed"),
  reminderSent: boolean("reminder_sent").notNull().default(false),
  followUpSent: boolean("follow_up_sent").notNull().default(false),
  menuItemIds: jsonb("menu_item_ids"),
  date: text("date"),
  covers: integer("covers"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const menuItems = pgTable("menu_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  price: numeric("price", { precision: 10, scale: 2 }),
})

export const followUps = pgTable("follow_ups", {
  id: uuid("id").primaryKey().defaultRandom(),
  reservationId: uuid("reservation_id").references(() => reservations.id),
  customerId: uuid("customer_id").references(() => customers.id),
  message: text("message"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
})

export const menuItemInventoryUsage = pgTable("menu_item_inventory_usage", {
  menuItemId: uuid("menu_item_id"),
  itemId: uuid("item_id"),
  unitsUsedPerOrder: numeric("units_used_per_order"),
})
