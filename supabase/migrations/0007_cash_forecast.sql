-- Resq · Cash Forecast System
-- Migration: 0007_cash_forecast
-- Adds: cash_obligations, cash_receivables, refund_exposure, forecast_runs

-- ─── Cash Obligations (explicit future outflows) ──────────────────────────────

CREATE TABLE IF NOT EXISTS cash_obligations (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID           NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category          TEXT           NOT NULL,
  description       TEXT           NOT NULL,
  amount            NUMERIC(12,2)  NOT NULL,
  due_at            DATE           NOT NULL,
  recurrence        TEXT           NOT NULL DEFAULT 'once',
  is_deferrable     BOOLEAN        NOT NULL DEFAULT FALSE,
  deferred_to       DATE,
  status            TEXT           NOT NULL DEFAULT 'scheduled',
  notes             TEXT,
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT cash_obligations_category_check CHECK (
    category IN ('payroll','rent','vendor','tax','insurance','software','utilities','other')
  ),
  CONSTRAINT cash_obligations_recurrence_check CHECK (
    recurrence IN ('once','weekly','biweekly','monthly','quarterly','annual')
  ),
  CONSTRAINT cash_obligations_status_check CHECK (
    status IN ('scheduled','paid','deferred','cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_cash_obligations_org ON cash_obligations(organization_id, due_at);
CREATE INDEX IF NOT EXISTS idx_cash_obligations_status ON cash_obligations(organization_id, status);

-- ─── Cash Receivables (expected inflows) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS cash_receivables (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID           NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id        UUID           REFERENCES invoices(id),
  customer_id       UUID           REFERENCES customers(id),
  description       TEXT           NOT NULL,
  amount            NUMERIC(12,2)  NOT NULL,
  expected_date     DATE           NOT NULL,
  original_date     DATE,
  collection_lag_days INTEGER      NOT NULL DEFAULT 0,
  confidence        NUMERIC(3,2)   NOT NULL DEFAULT 1.00,
  status            TEXT           NOT NULL DEFAULT 'expected',
  notes             TEXT,
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT cash_receivables_status_check CHECK (
    status IN ('expected','collected','slipped','written_off')
  )
);

CREATE INDEX IF NOT EXISTS idx_cash_receivables_org ON cash_receivables(organization_id, expected_date);
CREATE INDEX IF NOT EXISTS idx_cash_receivables_status ON cash_receivables(organization_id, status);

-- ─── Refund Exposure (pending refund requests not yet paid) ───────────────────

CREATE TABLE IF NOT EXISTS refund_exposure (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID           NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id        UUID           REFERENCES invoices(id),
  customer_id       UUID           REFERENCES customers(id),
  description       TEXT           NOT NULL,
  amount            NUMERIC(12,2)  NOT NULL,
  requested_at      DATE           NOT NULL,
  expected_pay_date DATE,
  status            TEXT           NOT NULL DEFAULT 'pending',
  notes             TEXT,
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT refund_exposure_status_check CHECK (
    status IN ('pending','approved','paid','denied')
  )
);

CREATE INDEX IF NOT EXISTS idx_refund_exposure_org ON refund_exposure(organization_id, status);

-- ─── Forecast Runs (audit trail) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS forecast_runs (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID           NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  run_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  as_of_date        DATE           NOT NULL,
  scenario          TEXT           NOT NULL DEFAULT 'base',
  status            TEXT           NOT NULL DEFAULT 'completed',
  starting_cash     NUMERIC(12,2)  NOT NULL,
  ending_cash       NUMERIC(12,2)  NOT NULL,
  breakpoint_week   INTEGER,
  runway_weeks      INTEGER        NOT NULL,
  threshold_cash    NUMERIC(12,2)  NOT NULL,
  weekly_buckets    JSONB          NOT NULL,
  top_drivers       JSONB,
  actions           JSONB,
  input_payload     JSONB          NOT NULL,
  payload_hash      TEXT           NOT NULL,
  prev_payload_hash TEXT,
  error_payload     JSONB,
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT forecast_runs_scenario_check CHECK (
    scenario IN ('base','stress','upside')
  ),
  CONSTRAINT forecast_runs_status_check CHECK (
    status IN ('completed','failed')
  )
);

CREATE INDEX IF NOT EXISTS idx_forecast_runs_org ON forecast_runs(organization_id, run_at DESC);
