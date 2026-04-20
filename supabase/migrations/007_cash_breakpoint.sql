-- Resq · Cash Breakpoint Agent
-- Migration: 007_cash_breakpoint
-- Adds cash_obligations and cash_forecast_snapshots tables for
-- 13-week cash forecasting, breakpoint detection, and deviation tracking.

-- ─── cash_obligations ─────────────────────────────────────────────────────────
-- Stores future committed outflows (payroll, rent, tax, vendor bills).

CREATE TABLE IF NOT EXISTS cash_obligations (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID           NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category         TEXT           NOT NULL,
  description      TEXT           NOT NULL,
  amount           NUMERIC(12, 2) NOT NULL,
  due_at           TIMESTAMPTZ    NOT NULL,
  recurrence       TEXT           NOT NULL DEFAULT 'one_time',
  is_active        BOOLEAN        NOT NULL DEFAULT TRUE,
  notes            TEXT,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT cash_obligations_category_check CHECK (
    category IN ('payroll', 'rent', 'tax', 'vendor_bill', 'insurance', 'loan_payment', 'other')
  ),
  CONSTRAINT cash_obligations_recurrence_check CHECK (
    recurrence IN ('one_time', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual')
  )
);

CREATE INDEX IF NOT EXISTS idx_cash_obligations_org
  ON cash_obligations(organization_id, due_at);
CREATE INDEX IF NOT EXISTS idx_cash_obligations_active
  ON cash_obligations(organization_id, is_active)
  WHERE is_active = TRUE;

-- ─── cash_forecast_snapshots ──────────────────────────────────────────────────
-- Stores serialized forecast run results for deviation detection and
-- historical comparison.

CREATE TABLE IF NOT EXISTS cash_forecast_snapshots (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID           NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  forecast_json     JSONB          NOT NULL,
  breakpoint_week   INTEGER,
  breakpoint_amount NUMERIC(12, 2),
  threshold_used    NUMERIC(12, 2) NOT NULL,
  scenario_type     TEXT           NOT NULL DEFAULT 'base',
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT cash_forecast_snapshots_scenario_check CHECK (
    scenario_type IN ('base', 'stress', 'upside')
  )
);

CREATE INDEX IF NOT EXISTS idx_cash_forecast_snapshots_org
  ON cash_forecast_snapshots(organization_id, created_at DESC);
