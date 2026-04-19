-- Resq · Cash Forecast Seed Data
-- Idempotent: uses ON CONFLICT DO NOTHING throughout
-- Supports all three demo states: Healthy, Tight, Stress
-- DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001'

-- ─── 3 months historical finance_transactions ─────────────────────────────────
-- Inflows: invoice payments, hotel revenue, catering deposits
-- Outflows: payroll (Fridays), rent (monthly), vendor bills, software subs
-- One refund paid: cancelled catering event

-- Helper: generate dates relative to NOW for reproducibility
-- Week 0 = current week Monday

-- ── INFLOWS (direction='in') ──────────────────────────────────────────────────

-- Restaurant revenue — weekly deposits (12 weeks of history)
INSERT INTO finance_transactions (id, organization_id, type, category, amount, direction, occurred_at, payment_method, notes)
VALUES
  ('00000000-0000-0000-0050-000000000001', '00000000-0000-0000-0000-000000000001', 'revenue', 'restaurant_revenue', 18200.00, 'in', NOW() - INTERVAL '84 days', 'bank_transfer', 'Week -12 restaurant deposits'),
  ('00000000-0000-0000-0050-000000000002', '00000000-0000-0000-0000-000000000001', 'revenue', 'restaurant_revenue', 19400.00, 'in', NOW() - INTERVAL '77 days', 'bank_transfer', 'Week -11 restaurant deposits'),
  ('00000000-0000-0000-0050-000000000003', '00000000-0000-0000-0000-000000000001', 'revenue', 'restaurant_revenue', 17800.00, 'in', NOW() - INTERVAL '70 days', 'bank_transfer', 'Week -10 restaurant deposits'),
  ('00000000-0000-0000-0050-000000000004', '00000000-0000-0000-0000-000000000001', 'revenue', 'restaurant_revenue', 20100.00, 'in', NOW() - INTERVAL '63 days', 'bank_transfer', 'Week -9 restaurant deposits'),
  ('00000000-0000-0000-0050-000000000005', '00000000-0000-0000-0000-000000000001', 'revenue', 'restaurant_revenue', 18900.00, 'in', NOW() - INTERVAL '56 days', 'bank_transfer', 'Week -8 restaurant deposits'),
  ('00000000-0000-0000-0050-000000000006', '00000000-0000-0000-0000-000000000001', 'revenue', 'restaurant_revenue', 21200.00, 'in', NOW() - INTERVAL '49 days', 'bank_transfer', 'Week -7 restaurant deposits'),
  ('00000000-0000-0000-0050-000000000007', '00000000-0000-0000-0000-000000000001', 'revenue', 'restaurant_revenue', 19600.00, 'in', NOW() - INTERVAL '42 days', 'bank_transfer', 'Week -6 restaurant deposits'),
  ('00000000-0000-0000-0050-000000000008', '00000000-0000-0000-0000-000000000001', 'revenue', 'restaurant_revenue', 20800.00, 'in', NOW() - INTERVAL '35 days', 'bank_transfer', 'Week -5 restaurant deposits'),
  ('00000000-0000-0000-0050-000000000009', '00000000-0000-0000-0000-000000000001', 'revenue', 'restaurant_revenue', 18500.00, 'in', NOW() - INTERVAL '28 days', 'bank_transfer', 'Week -4 restaurant deposits'),
  ('00000000-0000-0000-0050-000000000010', '00000000-0000-0000-0000-000000000001', 'revenue', 'restaurant_revenue', 19700.00, 'in', NOW() - INTERVAL '21 days', 'bank_transfer', 'Week -3 restaurant deposits'),
  ('00000000-0000-0000-0050-000000000011', '00000000-0000-0000-0000-000000000001', 'revenue', 'restaurant_revenue', 20400.00, 'in', NOW() - INTERVAL '14 days', 'bank_transfer', 'Week -2 restaurant deposits'),
  ('00000000-0000-0000-0050-000000000012', '00000000-0000-0000-0000-000000000001', 'revenue', 'restaurant_revenue', 19100.00, 'in', NOW() - INTERVAL '7 days', 'bank_transfer', 'Week -1 restaurant deposits')
ON CONFLICT (id) DO NOTHING;

