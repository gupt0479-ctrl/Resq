-- Resq · Cash truth layer
-- Migration: 006_cash_truth
-- Adds obligations table for known future outflows (rent, payroll, insurance, etc.)

CREATE TABLE IF NOT EXISTS obligations (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID           NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  label           TEXT           NOT NULL,
  category        TEXT           NOT NULL DEFAULT 'other',
  amount          NUMERIC(12, 2) NOT NULL,
  due_at          DATE           NOT NULL,
  recurring       BOOLEAN        NOT NULL DEFAULT FALSE,
  recurrence_rule TEXT,
  status          TEXT           NOT NULL DEFAULT 'upcoming',
  notes           TEXT,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT obligations_status_check CHECK (
    status IN ('upcoming', 'paid', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_obligations_org ON obligations(organization_id, due_at);
CREATE INDEX IF NOT EXISTS idx_obligations_org_status ON obligations(organization_id, status);
