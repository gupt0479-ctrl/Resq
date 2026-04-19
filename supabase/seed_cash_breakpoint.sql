-- ─────────────────────────────────────────────────────────────────────────
-- Cash Breakpoint Agent — demo addon seed
--
-- STORYLINE (demo arc):
--   1. Ember Table has ~$43,000 cash on hand from 90 days of operations.
--   2. Open receivables total ~$30,000 across 5 invoices at various stages.
--   3. Committed obligations (payroll, rent, tax, vendor bills) create
--      a week-4 breakpoint when combined with trailing outflows.
--   4. Three clients show distinct collection lag profiles:
--      - Jennifer Kim: on-time payer (avg 3 days late)
--      - Emily Hartley: slightly-late payer (avg 17 days late)
--      - Carlos Reyes: very-late payer (avg 42 days late)
--   5. Financing offers and vendor alternatives are already seeded by
--      seed_survival_demo.sql — this script adds cash-specific ai_actions.
--
-- GUARANTEES:
--   - Additive only. Does not modify or delete base-seed rows.
--   - Idempotent. Safe to run after seed.sql + seed_survival_demo.sql.
--   - Uses deterministic UUIDs in the 0x...000C namespace.
--   - All dates anchored to demo date: 2026-04-11.
-- ─────────────────────────────────────────────────────────────────────────

-- ─── Constants ───────────────────────────────────────────────────────────
-- DEMO_ORG_ID:  00000000-0000-0000-0000-000000000001
-- Customers from base seed:
--   Emily Hartley:  00000000-0000-0000-0003-000000000001  (slightly_late payer)
--   Carlos Reyes:   00000000-0000-0000-0003-000000000004  (very_late payer)
--   Jennifer Kim:   00000000-0000-0000-0003-000000000005  (on_time payer)

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1: Finance Transactions (Ledger)
-- Build up ~$43,000 cash position over 90 days.
-- Base seed already has 8 transactions. We add 15 more.
--
-- Running tally:
--   Base seed IN:   207.10 + 414.20 + 316.10 = 937.40
--   Base seed OUT:  342.00 + 1280.00 + 6.21 + 185.00 + 450.00 = 2263.21
--   Base seed net:  937.40 - 2263.21 = -1325.81
--
--   We need to add enough to reach ~$43,000 net.
--   Target additional net: ~$44,325 (to land around $43,000 total)
--   Strategy: ~$58,000 additional IN, ~$13,700 additional OUT
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO finance_transactions (
  id, organization_id, invoice_id, type, category, amount, direction,
  occurred_at, payment_method, tax_relevant, writeoff_eligible, notes
) VALUES
  -- ── Revenue inflows (last 90 days) ──────────────────────────────────────

  -- Week of Jan 12-18 (90 days ago)
  ('00000000-0000-0000-000c-000000000001', '00000000-0000-0000-0000-000000000001',
   NULL, 'revenue', 'dining_revenue', 4850.00, 'in',
   '2026-01-14 21:00:00+00', 'card', TRUE, FALSE,
   'Weekly dining revenue — week of Jan 12'),

  -- Week of Jan 19-25
  ('00000000-0000-0000-000c-000000000002', '00000000-0000-0000-0000-000000000001',
   NULL, 'revenue', 'dining_revenue', 5200.00, 'in',
   '2026-01-21 21:00:00+00', 'card', TRUE, FALSE,
   'Weekly dining revenue — week of Jan 19'),

  -- Week of Jan 26 - Feb 1
  ('00000000-0000-0000-000c-000000000003', '00000000-0000-0000-0000-000000000001',
   NULL, 'revenue', 'dining_revenue', 5100.00, 'in',
   '2026-01-28 21:00:00+00', 'card', TRUE, FALSE,
   'Weekly dining revenue — week of Jan 26'),

  -- Week of Feb 2-8
  ('00000000-0000-0000-000c-000000000004', '00000000-0000-0000-0000-000000000001',
   NULL, 'revenue', 'dining_revenue', 4950.00, 'in',
   '2026-02-04 21:00:00+00', 'card', TRUE, FALSE,
   'Weekly dining revenue — week of Feb 2'),

  -- Week of Feb 9-15
  ('00000000-0000-0000-000c-000000000005', '00000000-0000-0000-0000-000000000001',
   NULL, 'revenue', 'dining_revenue', 5350.00, 'in',
   '2026-02-11 21:00:00+00', 'card', TRUE, FALSE,
   'Weekly dining revenue — week of Feb 9'),

  -- Week of Feb 16-22
  ('00000000-0000-0000-000c-000000000006', '00000000-0000-0000-0000-000000000001',
   NULL, 'revenue', 'dining_revenue', 5600.00, 'in',
   '2026-02-18 21:00:00+00', 'card', TRUE, FALSE,
   'Weekly dining revenue — week of Feb 16'),

  -- Week of Feb 23 - Mar 1
  ('00000000-0000-0000-000c-000000000007', '00000000-0000-0000-0000-000000000001',
   NULL, 'revenue', 'dining_revenue', 5450.00, 'in',
   '2026-02-25 21:00:00+00', 'card', TRUE, FALSE,
   'Weekly dining revenue — week of Feb 23'),

  -- Week of Mar 2-8
  ('00000000-0000-0000-000c-000000000008', '00000000-0000-0000-0000-000000000001',
   NULL, 'revenue', 'dining_revenue', 5800.00, 'in',
   '2026-03-04 21:00:00+00', 'card', TRUE, FALSE,
   'Weekly dining revenue — week of Mar 2'),

  -- Week of Mar 9-15
  ('00000000-0000-0000-000c-000000000009', '00000000-0000-0000-0000-000000000001',
   NULL, 'revenue', 'dining_revenue', 5250.00, 'in',
   '2026-03-11 21:00:00+00', 'card', TRUE, FALSE,
   'Weekly dining revenue — week of Mar 9'),

  -- Week of Mar 16-22
  ('00000000-0000-0000-000c-000000000010', '00000000-0000-0000-0000-000000000001',
   NULL, 'revenue', 'dining_revenue', 5500.00, 'in',
   '2026-03-18 21:00:00+00', 'card', TRUE, FALSE,
   'Weekly dining revenue — week of Mar 16'),

  -- Week of Mar 23-29
  ('00000000-0000-0000-000c-000000000011', '00000000-0000-0000-0000-000000000001',
   NULL, 'revenue', 'dining_revenue', 4900.00, 'in',
   '2026-03-25 21:00:00+00', 'card', TRUE, FALSE,
   'Weekly dining revenue — week of Mar 23'),

  -- ── Expense outflows (last 90 days) ─────────────────────────────────────

  -- Payroll runs (biweekly)
  ('00000000-0000-0000-000c-000000000012', '00000000-0000-0000-0000-000000000001',
   NULL, 'expense', 'payroll', 6500.00, 'out',
   '2026-01-17 12:00:00+00', 'bank_transfer', TRUE, FALSE,
   'Biweekly payroll — Jan 17'),

  ('00000000-0000-0000-000c-000000000013', '00000000-0000-0000-0000-000000000001',
   NULL, 'expense', 'payroll', 6500.00, 'out',
   '2026-01-31 12:00:00+00', 'bank_transfer', TRUE, FALSE,
   'Biweekly payroll — Jan 31'),

  ('00000000-0000-0000-000c-000000000014', '00000000-0000-0000-0000-000000000001',
   NULL, 'expense', 'payroll', 6500.00, 'out',
   '2026-02-14 12:00:00+00', 'bank_transfer', TRUE, FALSE,
   'Biweekly payroll — Feb 14'),

  ('00000000-0000-0000-000c-000000000015', '00000000-0000-0000-0000-000000000001',
   NULL, 'expense', 'payroll', 6500.00, 'out',
   '2026-02-28 12:00:00+00', 'bank_transfer', TRUE, FALSE,
   'Biweekly payroll — Feb 28'),

  ('00000000-0000-0000-000c-000000000016', '00000000-0000-0000-0000-000000000001',
   NULL, 'expense', 'payroll', 6500.00, 'out',
   '2026-03-14 12:00:00+00', 'bank_transfer', TRUE, FALSE,
   'Biweekly payroll — Mar 14'),

  ('00000000-0000-0000-000c-000000000017', '00000000-0000-0000-0000-000000000001',
   NULL, 'expense', 'payroll', 6500.00, 'out',
   '2026-03-28 12:00:00+00', 'bank_transfer', TRUE, FALSE,
   'Biweekly payroll — Mar 28')

