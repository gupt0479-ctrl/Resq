-- Ember Table — deterministic seed data
-- Run after applying 0001_core_ledger.sql (and 004_feedback_domain.sql for the feedback block at the bottom)
-- All dates relative to the demo anchor date: 2026-04-11

-- â”€â”€â”€ Organisation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO organizations (id, name, slug, timezone) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Ember Table', 'ember-table', 'America/Chicago')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ Staff â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO staff (id, organization_id, full_name, role, email, is_active) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'Sarah Chen',   'manager', 'sarah@embertable.com',  TRUE),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'James Park',   'server',  'james@embertable.com',  TRUE),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'Mia Torres',   'server',  'mia@embertable.com',    TRUE)
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ Services / Menu Catalog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO services (id, organization_id, name, description, category, price_per_person, is_active) VALUES
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000001',
   'Prix-Fixe Dinner',        '3-course seasonal menu',           'main_course',  95.00, TRUE),
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-000000000001',
   'Seasonal Tasting Menu',   '7-course chef tasting experience',  'main_course', 145.00, TRUE),
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0000-000000000001',
   'Wine Pairing Experience', 'Curated wine flight per course',   'beverage',     65.00, TRUE),
  ('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0000-000000000001',
   'Dessert Course',          'Pastry chef selection',            'dessert',      18.00, TRUE),
  ('00000000-0000-0000-0002-000000000005', '00000000-0000-0000-0000-000000000001',
   'Private Dining Experience','Exclusive room + personalised menu','experience', 200.00, TRUE)
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ Customers / Guests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO customers (id, organization_id, full_name, email, phone, preferred_contact_channel, last_visit_at, lifetime_value, avg_feedback_score, risk_status) VALUES
  ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000001',
   'Emily Hartley',   'emily.h@example.com',   '+1-312-555-0101', 'email', '2026-04-08 19:00:00+00', 621.30,  4.8, 'none'),
  ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000001',
   'Michael Torres',  'm.torres@example.com',  '+1-312-555-0102', 'email', '2026-04-11 19:30:00+00', 414.20,  4.5, 'none'),
  ('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0000-000000000001',
   'Priya Nair',      'priya.n@example.com',   '+1-312-555-0103', 'email', '2026-04-11 18:00:00+00', 316.10,  4.9, 'none'),
  ('00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0000-000000000001',
   'Carlos Reyes',    'c.reyes@example.com',   '+1-312-555-0104', 'sms',  '2026-03-31 20:00:00+00', 632.20,  1.8, 'flagged'),
  ('00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0000-000000000001',
   'Jennifer Kim',    'jen.kim@example.com',   '+1-312-555-0105', 'email', '2026-04-09 19:00:00+00', 1308.00, 5.0, 'none'),
  ('00000000-0000-0000-0003-000000000006', '00000000-0000-0000-0000-000000000001',
   'David Chen',      'd.chen@example.com',    '+1-312-555-0106', 'email', '2026-03-15 19:00:00+00', 207.10,  3.9, 'at_risk'),
  ('00000000-0000-0000-0003-000000000007', '00000000-0000-0000-0000-000000000001',
   'Aisha Johnson',   'aisha.j@example.com',   '+1-312-555-0107', 'email', '2026-03-28 19:30:00+00', 380.00,  4.6, 'none'),
  ('00000000-0000-0000-0003-000000000008', '00000000-0000-0000-0000-000000000001',
   'Robert Walsh',    'r.walsh@example.com',   '+1-312-555-0108', 'email', NULL,                     0.00,    NULL,'none')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ Appointments / Reservations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO appointments (id, organization_id, customer_id, staff_id, service_id, covers, starts_at, ends_at, status, booking_source, confirmation_sent_at, notes) VALUES
  -- COMPLETED: Emily, Prix-Fixe, 2 covers — 3 days ago (has paid invoice)
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0001-000000000002',
   '00000000-0000-0000-0002-000000000001', 2,
   '2026-04-08 19:00:00+00', '2026-04-08 21:00:00+00',
   'completed', 'opentable', '2026-04-06 10:00:00+00', 'Anniversary dinner'),

  -- COMPLETED: Carlos, Seasonal Tasting, 4 covers — 11 days ago (invoice overdue)
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0001-000000000003',
   '00000000-0000-0000-0002-000000000002', 4,
   '2026-03-31 19:00:00+00', '2026-03-31 22:00:00+00',
   'completed', 'manual', '2026-03-29 09:00:00+00', 'Group booking'),

  -- COMPLETED: Jennifer, Private Dining, 6 covers — 2 days ago (invoice sent/pending)
  ('00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0001-000000000001',
   '00000000-0000-0000-0002-000000000005', 6,
   '2026-04-09 19:00:00+00', '2026-04-09 22:30:00+00',
   'completed', 'manual', '2026-04-07 11:00:00+00', 'Corporate event'),

  -- COMPLETED today: Michael, Prix-Fixe, 2 covers (invoice should be generated + sent)
  ('00000000-0000-0000-0004-000000000004', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0001-000000000002',
   '00000000-0000-0000-0002-000000000001', 2,
   '2026-04-11 19:30:00+00', '2026-04-11 21:30:00+00',
   'completed', 'opentable', '2026-04-09 10:00:00+00', NULL),

  -- IN_PROGRESS: Priya, Seasonal Tasting, 3 covers (no invoice yet)
  ('00000000-0000-0000-0004-000000000005', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0001-000000000003',
   '00000000-0000-0000-0002-000000000002', 3,
   '2026-04-11 18:00:00+00', '2026-04-11 21:00:00+00',
   'in_progress', 'opentable', '2026-04-09 09:30:00+00', NULL),

  -- CONFIRMED today +2h: David, Wine Pairing, 2 covers
  ('00000000-0000-0000-0004-000000000006', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0003-000000000006', '00000000-0000-0000-0001-000000000002',
   '00000000-0000-0000-0002-000000000003', 2,
   '2026-04-11 21:30:00+00', '2026-04-11 23:00:00+00',
   'confirmed', 'manual', '2026-04-09 14:00:00+00', NULL),

  -- SCHEDULED tomorrow: Aisha, Prix-Fixe, 4 covers
  ('00000000-0000-0000-0004-000000000007', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0003-000000000007', '00000000-0000-0000-0001-000000000002',
   '00000000-0000-0000-0002-000000000001', 4,
   '2026-04-12 19:00:00+00', '2026-04-12 21:30:00+00',
   'scheduled', 'opentable', '2026-04-10 10:00:00+00', 'Birthday celebration'),

  -- SCHEDULED tomorrow: Robert, Tasting Menu, 2 covers
  ('00000000-0000-0000-0004-000000000008', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0003-000000000008', '00000000-0000-0000-0001-000000000003',
   '00000000-0000-0000-0002-000000000002', 2,
   '2026-04-12 20:00:00+00', '2026-04-12 23:00:00+00',
   'scheduled', 'manual', NULL, 'First visit'),

  -- RESCHEDULED: Aisha moved her reservation to a later date
  ('00000000-0000-0000-0004-000000000011', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0003-000000000007', '00000000-0000-0000-0001-000000000002',
   '00000000-0000-0000-0002-000000000001', 4,
   '2026-04-13 19:30:00+00', '2026-04-13 22:00:00+00',
   'rescheduled', 'opentable', '2026-04-10 10:00:00+00', 'Moved from original birthday reservation'),

  -- CANCELLED: past booking
  ('00000000-0000-0000-0004-000000000009', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0003-000000000006', '00000000-0000-0000-0001-000000000001',
   '00000000-0000-0000-0002-000000000001', 2,
   '2026-04-10 19:00:00+00', '2026-04-10 21:00:00+00',
   'cancelled', 'manual', NULL, NULL),

  -- NO_SHOW
  ('00000000-0000-0000-0004-000000000010', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0003-000000000008', '00000000-0000-0000-0001-000000000003',
   '00000000-0000-0000-0002-000000000001', 2,
   '2026-04-08 20:00:00+00', '2026-04-08 22:00:00+00',
   'no_show', 'manual', '2026-04-06 10:00:00+00', NULL)
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ Appointment Events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO appointment_events (id, appointment_id, organization_id, event_type, from_status, to_status, notes) VALUES
  ('00000000-0000-0000-0006-000000000001', '00000000-0000-0000-0004-000000000001',
   '00000000-0000-0000-0000-000000000001', 'reservation.completed', 'confirmed', 'completed', NULL),
  ('00000000-0000-0000-0006-000000000002', '00000000-0000-0000-0004-000000000001',
   '00000000-0000-0000-0000-000000000001', 'invoice.generated', 'completed', 'completed', 'Invoice ET-2026-0001 generated'),
  ('00000000-0000-0000-0006-000000000003', '00000000-0000-0000-0004-000000000001',
   '00000000-0000-0000-0000-000000000001', 'invoice.sent', NULL, NULL, 'Invoice ET-2026-0001 sent'),
  ('00000000-0000-0000-0006-000000000004', '00000000-0000-0000-0004-000000000001',
   '00000000-0000-0000-0000-000000000001', 'invoice.paid', NULL, NULL, 'Invoice ET-2026-0001 paid'),
  ('00000000-0000-0000-0006-000000000005', '00000000-0000-0000-0004-000000000002',
   '00000000-0000-0000-0000-000000000001', 'reservation.completed', 'confirmed', 'completed', NULL),
  ('00000000-0000-0000-0006-000000000006', '00000000-0000-0000-0004-000000000002',
   '00000000-0000-0000-0000-000000000001', 'invoice.generated', 'completed', 'completed', 'Invoice ET-2026-0002 generated'),
  ('00000000-0000-0000-0006-000000000007', '00000000-0000-0000-0004-000000000002',
   '00000000-0000-0000-0000-000000000001', 'invoice.sent', NULL, NULL, 'Invoice ET-2026-0002 sent'),
  ('00000000-0000-0000-0006-000000000008', '00000000-0000-0000-0004-000000000003',
   '00000000-0000-0000-0000-000000000001', 'reservation.completed', 'confirmed', 'completed', NULL),
  ('00000000-0000-0000-0006-000000000009', '00000000-0000-0000-0004-000000000003',
   '00000000-0000-0000-0000-000000000001', 'invoice.generated', 'completed', 'completed', 'Invoice ET-2026-0003 generated'),
  ('00000000-0000-0000-0006-000000000010', '00000000-0000-0000-0004-000000000003',
   '00000000-0000-0000-0000-000000000001', 'invoice.sent', NULL, NULL, 'Invoice ET-2026-0003 sent'),
  ('00000000-0000-0000-0006-000000000011', '00000000-0000-0000-0004-000000000004',
   '00000000-0000-0000-0000-000000000001', 'reservation.completed', 'confirmed', 'completed', NULL),
  ('00000000-0000-0000-0006-000000000012', '00000000-0000-0000-0004-000000000004',
   '00000000-0000-0000-0000-000000000001', 'invoice.generated', 'completed', 'completed', 'Invoice ET-2026-0004 generated')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ Invoices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Prices: Prix-Fixe $95/person, Tasting $145/person, Private Dining $200/person