-- Hotel revenue — biweekly (6 entries over 12 weeks)
INSERT INTO finance_transactions (id, organization_id, type, category, amount, direction, occurred_at, payment_method, notes)
VALUES
  ('00000000-0000-0000-0050-000000000020', '00000000-0000-0000-0000-000000000001', 'revenue', 'hotel_revenue', 32400.00, 'in', NOW() - INTERVAL '80 days', 'bank_transfer', 'Hotel revenue — biweekly'),
  ('00000000-0000-0000-0050-000000000021', '00000000-0000-0000-0000-000000000001', 'revenue', 'hotel_revenue', 28900.00, 'in', NOW() - INTERVAL '66 days', 'bank_transfer', 'Hotel revenue — biweekly'),
  ('00000000-0000-0000-0050-000000000022', '00000000-0000-0000-0000-000000000001', 'revenue', 'hotel_revenue', 34100.00, 'in', NOW() - INTERVAL '52 days', 'bank_transfer', 'Hotel revenue — biweekly'),
  ('00000000-0000-0000-0050-000000000023', '00000000-0000-0000-0000-000000000001', 'revenue', 'hotel_revenue', 30200.00, 'in', NOW() - INTERVAL '38 days', 'bank_transfer', 'Hotel revenue — biweekly'),
  ('00000000-0000-0000-0050-000000000024', '00000000-0000-0000-0000-000000000001', 'revenue', 'hotel_revenue', 33500.00, 'in', NOW() - INTERVAL '24 days', 'bank_transfer', 'Hotel revenue — biweekly'),
  ('00000000-0000-0000-0050-000000000025', '00000000-0000-0000-0000-000000000001', 'revenue', 'hotel_revenue', 29800.00, 'in', NOW() - INTERVAL '10 days', 'bank_transfer', 'Hotel revenue — biweekly')
ON CONFLICT (id) DO NOTHING;

-- Catering deposits (4 events over 3 months)
INSERT INTO finance_transactions (id, organization_id, type, category, amount, direction, occurred_at, payment_method, notes)
VALUES
  ('00000000-0000-0000-0050-000000000030', '00000000-0000-0000-0000-000000000001', 'revenue', 'catering_deposit', 8500.00, 'in', NOW() - INTERVAL '75 days', 'card', 'Morrison wedding deposit'),
  ('00000000-0000-0000-0050-000000000031', '00000000-0000-0000-0000-000000000001', 'revenue', 'catering_deposit', 12000.00, 'in', NOW() - INTERVAL '55 days', 'bank_transfer', 'Apex Corp annual gala deposit'),
  ('00000000-0000-0000-0050-000000000032', '00000000-0000-0000-0000-000000000001', 'revenue', 'catering_deposit', 6200.00, 'in', NOW() - INTERVAL '40 days', 'card', 'Hartley birthday event deposit'),
  ('00000000-0000-0000-0050-000000000033', '00000000-0000-0000-0000-000000000001', 'revenue', 'catering_deposit', 9800.00, 'in', NOW() - INTERVAL '18 days', 'bank_transfer', 'Grand Hotels quarterly dinner deposit')
ON CONFLICT (id) DO NOTHING;


-- ── OUTFLOWS (direction='out') ────────────────────────────────────────────────

