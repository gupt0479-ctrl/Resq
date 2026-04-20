-- Resq · Ember Table — Core ledger schema
-- Migration: 0001_core_ledger
-- Applies to: organizations, customers, staff, services, appointments,
--             appointment_events, invoices, invoice_items, finance_transactions,
--             integration_connectors, integration_sync_events

-- ─── Organizations ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  slug          TEXT        NOT NULL UNIQUE,
  timezone      TEXT        NOT NULL DEFAULT 'America/Chicago',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Customers / Guests ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customers (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name                 TEXT        NOT NULL,
  email                     TEXT,
  phone                     TEXT,
  preferred_contact_channel TEXT        NOT NULL DEFAULT 'email',
  last_visit_at             TIMESTAMPTZ,
  lifetime_value            NUMERIC(12, 2) NOT NULL DEFAULT 0,
  avg_feedback_score        NUMERIC(3, 2),
  risk_status               TEXT        NOT NULL DEFAULT 'none',
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organization_id);

-- ─── Staff ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staff (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name       TEXT        NOT NULL,
  role            TEXT        NOT NULL, -- host | server | manager | chef
  email           TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_org ON staff(organization_id);

-- ─── Services / Menu Catalog ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS services (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID           NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             TEXT           NOT NULL,
  description      TEXT,
  category         TEXT           NOT NULL DEFAULT 'main_course',
  price_per_person NUMERIC(10, 2) NOT NULL,
  is_active        BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_org ON services(organization_id);

-- ─── Appointments / Reservations ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS appointments (
  id                               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id                  UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id                      UUID        NOT NULL REFERENCES customers(id),
  staff_id                         UUID        REFERENCES staff(id),
  service_id                       UUID        NOT NULL REFERENCES services(id),
  covers                           INTEGER     NOT NULL DEFAULT 2,
  starts_at                        TIMESTAMPTZ NOT NULL,
  ends_at                          TIMESTAMPTZ NOT NULL,
  status                           TEXT        NOT NULL DEFAULT 'scheduled',
  booking_source                   TEXT        NOT NULL DEFAULT 'manual',
  confirmation_sent_at             TIMESTAMPTZ,
  reminder_sent_at                 TIMESTAMPTZ,
  rescheduled_from_appointment_id  UUID        REFERENCES appointments(id),
  cancellation_reason              TEXT,
  notes                            TEXT,
  created_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT appointments_status_check CHECK (
    status IN ('scheduled','confirmed','in_progress','completed','rescheduled','cancelled','no_show')
  )
);

CREATE INDEX IF NOT EXISTS idx_appointments_org_status   ON appointments(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_org_starts   ON appointments(organization_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_customer     ON appointments(customer_id);

-- ─── Appointment Events (audit trail) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS appointment_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID        NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  organization_id UUID        NOT NULL REFERENCES organizations(id),
  event_type      TEXT        NOT NULL,
  from_status     TEXT,
  to_status       TEXT,
  notes           TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointment_events_appointment ON appointment_events(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_events_org         ON appointment_events(organization_id, created_at);

-- ─── Invoices ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoices (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID           NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  appointment_id  UUID           REFERENCES appointments(id),
  customer_id     UUID           NOT NULL REFERENCES customers(id),
  invoice_number  TEXT           NOT NULL UNIQUE,
  currency        TEXT           NOT NULL DEFAULT 'USD',
  subtotal        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_rate        NUMERIC(5, 4)  NOT NULL DEFAULT 0.0900,
  tax_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  due_at          TIMESTAMPTZ    NOT NULL,
  status          TEXT           NOT NULL DEFAULT 'draft',
  sent_at         TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  pdf_path        TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT invoices_status_check CHECK (
    status IN ('draft','sent','pending','paid','overdue','void')
  )
);

CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON invoices(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_org_due_at ON invoices(organization_id, due_at);
CREATE INDEX IF NOT EXISTS idx_invoices_customer   ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_appointment ON invoices(appointment_id);

-- ─── Invoice Line Items ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoice_items (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID           NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  organization_id UUID           NOT NULL REFERENCES organizations(id),
  service_id      UUID           REFERENCES services(id),
  description     TEXT           NOT NULL,
  quantity        INTEGER        NOT NULL DEFAULT 1,
  unit_price      NUMERIC(10, 2) NOT NULL,
  amount          NUMERIC(12, 2) NOT NULL,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- ─── Finance Transactions (ledger — source of truth) ──────────────────────

CREATE TABLE IF NOT EXISTS finance_transactions (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID           NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id       UUID           REFERENCES invoices(id),
  type             TEXT           NOT NULL,
  category         TEXT           NOT NULL DEFAULT 'uncategorized',
  amount           NUMERIC(12, 2) NOT NULL,
  direction        TEXT           NOT NULL,
  occurred_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  payment_method   TEXT,
  tax_relevant     BOOLEAN        NOT NULL DEFAULT FALSE,
  writeoff_eligible BOOLEAN       NOT NULL DEFAULT FALSE,
  receipt_id       UUID,
  notes            TEXT,
  external_ref     TEXT,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT finance_transactions_type_check CHECK (
    type IN ('revenue','expense','refund','fee','tax_payment','inventory_purchase','writeoff')
  ),
  CONSTRAINT finance_transactions_direction_check CHECK (
    direction IN ('in','out')
  )
);

-- Idempotency guard: at most one revenue transaction per invoice payment
CREATE UNIQUE INDEX IF NOT EXISTS finance_transactions_invoice_revenue_unique
  ON finance_transactions(invoice_id)
  WHERE type = 'revenue' AND direction = 'in' AND invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_transactions_org          ON finance_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_invoice      ON finance_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_org_occurred ON finance_transactions(organization_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_org_type     ON finance_transactions(organization_id, type);

-- ─── Integration Connectors ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS integration_connectors (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider        TEXT        NOT NULL,
  display_name    TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'disabled',
  last_sync_at    TIMESTAMPTZ,
  last_error      TEXT,
  config_json     JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT integration_connectors_status_check CHECK (
    status IN ('connected','error','disabled')
  ),
  UNIQUE(organization_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integration_connectors_org ON integration_connectors(organization_id);

-- ─── Integration Sync Events (MCP bridge ingestion log) ───────────────────

CREATE TABLE IF NOT EXISTS integration_sync_events (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id            UUID        NOT NULL REFERENCES integration_connectors(id) ON DELETE CASCADE,
  organization_id         UUID        NOT NULL REFERENCES organizations(id),
  direction               TEXT        NOT NULL DEFAULT 'inbound',
  external_event_id       TEXT,
  event_type              TEXT,
  payload_json            JSONB       NOT NULL,
  normalized_domain_event TEXT,
  processing_status       TEXT        NOT NULL DEFAULT 'pending',
  error_message           TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at            TIMESTAMPTZ,
  CONSTRAINT integration_sync_events_direction_check CHECK (
    direction IN ('inbound','outbound')
  ),
  CONSTRAINT integration_sync_events_processing_status_check CHECK (
    processing_status IN ('pending','processed','failed','skipped')
  )
);

-- Webhook deduplification by external_event_id per connector
CREATE UNIQUE INDEX IF NOT EXISTS integration_sync_events_external_id_unique
  ON integration_sync_events(connector_id, external_event_id)
  WHERE external_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_integration_sync_events_connector ON integration_sync_events(connector_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_events_org       ON integration_sync_events(organization_id, created_at);

-- ─── AI Summaries (stub table — populated later) ──────────────────────────

CREATE TABLE IF NOT EXISTS ai_summaries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scope           TEXT        NOT NULL DEFAULT 'daily_manager',
  payload_json    JSONB       NOT NULL DEFAULT '{}',
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_summaries_org ON ai_summaries(organization_id, generated_at);

-- ─── AI Actions (stub table — populated later) ────────────────────────────

CREATE TABLE IF NOT EXISTS ai_actions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type      TEXT        NOT NULL,
  entity_id        UUID        NOT NULL,
  trigger_type     TEXT        NOT NULL,
  action_type      TEXT        NOT NULL,
  input_summary    TEXT,
  output_payload_json JSONB,
  status           TEXT        NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at      TIMESTAMPTZ,
  CONSTRAINT ai_actions_status_check CHECK (
    status IN ('pending','executed','failed')
  )
);

CREATE INDEX IF NOT EXISTS idx_ai_actions_org ON ai_actions(organization_id, created_at);