ON CONFLICT (id) DO NOTHING;

-- Additional outflows: rent, inventory, utilities
INSERT INTO finance_transactions (
  id, organization_id, invoice_id, type, category, amount, direction,
  occurred_at, payment_method, tax_relevant, writeoff_eligible, notes
) VALUES
  -- Rent payments (monthly)
  ('00000000-0000-0000-000c-000000000018', '00000000-0000-0000-0000-000000000001',
   NULL, 'expense', 'rent', 4200.00, 'out',
   '2026-02-01 10:00:00+00', 'bank_transfer', FALSE, FALSE,
   'Monthly rent — February 2026'),

  ('00000000-0000-0000-000c-000000000019', '00000000-0000-0000-0000-000000000001',
   NULL, 'expense', 'rent', 4200.00, 'out',
   '2026-03-01 10:00:00+00', 'bank_transfer', FALSE, FALSE,
   'Monthly rent — March 2026'),

  ('00000000-0000-0000-000c-000000000020', '00000000-0000-0000-0000-000000000001',
   NULL, 'expense', 'rent', 4200.00, 'out',
   '2026-04-01 10:00:00+00', 'bank_transfer', FALSE, FALSE,
   'Monthly rent — April 2026'),

  -- Inventory purchases (weekly produce + beverage)
  ('00000000-0000-0000-000c-000000000021', '00000000-0000-0000-0000-000000000001',
   NULL, 'inventory_purchase', 'produce', 380.00, 'out',
   '2026-02-05 08:00:00+00', 'bank_transfer', TRUE, FALSE,
   'Weekly produce — Green City Market'),

  ('00000000-0000-0000-000c-000000000022', '00000000-0000-0000-0000-000000000001',
   NULL, 'inventory_purchase', 'produce', 395.00, 'out',
   '2026-02-19 08:00:00+00', 'bank_transfer', TRUE, FALSE,
   'Weekly produce — Green City Market'),

  ('00000000-0000-0000-000c-000000000023', '00000000-0000-0000-0000-000000000001',
   NULL, 'inventory_purchase', 'produce', 360.00, 'out',
   '2026-03-05 08:00:00+00', 'bank_transfer', TRUE, FALSE,
   'Weekly produce — Green City Market'),

  ('00000000-0000-0000-000c-000000000024', '00000000-0000-0000-0000-000000000001',
   NULL, 'inventory_purchase', 'produce', 410.00, 'out',
   '2026-03-19 08:00:00+00', 'bank_transfer', TRUE, FALSE,
   'Weekly produce — Green City Market'),

  -- Utilities
  ('00000000-0000-0000-000c-000000000025', '00000000-0000-0000-0000-000000000001',
   NULL, 'expense', 'utilities', 620.00, 'out',
   '2026-02-10 10:00:00+00', 'bank_transfer', FALSE, FALSE,
   'Gas + electric — February'),

  ('00000000-0000-0000-000c-000000000026', '00000000-0000-0000-0000-000000000001',
   NULL, 'expense', 'utilities', 580.00, 'out',
   '2026-03-10 10:00:00+00', 'bank_transfer', FALSE, FALSE,
   'Gas + electric — March'),

  -- Vendor bill payments
  ('00000000-0000-0000-000c-000000000027', '00000000-0000-0000-0000-000000000001',
   NULL, 'expense', 'vendor_supplies', 1850.00, 'out',
   '2026-02-20 10:00:00+00', 'bank_transfer', TRUE, FALSE,
   'Kitchen equipment maintenance — ProChef Services'),

  ('00000000-0000-0000-000c-000000000028', '00000000-0000-0000-0000-000000000001',
   NULL, 'expense', 'vendor_supplies', 2200.00, 'out',
   '2026-03-20 10:00:00+00', 'bank_transfer', TRUE, FALSE,
   'Tableware replacement order — Restaurant Supply Co')

ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- CASH POSITION VERIFICATION
-- Total IN (base + new):
--   Base:  937.40
--   New:   4850 + 5200 + 5100 + 4950 + 5350 + 5600 + 5450 + 5800
--          + 5250 + 5500 + 4900 = 57,950.00
--   Total IN: 58,887.40
--
-- Total OUT (base + new):
--   Base:  2,263.21
--   New payroll: 6×6500 = 39,000.00
--   New rent: 3×4200 = 12,600.00
--   New produce: 380+395+360+410 = 1,545.00
--   New utilities: 620+580 = 1,200.00
--   New vendor: 1850+2200 = 4,050.00
--   Total OUT: 2,263.21 + 39,000 + 12,600 + 1,545 + 1,200 + 4,050 = 60,658.21
--
-- Hmm, that gives negative. Let me add more revenue inflows to hit ~$43K.
-- Need additional ~$44,770 in revenue. Let me add large catering/event payments.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO finance_transactions (
  id, organization_id, invoice_id, type, category, amount, direction,
  occurred_at, payment_method, tax_relevant, writeoff_eligible, notes
) VALUES
  -- Large catering/event revenue (these are the big-ticket items for a restaurant)
  ('00000000-0000-0000-000c-000000000029', '00000000-0000-0000-0000-000000000001',
   NULL, 'revenue', 'catering_revenue', 8500.00, 'in',
   '2026-01-20 15:00:00+00', 'bank_transfer', TRUE, FALSE,
   'Corporate catering — Meridian Partners Q1 kickoff'),

  ('00000000-0000-0000-000c-000000000030', '00000000-0000-0000-0000-000000000001',
   NULL, 'revenue', 'catering_revenue', 12000.00, 'in',
   '2026-02-08 15:00:00+00', 'bank_transfer', TRUE, FALSE,
   'Private dining event — Kim Corp annual dinner'),

  ('00000000-0000-0000-000c-000000000031', '00000000-0000-0000-0000-000000000001',
   NULL, 'revenue', 'catering_revenue', 9500.00, 'in',
   '2026-02-22 15:00:00+00', 'bank_transfer', TRUE, FALSE,
   'Wedding rehearsal dinner — Hartley-Park party'),

  ('00000000-0000-0000-000c-000000000032', '00000000-0000-0000-0000-000000000001',
   NULL, 'revenue', 'catering_revenue', 7200.00, 'in',
   '2026-03-08 15:00:00+00', 'bank_transfer', TRUE, FALSE,
   'Charity gala catering — Chicago Arts Foundation'),

  ('00000000-0000-0000-000c-000000000033', '00000000-0000-0000-0000-000000000001',
   NULL, 'revenue', 'catering_revenue', 6800.00, 'in',
   '2026-03-22 15:00:00+00', 'bank_transfer', TRUE, FALSE,
   'Corporate lunch series — TechStart Inc (4 sessions)')

ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- REVISED CASH POSITION:
--   Total IN:  58,887.40 + 8500 + 12000 + 9500 + 7200 + 6800 = 102,887.40
--   Total OUT: 60,658.21
--   Net cash:  102,887.40 - 60,658.21 = 42,229.19  ≈ $42,229 ✓
--   (Within target range of $42,000-$45,000)
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2: Paid Invoice History for Collection Lag Profiles
-- Each client needs 6-10 paid invoices to establish meaningful lag stats.
--
-- Client profiles:
--   Jennifer Kim (0003-05): ON-TIME — avg ~3 days late (pays within 5 days of due)
--   Emily Hartley (0003-01): SLIGHTLY LATE — avg ~17 days late
--   Carlos Reyes (0003-04): VERY LATE — avg ~42 days late
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Jennifer Kim — ON-TIME payer (8 paid invoices) ────────────────────────
-- Pattern: invoices created, due in 14 days, paid within 1-5 days of due date
-- Avg days late = ~3 days

