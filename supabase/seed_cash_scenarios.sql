-- ─────────────────────────────────────────────────────────────────────────
-- Cash Truth Layer — 3 seeded scenarios via obligations
--
-- Run AFTER seed.sql and seed_survival_demo.sql.
-- Idempotent. Safe to re-run.
--
-- The base seed gives us:
--   currentCash = 937.40 - 2263.21 = -1325.81  (from finance_transactions)
--   expectedInflows = 632.20 + 1308.00 + 207.10 + 207.10 + 283.40 = 2637.80
--   refundsPaid = 0 (no refund transactions in ledger)
--   refundExposure = 0 (no refund obligations)
--
-- SCENARIO 1 — "Healthy" (default seed, no obligations)
--   expectedOutflows = 0
--   projectedEndingCash = -1325.81 + 2637.80 - 0 - 0 = 1311.99
--   No breakpoint.
--
-- SCENARIO 2 — "Tight" (add moderate obligations)
--   We add $2,400 in obligations spread across weeks 1-4.
--   projectedEndingCash = -1325.81 + 2637.80 - 2400 - 0 = -1088.01
--   Breakpoint: depends on when obligations land vs inflows.
--
-- SCENARIO 3 — "Week-4 shortfall" (add heavy obligations + refund exposure)
--   We add $3,200 in obligations with a $800 lump in week 4, plus $150 refund exposure.
--   projectedEndingCash = -1325.81 + 2637.80 - 3200 - 150 = -2038.01
--   Clear breakpoint at week 4.
--
-- To switch scenarios: DELETE FROM obligations WHERE organization_id = '...'
-- then INSERT the scenario you want.
-- ─────────────────────────────────────────────────────────────────────────

-- Ensure the table exists (migration 006 must have run)
-- This seed only inserts obligations rows.

-- ─── SCENARIO: Tight cash ─────────────────────────────────────────────────
-- Uncomment this block and comment out the others to seed "tight" scenario.
-- Or run all three and filter by notes prefix in tests.

-- Rent due week 2
INSERT INTO obligations (id, organization_id, label, category, amount, due_at, recurring, status, notes) VALUES
  ('00000000-0000-0000-00c0-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Monthly rent — April', 'rent', 1200.00,
   (CURRENT_DATE + INTERVAL '8 days')::date,
   TRUE, 'upcoming', 'scenario:tight')
ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, due_at = EXCLUDED.due_at, status = EXCLUDED.status, notes = EXCLUDED.notes, updated_at = NOW();

-- Payroll due week 3
INSERT INTO obligations (id, organization_id, label, category, amount, due_at, recurring, status, notes) VALUES
  ('00000000-0000-0000-00c0-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'Bi-weekly payroll', 'payroll', 800.00,
   (CURRENT_DATE + INTERVAL '15 days')::date,
   TRUE, 'upcoming', 'scenario:tight')
ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, due_at = EXCLUDED.due_at, status = EXCLUDED.status, notes = EXCLUDED.notes, updated_at = NOW();

-- Insurance premium due week 4
INSERT INTO obligations (id, organization_id, label, category, amount, due_at, recurring, status, notes) VALUES
  ('00000000-0000-0000-00c0-000000000003',
   '00000000-0000-0000-0000-000000000001',
   'Insurance premium — Q2', 'insurance', 400.00,
   (CURRENT_DATE + INTERVAL '22 days')::date,
   FALSE, 'upcoming', 'scenario:tight')
ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, due_at = EXCLUDED.due_at, status = EXCLUDED.status, notes = EXCLUDED.notes, updated_at = NOW();

-- ─── SCENARIO: Week-4 shortfall (adds on top of tight) ───────────────────

-- Large vendor payment due week 4
INSERT INTO obligations (id, organization_id, label, category, amount, due_at, recurring, status, notes) VALUES
  ('00000000-0000-0000-00c0-000000000004',
   '00000000-0000-0000-0000-000000000001',
   'Vendor payment — Prime Provisions', 'vendor', 800.00,
   (CURRENT_DATE + INTERVAL '25 days')::date,
   FALSE, 'upcoming', 'scenario:shortfall')
ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, due_at = EXCLUDED.due_at, status = EXCLUDED.status, notes = EXCLUDED.notes, updated_at = NOW();

-- Refund exposure (pending, not yet paid)
INSERT INTO obligations (id, organization_id, label, category, amount, due_at, recurring, status, notes) VALUES
  ('00000000-0000-0000-00c0-000000000005',
   '00000000-0000-0000-0000-000000000001',
   'Pending refund — Carlos Reyes dispute', 'refund', 150.00,
   (CURRENT_DATE + INTERVAL '3 days')::date,
   FALSE, 'upcoming', 'scenario:shortfall')
ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, due_at = EXCLUDED.due_at, status = EXCLUDED.status, notes = EXCLUDED.notes, updated_at = NOW();
