-- Resq · Feedback domain + follow-up actions (additive after 003)
-- Do not modify 0001_core_ledger.sql

-- ─── Feedback ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feedback (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id               UUID        REFERENCES customers(id) ON DELETE SET NULL,
  appointment_id            UUID        REFERENCES appointments(id) ON DELETE SET NULL,
  integration_sync_event_id UUID        REFERENCES integration_sync_events(id) ON DELETE SET NULL,

  source                    TEXT        NOT NULL DEFAULT 'internal',
  guest_name_snapshot       TEXT,
  score                     INTEGER     NOT NULL CHECK (score >= 1 AND score <= 5),
  comment                   TEXT        NOT NULL DEFAULT '',

  sentiment                 TEXT,
  topics                    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  urgency                   INTEGER     NOT NULL DEFAULT 1 CHECK (urgency >= 1 AND urgency <= 5),
  safety_flag               BOOLEAN     NOT NULL DEFAULT FALSE,
  follow_up_status          TEXT        NOT NULL DEFAULT 'none',
  flagged                   BOOLEAN     NOT NULL DEFAULT FALSE,

  reply_draft               TEXT,
  internal_note             TEXT,
  manager_summary           TEXT,
  analysis_json             JSONB,
  analysis_source           TEXT        NOT NULL DEFAULT 'none',

  external_review_id        TEXT,
  external_source           TEXT,
  received_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT feedback_follow_up_status_check CHECK (
    follow_up_status IN ('none','thankyou_sent','callback_needed','resolved')
  ),
  CONSTRAINT feedback_analysis_source_check CHECK (
    analysis_source IN ('none','model','rules_fallback','invalid_model')
  )
);

CREATE INDEX IF NOT EXISTS idx_feedback_org ON feedback(organization_id);
CREATE INDEX IF NOT EXISTS idx_feedback_org_flagged ON feedback(organization_id, flagged);
CREATE INDEX IF NOT EXISTS idx_feedback_org_received ON feedback(organization_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_customer ON feedback(customer_id);

-- Idempotent external reviews per org + source + provider review id
CREATE UNIQUE INDEX IF NOT EXISTS feedback_external_review_unique
  ON feedback(organization_id, external_source, external_review_id)
  WHERE external_review_id IS NOT NULL AND external_source IS NOT NULL;

-- ─── Follow-up actions (manager-approved workflow) ───────────────────────

CREATE TABLE IF NOT EXISTS follow_up_actions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feedback_id      UUID        NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,

  action_type        TEXT        NOT NULL,
  status             TEXT        NOT NULL DEFAULT 'pending',
  channel            TEXT        NOT NULL DEFAULT 'none',
  priority           TEXT        NOT NULL DEFAULT 'normal',
  message_draft      TEXT,
  metadata_json      JSONB       NOT NULL DEFAULT '{}'::jsonb,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT follow_up_actions_status_check CHECK (
    status IN ('pending','approved','sent','dismissed')
  ),
  CONSTRAINT follow_up_actions_channel_check CHECK (
    channel IN ('email','sms','phone','none')
  ),
  CONSTRAINT follow_up_actions_priority_check CHECK (
    priority IN ('low','normal','high','urgent')
  )
);

CREATE INDEX IF NOT EXISTS idx_follow_up_actions_feedback ON follow_up_actions(feedback_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_actions_org ON follow_up_actions(organization_id, created_at DESC);