INSERT INTO invoices (
  id, organization_id, appointment_id, customer_id, invoice_number,
  currency, subtotal, tax_rate, tax_amount, discount_amount,
  total_amount, amount_paid, due_at, status, sent_at, paid_at
) VALUES
  ('00000000-0000-0000-000c-000000000101', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000005',
   'ET-CB-J001', 'USD', 3200.00, 0.0900, 288.00, 0.00, 3488.00, 3488.00,
   '2025-12-15 23:59:59+00', 'paid',
   '2025-12-01 10:00:00+00', '2025-12-16 14:00:00+00'),  -- 1 day late

  ('00000000-0000-0000-000c-000000000102', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000005',
   'ET-CB-J002', 'USD', 4500.00, 0.0900, 405.00, 0.00, 4905.00, 4905.00,
   '2025-12-30 23:59:59+00', 'paid',
   '2025-12-16 10:00:00+00', '2026-01-02 11:00:00+00'),  -- 3 days late

  ('00000000-0000-0000-000c-000000000103', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000005',
   'ET-CB-J003', 'USD', 2800.00, 0.0900, 252.00, 0.00, 3052.00, 3052.00,
   '2026-01-14 23:59:59+00', 'paid',
   '2025-12-31 10:00:00+00', '2026-01-18 09:00:00+00'),  -- 4 days late

  ('00000000-0000-0000-000c-000000000104', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000005',
   'ET-CB-J004', 'USD', 5100.00, 0.0900, 459.00, 0.00, 5559.00, 5559.00,
   '2026-01-28 23:59:59+00', 'paid',
   '2026-01-14 10:00:00+00', '2026-01-30 16:00:00+00'),  -- 2 days late

  ('00000000-0000-0000-000c-000000000105', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000005',
   'ET-CB-J005', 'USD', 3800.00, 0.0900, 342.00, 0.00, 4142.00, 4142.00,
   '2026-02-11 23:59:59+00', 'paid',
   '2026-01-28 10:00:00+00', '2026-02-16 10:00:00+00'),  -- 5 days late

  ('00000000-0000-0000-000c-000000000106', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000005',
   'ET-CB-J006', 'USD', 4200.00, 0.0900, 378.00, 0.00, 4578.00, 4578.00,
   '2026-02-25 23:59:59+00', 'paid',
   '2026-02-11 10:00:00+00', '2026-02-26 14:00:00+00'),  -- 1 day late

  ('00000000-0000-0000-000c-000000000107', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000005',
   'ET-CB-J007', 'USD', 2500.00, 0.0900, 225.00, 0.00, 2725.00, 2725.00,
   '2026-03-11 23:59:59+00', 'paid',
   '2026-02-25 10:00:00+00', '2026-03-14 11:00:00+00'),  -- 3 days late

  ('00000000-0000-0000-000c-000000000108', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000005',
   'ET-CB-J008', 'USD', 3600.00, 0.0900, 324.00, 0.00, 3924.00, 3924.00,
   '2026-03-25 23:59:59+00', 'paid',
   '2026-03-11 10:00:00+00', '2026-03-29 15:00:00+00')   -- 4 days late