-- Tax rate: 9%

INSERT INTO invoices (id, organization_id, appointment_id, customer_id, invoice_number, currency, subtotal, tax_rate, tax_amount, discount_amount, total_amount, amount_paid, due_at, status, sent_at, paid_at) VALUES
  -- ET-2026-0001: Emily, 2×$95 = $190 subtotal, $17.10 tax, $207.10 total — PAID
  ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0003-000000000001',
   'ET-2026-0001', 'USD', 190.00, 0.0900, 17.10, 0.00, 207.10, 207.10,
   '2026-04-22 23:59:59+00', 'paid',
   '2026-04-08 21:15:00+00', '2026-04-09 10:30:00+00'),

  -- ET-2026-0002: Carlos, 4×$145 = $580 subtotal, $52.20 tax, $632.20 total — OVERDUE
  ('00000000-0000-0000-0005-000000000002', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0003-000000000004',
   'ET-2026-0002', 'USD', 580.00, 0.0900, 52.20, 0.00, 632.20, 0.00,
   '2026-04-07 23:59:59+00', 'overdue',
   '2026-03-31 22:15:00+00', NULL),

  -- ET-2026-0003: Jennifer, 6×$200 = $1200 subtotal, $108 tax, $1308 total — SENT/PENDING
  ('00000000-0000-0000-0005-000000000003', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0003-000000000005',
   'ET-2026-0003', 'USD', 1200.00, 0.0900, 108.00, 0.00, 1308.00, 0.00,
   '2026-04-23 23:59:59+00', 'sent',
   '2026-04-09 22:45:00+00', NULL),

  -- ET-2026-0004: Michael, 2×$95 = $190 subtotal, $17.10 tax, $207.10 total — SENT (today)
  ('00000000-0000-0000-0005-000000000004', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0004-000000000004', '00000000-0000-0000-0003-000000000002',
   'ET-2026-0004', 'USD', 190.00, 0.0900, 17.10, 0.00, 207.10, 0.00,
   '2026-04-25 23:59:59+00', 'sent',
   '2026-04-11 21:45:00+00', NULL),

  -- ET-2026-0005: David, old invoice from March — OVERDUE (different org scenario)
  ('00000000-0000-0000-0005-000000000005', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000006',
   'ET-2026-0005', 'USD', 190.00, 0.0900, 17.10, 0.00, 207.10, 0.00,
   '2026-03-29 23:59:59+00', 'overdue',
   '2026-03-15 20:30:00+00', NULL),

  -- ET-2026-0006: Aisha, manual follow-up invoice — PENDING
  ('00000000-0000-0000-0005-000000000006', '00000000-0000-0000-0000-000000000001',
   NULL, '00000000-0000-0000-0003-000000000007',
   'ET-2026-0006', 'USD', 260.00, 0.0900, 23.40, 0.00, 283.40, 0.00,
   '2026-04-24 23:59:59+00', 'pending',
   '2026-04-10 16:30:00+00', NULL)
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ Invoice Line Items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO invoice_items (id, invoice_id, organization_id, service_id, description, quantity, unit_price, amount) VALUES
  -- Invoice 0001: Emily, Prix-Fixe × 2
  ('00000000-0000-0000-0007-000000000001', '00000000-0000-0000-0005-000000000001',
   '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0002-000000000001',
   'Prix-Fixe Dinner × 2 guests', 2, 95.00, 190.00),

  -- Invoice 0002: Carlos, Tasting Menu × 4
  ('00000000-0000-0000-0007-000000000002', '00000000-0000-0000-0005-000000000002',
   '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0002-000000000002',
   'Seasonal Tasting Menu × 4 guests', 4, 145.00, 580.00),

  -- Invoice 0003: Jennifer, Private Dining × 6
  ('00000000-0000-0000-0007-000000000003', '00000000-0000-0000-0005-000000000003',
   '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0002-000000000005',
   'Private Dining Experience × 6 guests', 6, 200.00, 1200.00),

  -- Invoice 0004: Michael, Prix-Fixe × 2
  ('00000000-0000-0000-0007-000000000004', '00000000-0000-0000-0005-000000000004',
   '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0002-000000000001',
   'Prix-Fixe Dinner × 2 guests', 2, 95.00, 190.00),

  -- Invoice 0005: David, Prix-Fixe × 2
  ('00000000-0000-0000-0007-000000000005', '00000000-0000-0000-0005-000000000005',
   '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0002-000000000001',
   'Prix-Fixe Dinner × 2 guests', 2, 95.00, 190.00),

  -- Invoice 0006: Aisha, Wine Pairing × 4
  ('00000000-0000-0000-0007-000000000006', '00000000-0000-0000-0005-000000000006',
   '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0002-000000000003',
   'Wine Pairing Experience × 4 guests', 4, 65.00, 260.00)
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ Finance Transactions (ledger) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO finance_transactions (id, organization_id, invoice_id, type, category, amount, direction, occurred_at, payment_method, tax_relevant, writeoff_eligible, notes) VALUES
  -- Revenue: Emily's paid invoice
  ('00000000-0000-0000-0008-000000000001', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0005-000000000001',
   'revenue', 'dining_revenue', 207.10, 'in',
   '2026-04-09 10:30:00+00', 'card', TRUE, FALSE,
   'Payment for invoice ET-2026-0001'),

  -- Expense: fresh produce delivery
  ('00000000-0000-0000-0008-000000000002', '00000000-0000-0000-0000-000000000001',
   NULL, 'inventory_purchase', 'produce', 342.00, 'out',
   '2026-04-07 08:00:00+00', 'bank_transfer', TRUE, FALSE,
   'Weekly fresh produce — Green City Market'),

  -- Expense: wine inventory
  ('00000000-0000-0000-0008-000000000003', '00000000-0000-0000-0000-000000000001',
   NULL, 'inventory_purchase', 'beverage', 1280.00, 'out',
   '2026-04-07 09:00:00+00', 'bank_transfer', TRUE, FALSE,
   'Wine restocking — Sommelier Select'),

  -- Fee: payment processing
  ('00000000-0000-0000-0008-000000000004', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0005-000000000001',
   'fee', 'payment_processing', 6.21, 'out',
   '2026-04-09 10:30:00+00', 'card', FALSE, FALSE,
   'Square processing fee (3%) on ET-2026-0001'),

  -- Expense: linen and table service
  ('00000000-0000-0000-0008-000000000005', '00000000-0000-0000-0000-000000000001',
   NULL, 'expense', 'operations', 185.00, 'out',
   '2026-04-09 11:00:00+00', 'check', FALSE, FALSE,
   'Linen cleaning and press service'),

  -- Tax payment: Q1 estimated tax
  ('00000000-0000-0000-0008-000000000006', '00000000-0000-0000-0000-000000000001',
   NULL, 'tax_payment', 'federal_tax', 450.00, 'out',
   '2026-04-01 12:00:00+00', 'bank_transfer', TRUE, FALSE,
   'Q1 2026 estimated income tax payment'),

  -- Revenue: older dining revenue (prior week, for trend comparison)
  ('00000000-0000-0000-0008-000000000007', '00000000-0000-0000-0000-000000000001',
   NULL, 'revenue', 'dining_revenue', 414.20, 'in',
   '2026-04-05 21:00:00+00', 'card', TRUE, FALSE,
   'Table 6 dinner service'),

  ('00000000-0000-0000-0008-000000000008', '00000000-0000-0000-0000-000000000001',
   NULL, 'revenue', 'dining_revenue', 316.10, 'in',
   '2026-04-04 21:30:00+00', 'card', TRUE, FALSE,
   'Table 3 dinner service')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ Integration Connectors (MCP bridge demo) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO integration_connectors (id, organization_id, provider, display_name, status, last_sync_at, last_error) VALUES
  ('00000000-0000-0000-0009-000000000001', '00000000-0000-0000-0000-000000000001',
   'opentable',     'OpenTable',     'connected', '2026-04-11 17:00:00+00', NULL),
  ('00000000-0000-0000-0009-000000000002', '00000000-0000-0000-0000-000000000001',
   'square',        'Square POS',    'connected', '2026-04-11 19:45:00+00', NULL),
  ('00000000-0000-0000-0009-000000000003', '00000000-0000-0000-0000-000000000001',
   'gmail',         'Gmail',         'connected', '2026-04-11 20:00:00+00', NULL),
  ('00000000-0000-0000-0009-000000000004', '00000000-0000-0000-0000-000000000001',
   'google_reviews','Google Reviews','error',     '2026-04-10 08:00:00+00', 'OAuth token expired. Re-authenticate to resume sync.')
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ Feedback (Phase 3 demo — requires migration 004_feedback_domain.sql) â”€
-- To insert this block alone later: supabase/seed_feedback_addon.sql