-- Payroll — every Friday, $14,000 (12 weeks of history)
INSERT INTO finance_transactions (id, organization_id, type, category, amount, direction, occurred_at, payment_method, notes)
VALUES
  ('00000000-0000-0000-0050-000000000040', '00000000-0000-0000-0000-000000000001', 'expense', 'payroll', 14000.00, 'out', NOW() - INTERVAL '82 days', 'bank_transfer', 'Weekly payroll'),
  ('00000000-0000-0000-0050-000000000041', '00000000-0000-0000-0000-000000000001', 'expense', 'payroll', 14000.00, 'out', NOW() - INTERVAL '75 days', 'bank_transfer', 'Weekly payroll'),
  ('00000000-0000-0000-0050-000000000042', '00000000-0000-0000-0000-000000000001', 'expense', 'payroll', 14000.00, 'out', NOW() - INTERVAL '68 days', 'bank_transfer', 'Weekly payroll'),
  ('00000000-0000-0000-0050-000000000043', '00000000-0000-0000-0000-000000000001', 'expense', 'payroll', 14000.00, 'out', NOW() - INTERVAL '61 days', 'bank_transfer', 'Weekly payroll'),
  ('00000000-0000-0000-0050-000000000044', '00000000-0000-0000-0000-000000000001', 'expense', 'payroll', 14000.00, 'out', NOW() - INTERVAL '54 days', 'bank_transfer', 'Weekly payroll'),
  ('00000000-0000-0000-0050-000000000045', '00000000-0000-0000-0000-000000000001', 'expense', 'payroll', 14000.00, 'out', NOW() - INTERVAL '47 days', 'bank_transfer', 'Weekly payroll'),
  ('00000000-0000-0000-0050-000000000046', '00000000-0000-0000-0000-000000000001', 'expense', 'payroll', 14000.00, 'out', NOW() - INTERVAL '40 days', 'bank_transfer', 'Weekly payroll'),
  ('00000000-0000-0000-0050-000000000047', '00000000-0000-0000-0000-000000000001', 'expense', 'payroll', 14000.00, 'out', NOW() - INTERVAL '33 days', 'bank_transfer', 'Weekly payroll'),
  ('00000000-0000-0000-0050-000000000048', '00000000-0000-0000-0000-000000000001', 'expense', 'payroll', 14000.00, 'out', NOW() - INTERVAL '26 days', 'bank_transfer', 'Weekly payroll'),
  ('00000000-0000-0000-0050-000000000049', '00000000-0000-0000-0000-000000000001', 'expense', 'payroll', 14000.00, 'out', NOW() - INTERVAL '19 days', 'bank_transfer', 'Weekly payroll'),
  ('00000000-0000-0000-0050-000000000050', '00000000-0000-0000-0000-000000000001', 'expense', 'payroll', 14000.00, 'out', NOW() - INTERVAL '12 days', 'bank_transfer', 'Weekly payroll'),
  ('00000000-0000-0000-0050-000000000051', '00000000-0000-0000-0000-000000000001', 'expense', 'payroll', 14000.00, 'out', NOW() - INTERVAL '5 days', 'bank_transfer', 'Weekly payroll')
ON CONFLICT (id) DO NOTHING;

-- Rent — monthly, $22,000 (3 months)
INSERT INTO finance_transactions (id, organization_id, type, category, amount, direction, occurred_at, payment_method, notes)
VALUES
  ('00000000-0000-0000-0050-000000000060', '00000000-0000-0000-0000-000000000001', 'expense', 'rent', 22000.00, 'out', NOW() - INTERVAL '85 days', 'bank_transfer', 'Monthly rent — Nicollet Mall'),
  ('00000000-0000-0000-0050-000000000061', '00000000-0000-0000-0000-000000000001', 'expense', 'rent', 22000.00, 'out', NOW() - INTERVAL '55 days', 'bank_transfer', 'Monthly rent — Nicollet Mall'),
  ('00000000-0000-0000-0050-000000000062', '00000000-0000-0000-0000-000000000001', 'expense', 'rent', 22000.00, 'out', NOW() - INTERVAL '25 days', 'bank_transfer', 'Monthly rent — Nicollet Mall')
ON CONFLICT (id) DO NOTHING;

-- Vendor bills — irregular (food suppliers, linen, maintenance)
INSERT INTO finance_transactions (id, organization_id, type, category, amount, direction, occurred_at, payment_method, notes)
VALUES
  ('00000000-0000-0000-0050-000000000070', '00000000-0000-0000-0000-000000000001', 'expense', 'vendor', 8400.00, 'out', NOW() - INTERVAL '78 days', 'bank_transfer', 'Sysco food supply'),
  ('00000000-0000-0000-0050-000000000071', '00000000-0000-0000-0000-000000000001', 'expense', 'vendor', 3200.00, 'out', NOW() - INTERVAL '65 days', 'card', 'Linen service'),
  ('00000000-0000-0000-0050-000000000072', '00000000-0000-0000-0000-000000000001', 'expense', 'vendor', 9100.00, 'out', NOW() - INTERVAL '50 days', 'bank_transfer', 'Sysco food supply'),
  ('00000000-0000-0000-0050-000000000073', '00000000-0000-0000-0000-000000000001', 'expense', 'vendor', 4800.00, 'out', NOW() - INTERVAL '35 days', 'card', 'HVAC maintenance'),
  ('00000000-0000-0000-0050-000000000074', '00000000-0000-0000-0000-000000000001', 'expense', 'vendor', 7600.00, 'out', NOW() - INTERVAL '20 days', 'bank_transfer', 'Sysco food supply'),
  ('00000000-0000-0000-0050-000000000075', '00000000-0000-0000-0000-000000000001', 'expense', 'vendor', 2900.00, 'out', NOW() - INTERVAL '8 days', 'card', 'Cleaning supplies')