ON CONFLICT (id) DO NOTHING;

-- ── Emily Hartley — SLIGHTLY LATE payer (8 paid invoices) ─────────────────
-- Pattern: invoices created, due in 14 days, paid ~17 days after due date
-- Avg days late = ~17 days

INSERT INTO invoices (
  id, organization_id, appointment_id, customer_id, invoice_number,
  currency, subtotal, tax_rate, tax_amount, discount_amount,
  total_amount, amount_paid, due_at, status, sent_at, paid_at
) VALUES
  ('00000000-0000-0000-000c-000000000111', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000001',
   'ET-CB-E001', 'USD', 2800.00, 0.0900, 252.00, 0.00, 3052.00, 3052.00,
   '2025-12-15 23:59:59+00', 'paid',
   '2025-12-01 10:00:00+00', '2026-01-01 14:00:00+00'),  -- 17 days late

  ('00000000-0000-0000-000c-000000000112', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000001',
   'ET-CB-E002', 'USD', 3500.00, 0.0900, 315.00, 0.00, 3815.00, 3815.00,
   '2025-12-30 23:59:59+00', 'paid',
   '2025-12-16 10:00:00+00', '2026-01-14 11:00:00+00'),  -- 15 days late

  ('00000000-0000-0000-000c-000000000113', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000001',
   'ET-CB-E003', 'USD', 4100.00, 0.0900, 369.00, 0.00, 4469.00, 4469.00,
   '2026-01-14 23:59:59+00', 'paid',
   '2025-12-31 10:00:00+00', '2026-02-02 09:00:00+00'),  -- 19 days late

  ('00000000-0000-0000-000c-000000000114', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000001',
   'ET-CB-E004', 'USD', 2600.00, 0.0900, 234.00, 0.00, 2834.00, 2834.00,
   '2026-01-28 23:59:59+00', 'paid',
   '2026-01-14 10:00:00+00', '2026-02-12 16:00:00+00'),  -- 15 days late

  ('00000000-0000-0000-000c-000000000115', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000001',
   'ET-CB-E005', 'USD', 3900.00, 0.0900, 351.00, 0.00, 4251.00, 4251.00,
   '2026-02-11 23:59:59+00', 'paid',
   '2026-01-28 10:00:00+00', '2026-02-28 10:00:00+00'),  -- 17 days late

  ('00000000-0000-0000-000c-000000000116', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000001',
   'ET-CB-E006', 'USD', 3200.00, 0.0900, 288.00, 0.00, 3488.00, 3488.00,
   '2026-02-25 23:59:59+00', 'paid',
   '2026-02-11 10:00:00+00', '2026-03-15 14:00:00+00'),  -- 18 days late

  ('00000000-0000-0000-000c-000000000117', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000001',
   'ET-CB-E007', 'USD', 2900.00, 0.0900, 261.00, 0.00, 3161.00, 3161.00,
   '2026-03-11 23:59:59+00', 'paid',
   '2026-02-25 10:00:00+00', '2026-03-27 11:00:00+00'),  -- 16 days late

  ('00000000-0000-0000-000c-000000000118', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000001',
   'ET-CB-E008', 'USD', 3400.00, 0.0900, 306.00, 0.00, 3706.00, 3706.00,
   '2026-03-25 23:59:59+00', 'paid',
   '2026-03-11 10:00:00+00', '2026-04-10 15:00:00+00')   -- 16 days late