-- Feedback (Phase 3 demo - requires migration 004_feedback_domain.sql)
-- Re-running this section restores the canonical feedback queue after demo approvals mutate rows.

INSERT INTO feedback (
  id, organization_id, customer_id, appointment_id, source, guest_name_snapshot, score, comment,
  sentiment, topics, urgency, safety_flag, follow_up_status, flagged,
  reply_draft, internal_note, manager_summary, analysis_json, analysis_source,
  external_review_id, external_source, received_at
) VALUES
  (
    '00000000-0000-0000-000a-000000000001', '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0004-000000000005',
    'internal', 'Priya Nair', 2,
    'We had a wonderful tasting menu but I had a reaction - I mentioned my tree nut allergy and still found pistachio in the dessert.',
    'negative', '["allergy_safety","food_quality"]'::jsonb, 5, TRUE, 'callback_needed', TRUE,
    NULL,
    'Tree nut incident after allergy disclosed - kitchen/service handoff breakdown.',
    'Priya Nair reported a tree nut allergy incident after dessert contained pistachio; urgency escalated for manager callback.',
    '{"sentiment":"negative","score_label":"poor","topics":["allergy_safety","food_quality"],"urgency":5,"safety_flag":true,"churn_risk":"medium","risk_status_update":"at_risk","reply_draft":null,"internal_note":"Tree nut incident after allergy disclosed - kitchen/service handoff breakdown.","recovery_action":{"type":"urgent_escalation","message_draft":"Priya, this is Sarah from Ember Table. I am deeply sorry about the dessert incident after you shared your allergy. I would like to speak with you today to understand what happened and how we can make this right.","channel":"phone","priority":"urgent"},"follow_up_status":"callback_needed","manager_summary":"Priya Nair reported a tree nut allergy incident after dessert contained pistachio; urgency escalated for manager callback.","auto_send_thank_you":false}'::jsonb,
    'rules_fallback', NULL, NULL, '2026-04-11 21:15:00+00'
  ),
  (
    '00000000-0000-0000-000a-000000000002', '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0003-000000000003', NULL,
    'google', 'Priya Nair', 1,
    'Two stars - slow seating and cold bread.',
    'negative', '["service_speed","food_quality"]'::jsonb, 4, FALSE, 'callback_needed', TRUE,
    'Thank you for taking the time to share this, Priya. I am sorry we missed the mark on pacing and bread service - that is not the Ember Table experience we strive for. I would welcome the chance to make this right personally; please reach out to our host stand.',
    'Repeat Google complaint after internal allergy case - coordinate responses.',
    'Google review from Priya flags service speed and food temperature; public reply drafted.',
    '{"sentiment":"negative","score_label":"critical","topics":["service_speed","food_quality"],"urgency":4,"safety_flag":false,"churn_risk":"high","risk_status_update":"at_risk","reply_draft":"Thank you for taking the time to share this, Priya. I am sorry we missed the mark on pacing and bread service - that is not the Ember Table experience we strive for. I would welcome the chance to make this right personally; please reach out to our host stand.","internal_note":"Repeat Google complaint after internal allergy case - coordinate responses.","recovery_action":{"type":"personal_call","message_draft":null,"channel":"phone","priority":"high"},"follow_up_status":"callback_needed","manager_summary":"Google review from Priya flags service speed and food temperature; public reply drafted.","auto_send_thank_you":false}'::jsonb,
    'rules_fallback', 'rev-google-priya-001', 'google', '2026-04-12 14:00:00+00'
  ),
  (
    '00000000-0000-0000-000a-000000000003', '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0004-000000000003',
    'internal', 'Jennifer Kim', 5,
    'Corporate dinner was flawless - thank the team for the wine pairings.',
    'positive', '["food_quality","ambiance"]'::jsonb, 1, FALSE, 'thankyou_sent', FALSE,
    NULL,
    'VIP corporate host - reinforce relationship.',
    'Jennifer Kim gave 5 stars after private dining; thank-you path selected.',
    '{"sentiment":"positive","score_label":"excellent","topics":["food_quality","ambiance"],"urgency":1,"safety_flag":false,"churn_risk":"low","risk_status_update":"healthy","reply_draft":null,"internal_note":"VIP corporate host - reinforce relationship.","recovery_action":{"type":"thank_you_email","message_draft":"Jennifer, thank you for trusting Ember Table with your corporate dinner. We are thrilled the wine pairings and evening felt seamless, and I have shared your note with the team. We would love to welcome you back anytime.","channel":"email","priority":"low"},"follow_up_status":"thankyou_sent","manager_summary":"Jennifer Kim gave 5 stars after private dining; thank-you path selected.","auto_send_thank_you":true}'::jsonb,
    'rules_fallback', NULL, NULL, '2026-04-10 11:00:00+00'
  ),
  (
    '00000000-0000-0000-000a-000000000004', '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0003-000000000006', NULL,
    'yelp', 'David Chen', 3,
    'Food was good but we waited 40 minutes past our reservation time.',
    'neutral', '["wait_time","food_quality"]'::jsonb, 2, FALSE, 'none', FALSE,
    'David, thank you for your honest feedback - I am sorry for the long wait before your table was ready. We are tightening our pacing on busy nights and would love another chance to show you a smoother evening.',
    'At-risk guest - wait time topic.',
    'David Chen left 3 stars on Yelp citing wait time; neutral sentiment.',
    '{"sentiment":"neutral","score_label":"mixed","topics":["wait_time","food_quality"],"urgency":2,"safety_flag":false,"churn_risk":"medium","risk_status_update":"at_risk","reply_draft":"David, thank you for your honest feedback - I am sorry for the long wait before your table was ready. We are tightening our pacing on busy nights and would love another chance to show you a smoother evening.","internal_note":"At-risk guest - wait time topic.","recovery_action":{"type":"comp_offer","message_draft":"David, thank you for your honest feedback. I am sorry we kept you waiting so long before seating your table. If you are open to it, I would love to invite you back and personally make sure your next experience feels much smoother.","channel":"email","priority":"normal"},"follow_up_status":"none","manager_summary":"David Chen left 3 stars on Yelp citing wait time; neutral sentiment.","auto_send_thank_you":false}'::jsonb,
    'rules_fallback', 'rev-yelp-david-001', 'yelp', '2026-04-08 16:30:00+00'
  )
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  customer_id = EXCLUDED.customer_id,
  appointment_id = EXCLUDED.appointment_id,
  source = EXCLUDED.source,
  guest_name_snapshot = EXCLUDED.guest_name_snapshot,
  score = EXCLUDED.score,
  comment = EXCLUDED.comment,
  sentiment = EXCLUDED.sentiment,
  topics = EXCLUDED.topics,
  urgency = EXCLUDED.urgency,
  safety_flag = EXCLUDED.safety_flag,
  follow_up_status = EXCLUDED.follow_up_status,
  flagged = EXCLUDED.flagged,
  reply_draft = EXCLUDED.reply_draft,
  internal_note = EXCLUDED.internal_note,
  manager_summary = EXCLUDED.manager_summary,
  analysis_json = EXCLUDED.analysis_json,
  analysis_source = EXCLUDED.analysis_source,
  external_review_id = EXCLUDED.external_review_id,
  external_source = EXCLUDED.external_source,
  received_at = EXCLUDED.received_at,
  updated_at = NOW();

