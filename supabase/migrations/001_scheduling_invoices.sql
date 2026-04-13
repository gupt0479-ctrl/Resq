-- ============================================================
-- CUSTOMERS
-- ============================================================
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text,
  visit_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- APPOINTMENTS
-- ============================================================
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  party_size integer not null default 2,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'completed', 'cancelled', 'no_show')),
  notes text,
  occasion text,
  reminder_sent boolean not null default false,
  follow_up_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_customer_id_idx on appointments(customer_id);
create index if not exists appointments_starts_at_idx on appointments(starts_at);
create index if not exists appointments_status_idx on appointments(status);

-- ============================================================
-- INVOICES
-- ============================================================
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  line_items jsonb not null default '[]',
  subtotal numeric(10,2) not null default 0,
  tax_rate numeric(5,4) not null default 0.08,
  tax_amount numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'overdue')),
  due_at timestamptz not null,
  paid_at timestamptz,
  reminder_count integer not null default 0,
  last_reminded_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_customer_id_idx on invoices(customer_id);
create index if not exists invoices_status_idx on invoices(status);
create index if not exists invoices_due_at_idx on invoices(due_at);

-- ============================================================
-- FOLLOW UPS
-- ============================================================
create table if not exists follow_ups (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  message text not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SEED DATA — Ember Table restaurant demo
-- ============================================================
insert into customers (id, name, email, phone, visit_count) values
  ('a1000000-0000-0000-0000-000000000001', 'James Okafor', 'james@example.com', '555-0101', 3),
  ('a1000000-0000-0000-0000-000000000002', 'Priya Menon', 'priya@example.com', '555-0102', 1),
  ('a1000000-0000-0000-0000-000000000003', 'Lena Kovacs', 'lena@example.com', '555-0103', 5)
on conflict do nothing;

insert into appointments (id, customer_id, party_size, starts_at, ends_at, status, occasion) values
  (
    'b1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    4,
    now() - interval '2 hours',
    now() - interval '30 minutes',
    'completed',
    'anniversary'
  ),
  (
    'b1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000002',
    2,
    now() + interval '2 hours',
    now() + interval '4 hours',
    'confirmed',
    null
  ),
  (
    'b1000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000003',
    6,
    now() - interval '5 days',
    now() - interval '5 days' + interval '2 hours',
    'completed',
    'birthday'
  )
on conflict do nothing;

insert into invoices (
  appointment_id, customer_id, line_items,
  subtotal, tax_rate, tax_amount, discount_amount, total,
  status, due_at, reminder_count
) values
  (
    'b1000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000003',
    '[
      {"description":"Tasting Menu x6","quantity":6,"unit_price":95},
      {"description":"Wine Pairing x6","quantity":6,"unit_price":55},
      {"description":"Birthday Cake","quantity":1,"unit_price":45}
    ]',
    762.00, 0.08, 60.96, 0, 822.96,
    'overdue',
    now() - interval '3 days',
    2
  )
on conflict do nothing;