ON CONFLICT (id) DO NOTHING;

-- Software subscriptions
INSERT INTO finance_transactions (id, organization_id, type, category, amount, direction, occurred_at, payment_method, notes)
VALUES
  ('00000000-0000-0000-0050-000000000080', '00000000-0000-0000-0000-000000000001', 'expense', 'software', 1200.00, 'out', NOW() - INTERVAL '60 days', 'card', 'POS system + reservation software'),
  ('00000000-0000-0000-0050-000000000081', '00000000-0000-0000-0000-000000000001', 'expense', 'software', 1200.00, 'out', NOW() - INTERVAL '30 days', 'card', 'POS system + reservation software')
ON CONFLICT (id) DO NOTHING;

-- Utilities
INSERT INTO finance_transactions (id, organization_id, type, category, amount, direction, occurred_at, payment_method, notes)
VALUES
  ('00000000-0000-0000-0050-000000000085', '00000000-0000-0000-0000-000000000001', 'expense', 'utilities', 4200.00, 'out', NOW() - INTERVAL '58 days', 'bank_transfer', 'Electric + gas + water'),
  ('00000000-0000-0000-0050-000000000086', '00000000-0000-0000-0000-000000000001', 'expense', 'utilities', 4500.00, 'out', NOW() - INTERVAL '28 days', 'bank_transfer', 'Electric + gas + water')
ON CONFLICT (id) DO NOTHING;

-- One refund paid — cancelled catering event
INSERT INTO finance_transactions (id, organization_id, type, category, amount, direction, occurred_at, payment_method, notes)
VALUES
  ('00000000-0000-0000-0050-000000000090', '00000000-0000-0000-0000-000000000001', 'refund', 'catering_refund', 6200.00, 'out', NOW() - INTERVAL '22 days', 'bank_transfer', 'Refund — cancelled Peterson anniversary event')
ON CONFLICT (id) DO NOTHING;

-- ── FUTURE CASH OBLIGATIONS ───────────────────────────────────────────────────

