# OpsPilot · Ember Table

AI operations companion for Ember Table — a fine-dining restaurant. Milestone 1 establishes the source-of-truth domain layer in Supabase Postgres that backs all AI-assisted workflows.

## Tech stack

- **Next.js 16 App Router** (TypeScript, Server Components, Route Handlers)
- **Supabase Postgres** — source of truth for reservations, invoices, and the financial ledger
- **Zod v4** — shared schema validation between front-end and back-end
- **n8n** — external automations only (email/SMS delivery); no business logic lives here

## Local setup

### 1. Copy environment variables

```bash
cp .env.local.example .env.local
```

Fill in your Supabase project URL and keys. The `DEMO_ORG_ID` default is already set to `00000000-0000-0000-0000-000000000001` (Ember Table).

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DEMO_ORG_ID=00000000-0000-0000-0000-000000000001
```

### 2. Apply the migration

Run once against your Supabase project (or use the Supabase dashboard SQL editor):

```bash
# via Supabase CLI
supabase db push

# or paste supabase/migrations/0001_core_ledger.sql directly into the SQL editor
```

### 3. Seed demo data

```bash
# Using the Supabase CLI
psql "$(supabase status | grep 'DB URL' | awk '{print $3}')" < supabase/seed.sql

# Or via the TypeScript seed runner (requires .env.local)
npx tsx src/lib/seed/run.ts
```

The seed creates the full Ember Table demo state:
- 3 staff members, 5 services, 8 guests
- Reservations across live workflow states: scheduled, confirmed, in-progress, completed, rescheduled, cancelled, no-show
- 1 paid invoice with a matching `finance_transactions` revenue row (ledger proof)
- 2 sent invoices
- 1 pending invoice
- 2 overdue invoices
- 4 integration connectors: OpenTable, Square, Gmail, Google Reviews

### 4. Start the dev server

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to the `/dashboard`.

---

## API reference (for judges)

All endpoints scope to `DEMO_ORG_ID`. Production auth is stubbed; `organization_id` is enforced on every query.

### Dashboard summary

```bash
curl http://localhost:3000/api/dashboard/summary
```

### Reservations

```bash
# List all reservations
curl http://localhost:3000/api/appointments

# Filter by status
curl "http://localhost:3000/api/appointments?status=scheduled"

# Single reservation detail
curl http://localhost:3000/api/appointments/APPOINTMENT_UUID

# Complete a reservation (triggers invoice generation)
curl -X POST http://localhost:3000/api/appointments/00000000-0000-0000-0004-000000000005/complete \
  -H "Content-Type: application/json" \
  -d '{"notes": "Table enjoyed the tasting menu"}'
```

### Invoices

```bash
# List all invoices
curl http://localhost:3000/api/invoices

# Filter by status
curl "http://localhost:3000/api/invoices?status=overdue"

# Invoice detail with line items
curl http://localhost:3000/api/invoices/00000000-0000-0000-0005-000000000002

# Send invoice to guest (status: draft → sent)
curl -X POST http://localhost:3000/api/invoices/00000000-0000-0000-0005-000000000004/send \
  -H "Content-Type: application/json" \
  -d '{"notes": "Thank you for dining with us"}'

# Mark invoice paid — writes idempotent revenue row to finance_transactions
curl -X POST http://localhost:3000/api/invoices/00000000-0000-0000-0005-000000000003/mark-paid \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod": "card", "amountPaid": 1308.00}'
```

### Finance

```bash
# Finance KPI summary (revenue, expenses, outstanding, writeoffs)
curl http://localhost:3000/api/finance/summary

# Transaction ledger
curl http://localhost:3000/api/finance/transactions

# Record a manual transaction (e.g. a food cost expense)
curl -X POST http://localhost:3000/api/finance/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "expense",
    "category": "food_cost",
    "amount": 240.00,
    "direction": "out",
    "notes": "Weekly produce order"
  }'
```

### MCP bridge (integration webhooks)

```bash
# List configured integration connectors
curl http://localhost:3000/api/integrations

# Ingest a payment webhook. Raw payload is archived, deduped on externalEventId,
# and the same invoice service path is used underneath.
curl -X POST http://localhost:3000/api/integrations/webhooks/square \
  -H "Content-Type: application/json" \
  -d '{
    "externalEventId": "sq_evt_001",
    "eventType": "payment.completed",
    "data": {
      "invoiceId": "00000000-0000-0000-0005-000000000004",
      "amount": 207.10,
      "paymentMethod": "card"
    }
  }'
```

Snake_case aliases are also accepted for webhook payloads:
`external_event_id`, `event_type`, `payload`, `occurred_at`, `schema_version`.

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── dashboard/summary/     # GET  — dashboard KPI payload
│   │   ├── appointments/          # GET  — list; [id] detail + complete
│   │   ├── invoices/              # GET  — list; [id] detail, send, mark-paid
│   │   ├── finance/               # GET  — summary + transactions; POST create
│   │   └── integrations/          # GET  — connectors; webhooks/[provider] POST
│   ├── dashboard/                 # Server component — KPI cards + recent activity
│   ├── appointments/              # Reservations list
│   ├── invoices/                  # Invoice list + status pills
│   ├── finance/                   # Finance overview + ledger
│   ├── feedback/                  # Stub (Milestone 2)
│   └── integrations/              # MCP bridge connector list (stub)
└── lib/
    ├── constants/enums.ts          # Single source of truth for all domain enums
    ├── db/supabase-server.ts       # Server-only Supabase client (service role)
    ├── domain/
    │   ├── invoice-calculator.ts   # Deterministic totals — AI never owns these
    │   └── status-guards.ts        # Valid state-transition rules
    ├── env.ts                      # Zod-validated env vars
    ├── queries/dashboard.ts        # Read-model aggregations
    ├── schemas/                    # Zod schemas: appointment, invoice, finance, events
    ├── seed/run.ts                 # TypeScript seed runner
    └── services/                   # Domain services: appointments, invoices, finance, integrations

supabase/
├── migrations/0001_core_ledger.sql # Full schema
└── seed.sql                        # Ember Table demo data
```

## AI safety boundaries

The AI layer (Milestone 2+) is explicitly forbidden from:

- Writing to `finance_transactions` directly
- Computing or overriding invoice totals
- Changing `invoices.status` or `appointments.status`
- Owning overdue/payment state

It may read summaries, draft explanation text, classify risk, and suggest prioritised actions — nothing more.