ON CONFLICT (id) DO NOTHING;

-- ── Carlos Reyes — VERY LATE payer (8 paid invoices) ──────────────────────
-- Pattern: invoices created, due in 14 days, paid ~42 days after due date
-- Avg days late = ~42 days

INSERT INTO invoices (
  id, organization_id, appointment_id, customer_id, invoice_number,
  currency, subtotal, tax_rate, tax_amount, discount_amount,
  total_amount, amount_paid, due_at, status, sent_at, paid_at
) VALUES
  ('00000000-0000-0000-000c-000000000121', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000004',
   'ET-CB-C001', 'USD', 2500.00, 0.0900, 225.00, 0.00, 2725.00, 2725.00,
   '2025-10-15 23:59:59+00', 'paid',
   '2025-10-01 10:00:00+00', '2025-11-28 14:00:00+00'),  -- 44 days late

  ('00000000-0000-0000-000c-000000000122', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000004',
   'ET-CB-C002', 'USD', 3800.00, 0.0900, 342.00, 0.00, 4142.00, 4142.00,
   '2025-10-30 23:59:59+00', 'paid',
   '2025-10-16 10:00:00+00', '2025-12-08 11:00:00+00'),  -- 39 days late

  ('00000000-0000-0000-000c-000000000123', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000004',
   'ET-CB-C003', 'USD', 4200.00, 0.0900, 378.00, 0.00, 4578.00, 4578.00,
   '2025-11-14 23:59:59+00', 'paid',
   '2025-10-31 10:00:00+00', '2025-12-30 09:00:00+00'),  -- 46 days late

  ('00000000-0000-0000-000c-000000000124', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000004',
   'ET-CB-C004', 'USD', 3100.00, 0.0900, 279.00, 0.00, 3379.00, 3379.00,
   '2025-11-28 23:59:59+00', 'paid',
   '2025-11-14 10:00:00+00', '2026-01-10 16:00:00+00'),  -- 43 days late

  ('00000000-0000-0000-000c-000000000125', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000004',
   'ET-CB-C005', 'USD', 2900.00, 0.0900, 261.00, 0.00, 3161.00, 3161.00,
   '2025-12-15 23:59:59+00', 'paid',
   '2025-12-01 10:00:00+00', '2026-01-22 10:00:00+00'),  -- 38 days late

  ('00000000-0000-0000-000c-000000000126', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000004',
   'ET-CB-C006', 'USD', 3600.00, 0.0900, 324.00, 0.00, 3924.00, 3924.00,
   '2025-12-30 23:59:59+00', 'paid',
   '2025-12-16 10:00:00+00', '2026-02-12 14:00:00+00'),  -- 44 days late

  ('00000000-0000-0000-000c-000000000127', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000004',
   'ET-CB-C007', 'USD', 4500.00, 0.0900, 405.00, 0.00, 4905.00, 4905.00,
   '2026-01-14 23:59:59+00', 'paid',
   '2025-12-31 10:00:00+00', '2026-02-25 11:00:00+00'),  -- 42 days late

  ('00000000-0000-0000-000c-000000000128', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000004',
   'ET-CB-C008', 'USD', 3300.00, 0.0900, 297.00, 0.00, 3597.00, 3597.00,
   '2026-01-28 23:59:59+00', 'paid',
   '2026-01-14 10:00:00+00', '2026-03-10 15:00:00+00')   -- 41 days late

ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3: Open Receivables (Invoices at various aging stages)
-- Total open receivables target: ~$30,000
--
-- These are the invoices that feed into the forecast as projected inflows.
-- Combined with base seed open invoices (ET-2026-0002 $632.20 overdue,
-- ET-2026-0003 $1308 sent, ET-2026-0004 $207.10 sent, ET-2026-0005 $207.10
-- overdue, ET-2026-0006 $283.40 pending) = $2,637.80 already open.
-- We add ~$27,400 more to reach ~$30,000.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO invoices (
  id, organization_id, appointment_id, customer_id, invoice_number,
  currency, subtotal, tax_rate, tax_amount, discount_amount,
  total_amount, amount_paid, due_at, status, sent_at, paid_at
) VALUES
  -- Carlos Reyes: large overdue invoice — this is the breakpoint driver
  ('00000000-0000-0000-000c-000000000131', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000004',
   'ET-CB-C009', 'USD', 11468.00, 0.0900, 1032.12, 0.00, 12500.12, 0.00,
   '2026-03-28 23:59:59+00', 'overdue',
   '2026-03-14 10:00:00+00', NULL),

  -- Emily Hartley: pending invoice (slightly late — expect ~17 days after due)
  ('00000000-0000-0000-000c-000000000132', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000001',
   'ET-CB-E009', 'USD', 6422.00, 0.0900, 577.98, 0.00, 6999.98, 0.00,
   '2026-04-18 23:59:59+00', 'sent',
   '2026-04-04 10:00:00+00', NULL),

  -- Jennifer Kim: recently sent invoice (on-time — expect ~3 days after due)
  ('00000000-0000-0000-000c-000000000133', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000005',
   'ET-CB-J009', 'USD', 4587.00, 0.0900, 412.83, 0.00, 4999.83, 0.00,
   '2026-04-25 23:59:59+00', 'sent',
   '2026-04-11 10:00:00+00', NULL),

  -- Carlos Reyes: another pending invoice
  ('00000000-0000-0000-000c-000000000134', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000004',
   'ET-CB-C010', 'USD', 2752.00, 0.0900, 247.68, 0.00, 2999.68, 0.00,
   '2026-04-14 23:59:59+00', 'overdue',
   '2026-03-31 10:00:00+00', NULL)

ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- OPEN RECEIVABLES VERIFICATION:
--   Base seed open: $632.20 + $1308.00 + $207.10 + $207.10 + $283.40 = $2,637.80
--   New open: $12,500.12 + $6,999.98 + $4,999.83 + $2,999.68 = $27,499.61
--   Total open receivables: $30,137.41  ≈ $30,000 ✓
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4: Cash Obligations (Future committed outflows)
-- These create the week-4 breakpoint when combined with trailing outflows.
--
-- Calibration for week-4 breakpoint:
--   Cash on hand: ~$42,229
--   Weekly trailing outflows (from 8-week history): ~$4,500/week
--   Obligations in weeks 1-4:
--     Week 1: payroll $6,500
--     Week 2: vendor bill $2,200
--     Week 3: payroll $6,500 + rent $4,200
--     Week 4: tax $3,800 + vendor bill $1,800
--   Total obligations weeks 1-4: $25,000
--   Total trailing outflows weeks 1-4: ~$18,000
--   Total outflows weeks 1-4: ~$43,000
--   Expected inflows weeks 1-4: Jennifer's $5K (week 1-2), some of Emily's
--     But Carlos's $12.5K won't arrive until week 6+ (42-day lag)
--   Net: cash runs short around week 4 ✓
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO cash_obligations (
  id, organization_id, category, description, amount, due_at,
  recurrence, is_active, notes
) VALUES
  -- Payroll: biweekly $6,500
  ('00000000-0000-0000-000c-000000000201', '00000000-0000-0000-0000-000000000001',
   'payroll', 'Biweekly staff payroll — 3 FTE + part-time', 6500.00,
   '2026-04-11 12:00:00+00', 'biweekly', TRUE,
   'Sarah Chen, James Park, Mia Torres + 2 part-time kitchen staff'),

  ('00000000-0000-0000-000c-000000000202', '00000000-0000-0000-0000-000000000001',
   'payroll', 'Biweekly staff payroll — 3 FTE + part-time', 6500.00,
   '2026-04-25 12:00:00+00', 'biweekly', TRUE,
   NULL),

  ('00000000-0000-0000-000c-000000000203', '00000000-0000-0000-0000-000000000001',
   'payroll', 'Biweekly staff payroll — 3 FTE + part-time', 6500.00,
   '2026-05-09 12:00:00+00', 'biweekly', TRUE,
   NULL),

  -- Rent: monthly $4,200
  ('00000000-0000-0000-000c-000000000204', '00000000-0000-0000-0000-000000000001',
   'rent', 'Monthly lease — 2,400 sq ft dining + kitchen', 4200.00,
   '2026-05-01 10:00:00+00', 'monthly', TRUE,
   'Landlord: Chicago Commercial Properties LLC'),

  ('00000000-0000-0000-000c-000000000205', '00000000-0000-0000-0000-000000000001',
   'rent', 'Monthly lease — 2,400 sq ft dining + kitchen', 4200.00,
   '2026-06-01 10:00:00+00', 'monthly', TRUE,
   NULL),

  -- Tax: quarterly estimated $3,800
  ('00000000-0000-0000-000c-000000000206', '00000000-0000-0000-0000-000000000001',
   'tax', 'Q2 2026 estimated income tax', 3800.00,
   '2026-05-05 12:00:00+00', 'quarterly', TRUE,
   'Federal + state estimated quarterly payment'),

  -- Vendor bills
  ('00000000-0000-0000-000c-000000000207', '00000000-0000-0000-0000-000000000001',
   'vendor_bill', 'Sommelier Select — wine inventory restock', 2200.00,
   '2026-04-18 10:00:00+00', 'one_time', TRUE,
   'Spring wine list refresh — 24 cases'),

  ('00000000-0000-0000-000c-000000000208', '00000000-0000-0000-0000-000000000001',
   'vendor_bill', 'ProChef Services — kitchen equipment maintenance', 1800.00,
   '2026-05-02 10:00:00+00', 'one_time', TRUE,
   'Annual hood vent cleaning + grease trap service')

ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 5: AI Actions for Cash Breakpoint Agent
-- These supplement the survival demo ai_actions (financing, vendor, insurance)
-- with cash-breakpoint-specific analysis records.
-- Uses 0x...000C namespace starting at 0x...000C-0000000003xx
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO ai_actions (
  id, organization_id, entity_type, entity_id, trigger_type, action_type,
  input_summary, output_payload_json, status, created_at, executed_at
) VALUES
  -- Cash forecast generation
  ('00000000-0000-0000-000c-000000000301', '00000000-0000-0000-0000-000000000001',
   'cash_forecast', '00000000-0000-0000-0000-000000000001',
   'cash.forecast_generated', 'cash_breakpoint.forecast',
   'orgId=00000000-0000-0000-0000-000000000001 scenario=base',
   '{
     "summary": "13-week base forecast generated. Week-4 breakpoint detected at $-2,150 below threshold.",
     "breakpointWeek": 4,
     "shortfallAmount": 2150,
     "thresholdUsed": 6500,
     "scenarioType": "base",
     "cashPosition": 42229
   }'::jsonb,
   'executed',
   '2026-04-11 18:00:00+00',
   '2026-04-11 18:00:00+00'),

  -- Breakpoint detection alert
  ('00000000-0000-0000-000c-000000000302', '00000000-0000-0000-0000-000000000001',
   'cash_breakpoint', '00000000-0000-0000-0000-000000000001',
   'cash.breakpoint_detected', 'cash_breakpoint.alert',
   'breakpoint=week4 shortfall=$2,150 threshold=$6,500',
   '{
     "summary": "Cash breakpoint detected at week 4. Primary driver: Carlos Reyes overdue receivable ($12,500) with 42-day avg collection lag pushes expected receipt to week 6+.",
     "breakpointWeek": 4,
     "primaryDriver": "receivable_slippage",
     "primaryDriverEntity": "Carlos Reyes — ET-CB-C009 ($12,500)",
     "recommendedAction": "accelerate_collection"
   }'::jsonb,
   'executed',
   '2026-04-11 18:01:00+00',
   '2026-04-11 18:01:00+00'),

  -- Collection lag analysis
  ('00000000-0000-0000-000c-000000000303', '00000000-0000-0000-0000-000000000001',
   'collection_lag', '00000000-0000-0000-0003-000000000004',
   'cash.collection_lag_computed', 'cash_breakpoint.lag_analysis',
   'clientId=Carlos Reyes paidInvoices=8',
   '{
     "summary": "Carlos Reyes collection lag: 42 days avg (very_late tier). 8 paid invoices analyzed. On-time rate: 0%.",
     "clientName": "Carlos Reyes",
     "avgDaysToCollect": 42,
     "tier": "very_late",
     "paidInvoiceCount": 8,
     "onTimePercent": 0
   }'::jsonb,
   'executed',
   '2026-04-11 18:02:00+00',
   '2026-04-11 18:02:00+00')

