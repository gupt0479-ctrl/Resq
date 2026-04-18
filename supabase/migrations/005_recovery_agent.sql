-- OpsPilot · Recovery Agent schema additions
-- Migration: 005_recovery_agent
-- Adds agent-owned recovery state alongside invoices without touching invoices.status

-- ─── Recovery status enum ──────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE recovery_status AS ENUM (
    'none',
    'queued',
    'reminder_sent',
    'payment_plan_offered',
    'escalated',
    'disputed',
    'resolved',
    'written_off'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── Stripe columns on customers ──────────────────────────────────────────

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_stripe
  ON customers(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ─── Agent-owned columns on invoices ──────────────────────────────────────
-- AI NEVER writes to invoices.status, invoice totals, or finance_transactions

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS recovery_status          recovery_status NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS recovery_updated_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id        TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Computed column: calendar days past due_at (0 when not yet due)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS days_overdue INTEGER
    GENERATED ALWAYS AS (
      CASE
        WHEN due_at < NOW() THEN GREATEST(0, EXTRACT(DAY FROM (NOW() - due_at))::INTEGER)
        ELSE 0
      END
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_invoices_recovery_status
  ON invoices(organization_id, recovery_status);

-- ─── Recovery action audit trail ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoice_recovery_actions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id            UUID        NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id           UUID        NOT NULL REFERENCES customers(id),
  action_type           TEXT        NOT NULL,
  from_recovery_status  TEXT        NOT NULL DEFAULT 'none',
  to_recovery_status    TEXT        NOT NULL,
  risk_score            INTEGER,
  client_credit_score   INTEGER,
  stripe_reminder_id    TEXT,
  urgency               TEXT,
  outreach_draft        TEXT,
  escalate_to_financing BOOLEAN     NOT NULL DEFAULT FALSE,
  reason                TEXT,
  dry_run               BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT invoice_recovery_actions_action_type_check CHECK (
    action_type IN (
      'send_reminder',
      'offer_payment_plan',
      'escalate',
      'dispute_clarification',
      'financing_flagged',
      'write_off',
      'resolve',
      'skip'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_recovery_actions_org      ON invoice_recovery_actions(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_recovery_actions_invoice  ON invoice_recovery_actions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_recovery_actions_customer ON invoice_recovery_actions(customer_id);

-- ─── Client credit scores ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_credit_scores (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID           NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id     UUID           NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  score           INTEGER        NOT NULL CHECK (score BETWEEN 300 AND 850),
  tier            TEXT           NOT NULL,
  factors_json    JSONB          NOT NULL DEFAULT '{}',
  rationale       TEXT,
  scored_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT client_credit_scores_tier_check CHECK (
    tier IN ('excellent', 'good', 'fair', 'poor', 'new_client')
  ),
  UNIQUE(organization_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_client_credit_scores_org      ON client_credit_scores(organization_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_client_credit_scores_customer ON client_credit_scores(customer_id);

-- ─── Stripe events (idempotent webhook ingest) ────────────────────────────

CREATE TABLE IF NOT EXISTS stripe_events (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_event_id   TEXT        NOT NULL,
  stripe_customer_id TEXT,
  event_type        TEXT        NOT NULL,
  payload_json      JSONB       NOT NULL DEFAULT '{}',
  processed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stripe_events_stripe_event_id
  ON stripe_events(stripe_event_id);

CREATE INDEX IF NOT EXISTS idx_stripe_events_org_type
  ON stripe_events(organization_id, event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_stripe_events_customer
  ON stripe_events(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ─── Client reminders (outbound reminder log) ─────────────────────────────

CREATE TABLE IF NOT EXISTS client_reminders (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id         UUID        NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id        UUID        NOT NULL REFERENCES customers(id),
  channel            TEXT        NOT NULL DEFAULT 'email',
  subject            TEXT,
  body               TEXT,
  stripe_reminder_id TEXT,
  status             TEXT        NOT NULL DEFAULT 'sent',
  sent_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT client_reminders_channel_check CHECK (
    channel IN ('stripe', 'email', 'sms')
  ),
  CONSTRAINT client_reminders_status_check CHECK (
    status IN ('sent', 'failed', 'mock')
  )
);

CREATE INDEX IF NOT EXISTS idx_client_reminders_org      ON client_reminders(organization_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_reminders_customer ON client_reminders(customer_id);
CREATE INDEX IF NOT EXISTS idx_client_reminders_invoice  ON client_reminders(invoice_id);

-- ─── Customer payment profile materialized view ───────────────────────────

DROP MATERIALIZED VIEW IF EXISTS customer_payment_profile;

CREATE MATERIALIZED VIEW customer_payment_profile AS
SELECT
  c.id                                                     AS customer_id,
  c.organization_id,
  c.full_name,
  c.email,
  c.risk_status,
  COUNT(i.id)                                              AS total_invoices,
  COUNT(i.id) FILTER (WHERE i.status = 'paid')             AS paid_invoices,
  COUNT(i.id) FILTER (
    WHERE i.status IN ('overdue','sent','pending')
  )                                                        AS open_invoices,
  COALESCE(
    ROUND(
      100.0
      * COUNT(i.id) FILTER (
          WHERE i.status = 'paid'
            AND i.paid_at IS NOT NULL
            AND i.paid_at <= i.due_at
        )
      / NULLIF(COUNT(i.id) FILTER (WHERE i.status = 'paid'), 0)
    , 0),
    NULL
  )                                                        AS on_time_payment_pct,
  COALESCE(
    AVG(
      CASE
        WHEN i.status = 'paid' AND i.paid_at IS NOT NULL AND i.due_at IS NOT NULL
          THEN GREATEST(0, EXTRACT(DAY FROM (i.paid_at - i.due_at)))
        ELSE NULL
      END
    )::NUMERIC(6,1),
    NULL
  )                                                        AS avg_days_late,
  COUNT(DISTINCT i.id) FILTER (
    WHERE i.status IN ('overdue','sent','pending')
      AND i.due_at < NOW()
  )                                                        AS prior_overdue_count,
  MAX(i.due_at) FILTER (WHERE i.status = 'overdue')        AS most_recent_overdue_at,
  -- Relationship length in months (from first invoice)
  COALESCE(
    (EXTRACT(YEAR FROM AGE(NOW(), MIN(i.created_at))) * 12
     + EXTRACT(MONTH FROM AGE(NOW(), MIN(i.created_at))))::INTEGER,
    0
  )                                                        AS relationship_months,
  -- Total paid amount
  COALESCE(SUM(i.amount_paid) FILTER (WHERE i.status = 'paid'), 0)
                                                           AS total_paid_amount,
  -- Total overdue amount (open past-due invoices)
  COALESCE(
    SUM(i.total_amount - i.amount_paid) FILTER (
      WHERE i.status IN ('overdue','sent','pending')
        AND i.due_at < NOW()
    ),
    0
  )                                                        AS total_overdue_amount,
  -- Total outstanding (all open invoices)
  COALESCE(
    SUM(i.total_amount - i.amount_paid) FILTER (
      WHERE i.status IN ('overdue','sent','pending')
    ),
    0
  )                                                        AS total_outstanding_amount,
  -- Prior write-offs
  COUNT(i.id) FILTER (WHERE i.recovery_status = 'written_off')
                                                           AS written_off_count
FROM customers c
LEFT JOIN invoices i
  ON i.customer_id = c.id
 AND i.organization_id = c.organization_id
GROUP BY c.id, c.organization_id, c.full_name, c.email, c.risk_status;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_payment_profile_pk
  ON customer_payment_profile(customer_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_customer_payment_profile_org
  ON customer_payment_profile(organization_id);
