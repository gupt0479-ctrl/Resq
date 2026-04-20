-- Resq · Ember Table — Inventory & Shipments schema + seed
-- Migration: 0003_inventory_shipments

-- ─── inventory_items ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_items (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name           TEXT           NOT NULL,
  category            TEXT           NOT NULL DEFAULT 'other',
  quantity_on_hand    NUMERIC(10, 3) NOT NULL DEFAULT 0,
  reorder_level       NUMERIC(10, 3) NOT NULL DEFAULT 0,
  unit_cost           NUMERIC(10, 2) NOT NULL DEFAULT 0,
  previous_unit_cost  NUMERIC(10, 2),
  expires_at          DATE,
  vendor_name         TEXT           NOT NULL DEFAULT 'Unknown Vendor',
  issue_status        TEXT           NOT NULL DEFAULT 'none',
  price_trend_status  TEXT           NOT NULL DEFAULT 'stable',
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ─── shipments ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shipments (
  id                     UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name            TEXT           NOT NULL,
  status                 TEXT           NOT NULL DEFAULT 'pending',
  expected_delivery_date DATE           NOT NULL,
  actual_delivery_date   DATE,
  ordered_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  tracking_number        TEXT,
  tracking_url           TEXT,
  notes                  TEXT,
  total_cost             NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ─── shipment_line_items ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shipment_line_items (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id       UUID           NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  item_id           TEXT           NOT NULL,
  item_name         TEXT           NOT NULL,
  quantity_ordered  NUMERIC(10, 3) NOT NULL,
  unit_cost         NUMERIC(10, 2) NOT NULL,
  total_cost        NUMERIC(10, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shipment_line_items_shipment ON shipment_line_items(shipment_id);

-- ─── Seed: inventory items ────────────────────────────────────────────────────

INSERT INTO inventory_items (id, item_name, category, quantity_on_hand, reorder_level, unit_cost, previous_unit_cost, expires_at, vendor_name, issue_status, price_trend_status) VALUES
  ('11000000-0000-0000-0000-000000000001', 'Wagyu Ribeye',         'protein',   4,    10,  58.00, 52.00, '2026-04-15', 'Prime Provisions',    'none',         'spike'),
  ('11000000-0000-0000-0000-000000000002', 'Braised Short Rib',    'protein',   7,    12,  34.00, 34.00, '2026-04-16', 'Prime Provisions',    'none',         'stable'),
  ('11000000-0000-0000-0000-000000000003', 'Heirloom Beets',       'produce',   2.5,   5,   8.50,  8.50, '2026-04-14', 'Heartland Farms',     'none',         'stable'),
  ('11000000-0000-0000-0000-000000000004', 'Burrata',              'dairy',    18,    20,  12.00, 12.00, '2026-04-13', 'Artisan Creamery',    'expiring',     'stable'),
  ('11000000-0000-0000-0000-000000000005', 'Wild Salmon',          'protein',  14,    10,  28.00, 28.00, '2026-04-17', 'Coastal Catch Co.',   'none',         'stable'),
  ('11000000-0000-0000-0000-000000000006', 'Duck Confit',          'protein',  22,    8,   19.00, 21.00, '2026-04-20', 'Prime Provisions',    'none',         'stable'),
  ('11000000-0000-0000-0000-000000000007', 'Truffle Oil',          'pantry',    3,    5,   42.00, 36.00, '2026-09-01', 'Specialty Foods MN',  'none',         'spike'),
  ('11000000-0000-0000-0000-000000000008', 'Sourdough Boule',      'bakery',    6,    8,    4.50,  4.50, '2026-04-12', 'Stone Hearth Bakery', 'expiring',     'stable'),
  ('11000000-0000-0000-0000-000000000009', 'Champagne Vinegar',    'pantry',   11,    6,    9.00,  9.00, NULL,         'Specialty Foods MN',  'none',         'stable'),
  ('11000000-0000-0000-0000-000000000010', 'Micro Greens Mix',     'produce',   4,    6,   14.00, 14.00, '2026-04-13', 'Heartland Farms',     'none',         'stable'),
  ('11000000-0000-0000-0000-000000000011', 'Sea Scallops',         'protein',  16,    10,  32.00, 32.00, '2026-04-16', 'Coastal Catch Co.',   'none',         'stable'),
  ('11000000-0000-0000-0000-000000000012', 'Smoked Paprika',       'pantry',   30,    10,   3.50,  3.50, NULL,         'Specialty Foods MN',  'none',         'stable'),
  ('11000000-0000-0000-0000-000000000013', 'Black Garlic',         'pantry',    2,    4,   18.00, 18.00, '2026-05-01', 'Specialty Foods MN',  'none',         'stable'),
  ('11000000-0000-0000-0000-000000000014', 'Crème Fraîche',        'dairy',     9,    8,    7.50,  7.50, '2026-04-18', 'Artisan Creamery',    'none',         'stable'),
  ('11000000-0000-0000-0000-000000000015', 'Fingerling Potatoes',  'produce',  24,    12,   2.00,  2.00, '2026-04-20', 'Heartland Farms',     'none',         'stable')
ON CONFLICT (id) DO NOTHING;

-- ─── Seed: shipments ─────────────────────────────────────────────────────────

INSERT INTO shipments (id, vendor_name, status, expected_delivery_date, actual_delivery_date, ordered_at, tracking_number, total_cost) VALUES
  ('22000000-0000-0000-0000-000000000001', 'Prime Provisions',    'delivered',   '2026-04-10', '2026-04-10', '2026-04-08T09:00:00Z', 'PP-20260408-001', 1856.00),
  ('22000000-0000-0000-0000-000000000002', 'Heartland Farms',     'delivered',   '2026-04-09', '2026-04-09', '2026-04-07T10:30:00Z', 'HF-20260407-002',  212.50),
  ('22000000-0000-0000-0000-000000000003', 'Coastal Catch Co.',   'in_transit',  '2026-04-13', NULL,         '2026-04-11T08:00:00Z', 'CC-20260411-003',  960.00),
  ('22000000-0000-0000-0000-000000000004', 'Artisan Creamery',    'pending',     '2026-04-14', NULL,         '2026-04-12T07:00:00Z', NULL,               285.00),
  ('22000000-0000-0000-0000-000000000005', 'Specialty Foods MN',  'delivered',   '2026-04-05', '2026-04-05', '2026-04-03T11:00:00Z', 'SF-20260403-005',  630.00)
ON CONFLICT (id) DO NOTHING;

-- ─── Seed: shipment line items ────────────────────────────────────────────────

INSERT INTO shipment_line_items (id, shipment_id, item_id, item_name, quantity_ordered, unit_cost, total_cost) VALUES
  -- Prime Provisions delivery
  ('33000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'Wagyu Ribeye',      20,  58.00, 1160.00),
  ('33000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000002', 'Braised Short Rib', 20,  34.00,  680.00),
  ('33000000-0000-0000-0000-000000000003', '22000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000006', 'Duck Confit',        8,  19.00,  152.00),
  -- Heartland Farms delivery
  ('33000000-0000-0000-0000-000000000004', '22000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000003', 'Heirloom Beets',    10,   8.50,   85.00),
  ('33000000-0000-0000-0000-000000000005', '22000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000010', 'Micro Greens Mix',   9,  14.00,  126.00),
  ('33000000-0000-0000-0000-000000000006', '22000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000015', 'Fingerling Potatoes',  12, 2.00, 24.00 ),
  -- Coastal Catch (in transit)
  ('33000000-0000-0000-0000-000000000007', '22000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000005', 'Wild Salmon',       20,  28.00,  560.00),
  ('33000000-0000-0000-0000-000000000008', '22000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000011', 'Sea Scallops',      25,  32.00,  800.00),
  -- Artisan Creamery (pending)
  ('33000000-0000-0000-0000-000000000009', '22000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000004', 'Burrata',           20,  12.00,  240.00),
  ('33000000-0000-0000-0000-000000000010', '22000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000014', 'Crème Fraîche',      6,   7.50,   45.00),
  -- Specialty Foods delivery
  ('33000000-0000-0000-0000-000000000011', '22000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000007', 'Truffle Oil',       10,  42.00,  420.00),
  ('33000000-0000-0000-0000-000000000012', '22000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000009', 'Champagne Vinegar', 12,   9.00,  108.00),
  ('33000000-0000-0000-0000-000000000013', '22000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000013', 'Black Garlic',       6,  18.00,  108.00)
ON CONFLICT (id) DO NOTHING;