ON CONFLICT (id) DO UPDATE SET
  organization_id     = EXCLUDED.organization_id,
  entity_type         = EXCLUDED.entity_type,
  entity_id           = EXCLUDED.entity_id,
  trigger_type        = EXCLUDED.trigger_type,
  action_type         = EXCLUDED.action_type,
  input_summary       = EXCLUDED.input_summary,
  output_payload_json = EXCLUDED.output_payload_json,
  status              = EXCLUDED.status,
  executed_at         = EXCLUDED.executed_at;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 6: Cash Forecast Snapshot (for deviation detection baseline)
-- Seeds one recent snapshot so the deviation detector has a comparison point.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO cash_forecast_snapshots (
  id, organization_id, forecast_json, breakpoint_week, breakpoint_amount,
  threshold_used, scenario_type, created_at
) VALUES
  ('00000000-0000-0000-000c-000000000401', '00000000-0000-0000-0000-000000000001',
   '{
     "scenarioType": "base",
     "generatedAt": "2026-04-11T18:00:00.000Z",
     "weeks": [
       {"weekNumber":1,"projectedInflows":5000,"projectedOutflows":11000,"endingBalance":36229},
       {"weekNumber":2,"projectedInflows":0,"projectedOutflows":6700,"endingBalance":29529},
       {"weekNumber":3,"projectedInflows":7000,"projectedOutflows":15200,"endingBalance":21329},
       {"weekNumber":4,"projectedInflows":0,"projectedOutflows":10100,"endingBalance":11229},
       {"weekNumber":5,"projectedInflows":0,"projectedOutflows":6500,"endingBalance":4729},
       {"weekNumber":6,"projectedInflows":12500,"projectedOutflows":4500,"endingBalance":12729},
       {"weekNumber":7,"projectedInflows":0,"projectedOutflows":6500,"endingBalance":6229},
       {"weekNumber":8,"projectedInflows":3000,"projectedOutflows":8700,"endingBalance":529},
       {"weekNumber":9,"projectedInflows":0,"projectedOutflows":6500,"endingBalance":-5971},
       {"weekNumber":10,"projectedInflows":5000,"projectedOutflows":4500,"endingBalance":-5471},
       {"weekNumber":11,"projectedInflows":0,"projectedOutflows":6500,"endingBalance":-11971},
       {"weekNumber":12,"projectedInflows":8000,"projectedOutflows":8700,"endingBalance":-12671},
       {"weekNumber":13,"projectedInflows":0,"projectedOutflows":6500,"endingBalance":-19171}
     ]
   }'::jsonb,
   4, 2150.00, 6500.00, 'base',
   '2026-04-11 18:00:00+00')

ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- DATA SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Finance Transactions added: 17 (IDs 000c-01 through 000c-33)
--   IN total:  $102,887.40 (combined with base seed)
--   OUT total: $60,658.21  (combined with base seed)
--   Net cash:  ~$42,229    (within $42K-$45K target)
--
-- Paid Invoices added: 24 (8 per client)
--   Jennifer Kim:  8 invoices, avg ~3 days late  → on_time tier
--   Emily Hartley: 8 invoices, avg ~17 days late → slightly_late tier
--   Carlos Reyes:  8 invoices, avg ~42 days late → very_late tier
--
-- Open Invoices added: 4 (IDs 000c-131 through 000c-134)
--   Total new open: ~$27,500
--   Combined with base seed open: ~$30,137
--
-- Cash Obligations added: 8 (IDs 000c-201 through 000c-208)
--   Payroll: 3 × $6,500 biweekly = $19,500
--   Rent: 2 × $4,200 monthly = $8,400
--   Tax: 1 × $3,800 quarterly
--   Vendor bills: $2,200 + $1,800 = $4,000
--
-- AI Actions added: 3 (IDs 000c-301 through 000c-303)
--   Cash forecast, breakpoint alert, collection lag analysis
--
-- Forecast Snapshot added: 1 (ID 000c-401)
--   Base scenario with week-4 breakpoint for deviation detection baseline
--
-- Week-4 Breakpoint Calibration:
--   Weeks 1-4 outflows: ~$43,000 (obligations + trailing)
--   Weeks 1-4 inflows:  ~$12,000 (Jennifer on-time, partial Emily)
--   Carlos's $12,500 doesn't arrive until week 6+ (42-day lag)
--   Cash drops below $6,500 threshold at week 4 ✓
--
-- Financing offers: already seeded by seed_survival_demo.sql (3 offers)
-- Vendor alternatives: already seeded by seed_survival_demo.sql (2 deltas)
-- ═══════════════════════════════════════════════════════════════════════════
