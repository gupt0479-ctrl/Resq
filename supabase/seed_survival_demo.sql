-- ─────────────────────────────────────────────────────────────────────────
-- SMB Survival Agent — demo addon seed
--
-- STORYLINE (judges' 5-minute arc):
--   1. Ember Table has an overdue receivable (base seed: Carlos, 11 days
--      late). Cashflow stress is already visible on /dashboard + /finance.
--   2. The TinyFish "survival agent" scouts 3 financing offers to bridge it.
--   3. Same agent compares vendor costs, flags an 18.4% tomato spike, and
--      surfaces a cheaper supplier.
--   4. Same agent scans insurance renewal, warns +16.4% premium, and lists
--      two comparable carriers.
--   5. Manager reviews the AI action timeline, which is exactly what this
--      seed primes.
--
-- GUARANTEES:
--   - Additive only. Does not modify or delete base-seed rows.
--   - Idempotent. Safe to run after supabase/seed.sql, and safe to re-run.
--   - Does not require teammate page changes.
--   - Does not create invoices/appointments (avoids FK risk).
-- ─────────────────────────────────────────────────────────────────────────

-- ─── Organization (safety net if base seed has not run) ──────────────────
INSERT INTO organizations (id, name, slug, timezone) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Ember Table', 'ember-table', 'America/Chicago')
ON CONFLICT (id) DO NOTHING;

-- ─── TinyFish connector (provider is UNIQUE per org) ─────────────────────
-- Use a deterministic id, conflict on (organization_id, provider).
INSERT INTO integration_connectors (
  id, organization_id, provider, display_name, status, last_sync_at, last_error, config_json
) VALUES (
  '00000000-0000-0000-0009-00000000000a',
  '00000000-0000-0000-0000-000000000001',
  'tinyfish',
  'TinyFish Web Agent',
  'connected',
  NOW(),
  NULL,
  '{"scenarios": ["financing", "vendor", "insurance", "full_survival_scan"], "mode": "demo"}'::jsonb
)
ON CONFLICT (organization_id, provider) DO UPDATE
SET display_name = EXCLUDED.display_name,
    status       = EXCLUDED.status,
    last_sync_at = EXCLUDED.last_sync_at,
    last_error   = EXCLUDED.last_error,
    config_json  = EXCLUDED.config_json,
    updated_at   = NOW();

-- ─── Stripe connector (reinforces finance story) ─────────────────────────
INSERT INTO integration_connectors (
  id, organization_id, provider, display_name, status, last_sync_at, last_error, config_json
) VALUES (
  '00000000-0000-0000-0009-00000000000b',
  '00000000-0000-0000-0000-000000000001',
  'stripe',
  'Stripe',
  'connected',
  NOW() - INTERVAL '45 minutes',
  NULL,
  '{}'::jsonb
)
ON CONFLICT (organization_id, provider) DO UPDATE
SET display_name = EXCLUDED.display_name,
    status       = EXCLUDED.status,
    last_sync_at = EXCLUDED.last_sync_at,
    last_error   = EXCLUDED.last_error,
    updated_at   = NOW();

-- ─── ai_actions timeline for the survival agent ──────────────────────────
-- entity_id must be UUID NOT NULL. Use deterministic UUIDs in the
-- 0x...000A namespace so repeat demo runs collapse onto the same rows.
-- Timestamps are set intentionally so the UI timeline reads:
--   (newest → oldest) full_survival_scan → insurance → vendor → financing
-- i.e. scan-first briefing with drilldowns underneath.

INSERT INTO ai_actions (
  id, organization_id, entity_type, entity_id, trigger_type, action_type,
  input_summary, output_payload_json, status, created_at, executed_at
) VALUES
  -- 1. Financing (oldest)
  ('00000000-0000-0000-000b-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'survival_agent',
   '00000000-0000-0000-000a-000000000001',
   'tinyfish.demo_run',
   'financing_options_scouted',
   'scenario=financing reason=overdue_receivable_bridge',
   '{
      "summary": "Three financing options surfaced.",
      "offers": [
        {"lender": "BlueHarbor Capital",   "aprPercent": 11.9, "termMonths": 12, "maxAmountUsd": 75000,  "decisionSpeed": "48 hours"},
        {"lender": "Kabbage-Lite Line",    "aprPercent": 14.4, "termMonths": 6,  "maxAmountUsd": 40000,  "decisionSpeed": "24 hours"},
        {"lender": "Backer SMB Loans",     "aprPercent": 9.25, "termMonths": 60, "maxAmountUsd": 150000, "decisionSpeed": "14 days"}
      ]
    }'::jsonb,
   'executed',
   NOW() - INTERVAL '35 minutes',
   NOW() - INTERVAL '35 minutes'),

  -- 2. Vendor costs
  ('00000000-0000-0000-000b-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'survival_agent',
   '00000000-0000-0000-000a-000000000002',
   'tinyfish.demo_run',
   'vendor_costs_compared',
   'scenario=vendor skus=produce,beverage',
   '{
      "summary": "Tomato case +18.4%. Harvest Direct is $13.60 cheaper per case.",
      "deltas": [
        {"category": "produce",  "sku": "heirloom-tomatoes-case-20lb", "currentUnitUsd": 72.50, "alternativeUnitUsd": 58.90, "estMonthlySavings": 299.20},
        {"category": "beverage", "sku": "sparkling-water-24pk",        "currentUnitUsd": 19.80, "alternativeUnitUsd": 17.25, "estMonthlySavings": 122.40}
      ],
      "estMonthlySavingsUsd": 421.60
    }'::jsonb,
   'executed',
   NOW() - INTERVAL '25 minutes',
   NOW() - INTERVAL '25 minutes'),

  -- 3. Insurance renewal
  ('00000000-0000-0000-000b-000000000003',
   '00000000-0000-0000-0000-000000000001',
   'survival_agent',
   '00000000-0000-0000-000a-000000000003',
   'tinyfish.demo_run',
   'insurance_renewal_checked',
   'scenario=insurance policy=BOP+GL',
   '{
      "summary": "Renewal +16.4%. BrightPath SMB quoted ~$260 cheaper.",
      "policy": "General Liability + BOP",
      "carrier": "Meridian Mutual",
      "currentAnnualPremiumUsd": 8400,
      "renewalAnnualPremiumUsd": 9780,
      "deltaPercent": 0.164,
      "renewalDate": "2026-06-01",
      "comparableCarriers": [
        {"carrier": "Hartford Alliance", "estAnnualPremiumUsd": 8600},
        {"carrier": "BrightPath SMB",    "estAnnualPremiumUsd": 8120}
      ]
    }'::jsonb,
   'executed',
   NOW() - INTERVAL '15 minutes',
   NOW() - INTERVAL '15 minutes'),

  -- 4. Full survival scan (newest — appears first in timeline)
  ('00000000-0000-0000-000b-000000000004',
   '00000000-0000-0000-0000-000000000001',
   'survival_agent',
   '00000000-0000-0000-000a-000000000004',
   'tinyfish.demo_run',
   'survival_scan_completed',
   'scenario=full_survival_scan',
   '{
      "summary": "3 financing offers, 2 vendor savings plays, 1 insurance renewal warning.",
      "highlights": [
        "BlueHarbor 48h offer available to bridge Carlos overdue receivable",
        "Tomato case 18.4% spike; cheaper supplier identified",
        "Insurance renewal +16.4%; shop before May 15"
      ]
    }'::jsonb,
   'executed',
   NOW() - INTERVAL '5 minutes',
   NOW() - INTERVAL '5 minutes')
ON CONFLICT (id) DO UPDATE
SET organization_id     = EXCLUDED.organization_id,
    entity_type         = EXCLUDED.entity_type,
    entity_id           = EXCLUDED.entity_id,
    trigger_type        = EXCLUDED.trigger_type,
    action_type         = EXCLUDED.action_type,
    input_summary       = EXCLUDED.input_summary,
    output_payload_json = EXCLUDED.output_payload_json,
    status              = EXCLUDED.status,
    executed_at         = EXCLUDED.executed_at;