INSERT INTO follow_up_actions (
  id, organization_id, feedback_id, action_type, status, channel, priority, message_draft
) VALUES
  (
    '00000000-0000-0000-000b-000000000001', '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-000a-000000000001', 'urgent_escalation', 'pending', 'phone', 'urgent',
    'Priya, this is Sarah from Ember Table. I am deeply sorry about the dessert incident after you shared your allergy. I would like to speak with you today to understand what happened and how we can make this right.'
  ),
  (
    '00000000-0000-0000-000b-000000000002', '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-000a-000000000002', 'personal_call', 'pending', 'phone', 'high', NULL
  )
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  feedback_id = EXCLUDED.feedback_id,
  action_type = EXCLUDED.action_type,
  status = EXCLUDED.status,
  channel = EXCLUDED.channel,
  priority = EXCLUDED.priority,
  message_draft = EXCLUDED.message_draft,
  updated_at = NOW();

INSERT INTO ai_actions (
  id, organization_id, entity_type, entity_id, trigger_type, action_type, input_summary, output_payload_json, status, created_at
) VALUES
  (
    '00000000-0000-0000-000c-000000000001', '00000000-0000-0000-0000-000000000001',
    'feedback', '00000000-0000-0000-000a-000000000001', 'feedback.received', 'customer_service.analyze_review',
    'Priya Nair - score 2 - internal', '{"sentiment":"negative","urgency":5,"safety_flag":true}'::jsonb, 'executed', '2026-04-11 21:16:00+00'
  ),
  (
    '00000000-0000-0000-000c-000000000002', '00000000-0000-0000-0000-000000000001',
    'feedback', '00000000-0000-0000-000a-000000000002', 'feedback.received', 'customer_service.analyze_review',
    'Priya Nair - score 1 - google', '{"sentiment":"negative","urgency":4}'::jsonb, 'executed', '2026-04-12 14:01:00+00'
  ),
  (
    '00000000-0000-0000-000c-000000000003', '00000000-0000-0000-0000-000000000001',
    'feedback', '00000000-0000-0000-000a-000000000003', 'feedback.received', 'customer_service.analyze_review',
    'Jennifer Kim - score 5 - internal', '{"sentiment":"positive","urgency":1}'::jsonb, 'executed', '2026-04-10 11:02:00+00'
  )
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  entity_type = EXCLUDED.entity_type,
  entity_id = EXCLUDED.entity_id,
  trigger_type = EXCLUDED.trigger_type,
  action_type = EXCLUDED.action_type,
  input_summary = EXCLUDED.input_summary,
  output_payload_json = EXCLUDED.output_payload_json,
  status = EXCLUDED.status,
  created_at = EXCLUDED.created_at;