-- Weekly payroll $14K (13 weeks)
INSERT INTO cash_obligations (id, organization_id, category, description, amount, due_at, recurrence, is_deferrable, status)
VALUES
  ('00000000-0000-0000-0060-000000000001', '00000000-0000-0000-0000-000000000001', 'payroll', 'Weekly payroll — all staff', 14000.00, CURRENT_DATE + INTERVAL '4 days', 'weekly', FALSE, 'scheduled'),
  ('00000000-0000-0000-0060-000000000002', '00000000-0000-0000-0000-000000000001', 'payroll', 'Weekly payroll — all staff', 14000.00, CURRENT_DATE + INTERVAL '11 days', 'weekly', FALSE, 'scheduled'),
  ('00000000-0000-0000-0060-000000000003', '00000000-0000-0000-0000-000000000001', 'payroll', 'Weekly payroll — all staff', 14000.00, CURRENT_DATE + INTERVAL '18 days', 'weekly', FALSE, 'scheduled'),
  ('00000000-0000-0000-0060-000000000004', '00000000-0000-0000-0000-000000000001', 'payroll', 'Weekly payroll — all staff', 14000.00, CURRENT_DATE + INTERVAL '25 days', 'weekly', FALSE, 'scheduled'),
  ('00000000-0000-0000-0060-000000000005', '00000000-0000-0000-0000-000000000001', 'payroll', 'Weekly payroll — all staff', 14000.00, CURRENT_DATE + INTERVAL '32 days', 'weekly', FALSE, 'scheduled'),
  ('00000000-0000-0000-0060-000000000006', '00000000-0000-0000-0000-000000000001', 'payroll', 'Weekly payroll — all staff', 14000.00, CURRENT_DATE + INTERVAL '39 days', 'weekly', FALSE, 'scheduled'),
  ('00000000-0000-0000-0060-000000000007', '00000000-0000-0000-0000-000000000001', 'payroll', 'Weekly payroll — all staff', 14000.00, CURRENT_DATE + INTERVAL '46 days', 'weekly', FALSE, 'scheduled'),
  ('00000000-0000-0000-0060-000000000008', '00000000-0000-0000-0000-000000000001', 'payroll', 'Weekly payroll — all staff', 14000.00, CURRENT_DATE + INTERVAL '53 days', 'weekly', FALSE, 'scheduled'),
  ('00000000-0000-0000-0060-000000000009', '00000000-0000-0000-0000-000000000001', 'payroll', 'Weekly payroll — all staff', 14000.00, CURRENT_DATE + INTERVAL '60 days', 'weekly', FALSE, 'scheduled'),
  ('00000000-0000-0000-0060-000000000010', '00000000-0000-0000-0000-000000000001', 'payroll', 'Weekly payroll — all staff', 14000.00, CURRENT_DATE + INTERVAL '67 days', 'weekly', FALSE, 'scheduled'),
  ('00000000-0000-0000-0060-000000000011', '00000000-0000-0000-0000-000000000001', 'payroll', 'Weekly payroll — all staff', 14000.00, CURRENT_DATE + INTERVAL '74 days', 'weekly', FALSE, 'scheduled'),
  ('00000000-0000-0000-0060-000000000012', '00000000-0000-0000-0000-000000000001', 'payroll', 'Weekly payroll — all staff', 14000.00, CURRENT_DATE + INTERVAL '81 days', 'weekly', FALSE, 'scheduled'),
  ('00000000-0000-0000-0060-000000000013', '00000000-0000-0000-0000-000000000001', 'payroll', 'Weekly payroll — all staff', 14000.00, CURRENT_DATE + INTERVAL '88 days', 'weekly', FALSE, 'scheduled')
ON CONFLICT (id) DO NOTHING;

-- Monthly rent $22K (3 months)
INSERT INTO cash_obligations (id, organization_id, category, description, amount, due_at, recurrence, is_deferrable, status)
VALUES
  ('00000000-0000-0000-0060-000000000020', '00000000-0000-0000-0000-000000000001', 'rent', 'Monthly rent — Nicollet Mall properties', 22000.00, CURRENT_DATE + INTERVAL '5 days', 'monthly', FALSE, 'scheduled'),
  ('00000000-0000-0000-0060-000000000021', '00000000-0000-0000-0000-000000000001', 'rent', 'Monthly rent — Nicollet Mall properties', 22000.00, CURRENT_DATE + INTERVAL '35 days', 'monthly', FALSE, 'scheduled'),
  ('00000000-0000-0000-0060-000000000022', '00000000-0000-0000-0000-000000000001', 'rent', 'Monthly rent — Nicollet Mall properties', 22000.00, CURRENT_DATE + INTERVAL '65 days', 'monthly', FALSE, 'scheduled')
ON CONFLICT (id) DO NOTHING;

-- Vendor bills — weeks 3, 7, 11
INSERT INTO cash_obligations (id, organization_id, category, description, amount, due_at, recurrence, is_deferrable, status)
VALUES
  ('00000000-0000-0000-0060-000000000030', '00000000-0000-0000-0000-000000000001', 'vendor', 'Sysco food supply — monthly order', 8800.00, CURRENT_DATE + INTERVAL '18 days', 'once', TRUE, 'scheduled'),
  ('00000000-0000-0000-0060-000000000031', '00000000-0000-0000-0000-000000000001', 'vendor', 'Sysco food supply — monthly order', 9200.00, CURRENT_DATE + INTERVAL '46 days', 'once', TRUE, 'scheduled'),
  ('00000000-0000-0000-0060-000000000032', '00000000-0000-0000-0000-000000000001', 'vendor', 'Sysco food supply — monthly order', 8500.00, CURRENT_DATE + INTERVAL '74 days', 'once', TRUE, 'scheduled')
ON CONFLICT (id) DO NOTHING;

-- Quarterly tax $18K — week 9
INSERT INTO cash_obligations (id, organization_id, category, description, amount, due_at, recurrence, is_deferrable, status)
VALUES
  ('00000000-0000-0000-0060-000000000040', '00000000-0000-0000-0000-000000000001', 'tax', 'Quarterly estimated tax payment — Q2 2026', 18000.00, CURRENT_DATE + INTERVAL '60 days', 'quarterly', FALSE, 'scheduled')
ON CONFLICT (id) DO NOTHING;

-- Insurance renewal $4,500 — week 6
INSERT INTO cash_obligations (id, organization_id, category, description, amount, due_at, recurrence, is_deferrable, status)
VALUES
  ('00000000-0000-0000-0060-000000000050', '00000000-0000-0000-0000-000000000001', 'insurance', 'Annual property + liability insurance renewal', 4500.00, CURRENT_DATE + INTERVAL '39 days', 'annual', TRUE, 'scheduled')
ON CONFLICT (id) DO NOTHING;

-- ── CASH RECEIVABLES (expected inflows) ───────────────────────────────────────

-- $24K corporate hotel invoice — due week 2, slipping to week 3 (TRIGGERS BREAKPOINT)
INSERT INTO cash_receivables (id, organization_id, description, amount, expected_date, original_date, collection_lag_days, confidence, status, notes)
VALUES
  ('00000000-0000-0000-0070-000000000001', '00000000-0000-0000-0000-000000000001',
   'Grand Hotels Ltd — corporate event block booking', 24000.00,
   CURRENT_DATE + INTERVAL '18 days', CURRENT_DATE + INTERVAL '8 days',
   10, 0.85, 'expected', 'Originally due week 2, slipped 10 days to week 3. AP contact confirmed payment in process.')
ON CONFLICT (id) DO NOTHING;

-- $12,500 restaurant catering — collecting normally week 2
INSERT INTO cash_receivables (id, organization_id, description, amount, expected_date, original_date, collection_lag_days, confidence, status, notes)
VALUES
  ('00000000-0000-0000-0070-000000000002', '00000000-0000-0000-0000-000000000001',
   'Morrison wedding — final catering balance', 12500.00,
   CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '10 days',
   0, 0.95, 'expected', 'Collecting on schedule. Client confirmed.')
ON CONFLICT (id) DO NOTHING;

-- $8,200 hotel group booking — collecting normally week 4
INSERT INTO cash_receivables (id, organization_id, description, amount, expected_date, original_date, collection_lag_days, confidence, status, notes)
VALUES
  ('00000000-0000-0000-0070-000000000003', '00000000-0000-0000-0000-000000000001',
   'Apex Corp — hotel group booking balance', 8200.00,
   CURRENT_DATE + INTERVAL '25 days', CURRENT_DATE + INTERVAL '25 days',
   0, 0.90, 'expected', 'Standard 30-day terms. No issues flagged.')
ON CONFLICT (id) DO NOTHING;

-- $6,800 events deposit — collecting normally week 5
INSERT INTO cash_receivables (id, organization_id, description, amount, expected_date, original_date, collection_lag_days, confidence, status, notes)
VALUES
  ('00000000-0000-0000-0070-000000000004', '00000000-0000-0000-0000-000000000001',
   'Blueprint Events — summer gala deposit', 6800.00,
   CURRENT_DATE + INTERVAL '32 days', CURRENT_DATE + INTERVAL '32 days',
   0, 0.92, 'expected', 'Deposit invoice sent. Client acknowledged.')
ON CONFLICT (id) DO NOTHING;

-- ── REFUND EXPOSURE ───────────────────────────────────────────────────────────

-- $6,200 event deposit refund — pending (cancelled corporate retreat)
INSERT INTO refund_exposure (id, organization_id, description, amount, requested_at, expected_pay_date, status, notes)
VALUES
  ('00000000-0000-0000-0080-000000000001', '00000000-0000-0000-0000-000000000001',
   'Meridian Corp — cancelled corporate retreat deposit refund', 6200.00,
   CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '14 days',
   'pending', 'Client requested full refund of $6,200 deposit. Under review — event was cancelled 48h before.')
ON CONFLICT (id) DO NOTHING;
