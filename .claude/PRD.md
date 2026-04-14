# OpsPilot PRD

**Version:** 1.0
**Status:** Draft for hackathon build
**Product:** OpsPilot — Small Business AI Workflow Companion
**Primary demo vertical:** Ember Table restaurant

**PRD authority:** This document is the canonical product specification for OpsPilot. Other markdown under `.claude/` (playbooks, context, workflows) should stay aligned with it. Prefer **append-only** edits and clarifications here; do not remove existing sections unless a deliberate product change is recorded (for example in `decisions/decision-log.md`).

---

## 1. Product Overview

OpsPilot is a web-based AI operations companion for small service businesses. It is designed to replace one fragmented manager workflow end-to-end: reservation event handling through invoice generation, guest follow-up, finance update, and manager action summary.

That direction matches the current MVP plan and page structure already produced in Lovable, including the dashboard, workflow timeline, customers, invoices, feedback, integrations, and inventory/performance preview pages.

For the hackathon demo, the product is framed around a restaurant. The underlying build approach stays mostly the same, so this PRD intentionally keeps much of the existing appointment/invoice/customer system structure because it maps cleanly to reservations, table service, and guest follow-up.

### 1.1 PRD Input Sources

This PRD reflects three inputs:

1. **The hackathon brief:** build an AI product that replaces one real workflow, shows clear before-vs-after, uses AI meaningfully, and demonstrates willingness to pay.
2. **The current Lovable concept and IA** for Ember Table.
3. **The Figma discussions and screenshots**, which add missing detail around scheduling/cancellations, feedback workflows, inventory logic, business performance analysis, and especially finance.

### 1.2 Phase 3 — MCP bridge, feedback, and dashboard visibility (implementation track)

This subsection records **current engineering scope** without changing earlier requirements. It complements §4.3 (IA), §8.7 (MCP Integration Service), §12.1 (MVP), and the Feedback / Integrations acceptance criteria.

| Track | What “done” means for the hackathon demo |
|-------|------------------------------------------|
| **MCP bridge** | HTTP ingress at `POST /api/integrations/webhooks/:provider` validates payloads, writes `integration_sync_events`, dedupes on `external_event_id`, and dispatches to the **same** domain services as first-party routes (`integrations` service). The **Integrations** page is the primary surface for connector status, bridge explanation, and webhook testing. The dashboard does **not** need a duplicate connector panel once this decision is recorded, but it must not hide support-impacting integration issues entirely. |
| **Feedback** | **`/feedback`** remains the home for flagged reviews, recovery drafts, and follow-up actions (§4.2.4). The **dashboard** includes a **Feedback & recovery** spotlight (summary + link) so judges always see the module. In the current implementation track, `/feedback` is driven by Supabase-backed `feedback` and `follow_up_actions` rows when migration `004_feedback_domain.sql` and seed data are applied. |
| **Navigation** | Global sidebar IA MUST list **Feedback** and **Integrations** explicitly (not only under ambiguous labels). A **Support** (or equivalent) group is acceptable if it keeps both routes one click away. |

**Non-regression:** Removing **Feedback** visibility from the dashboard or removing **Feedback / Integrations** from primary navigation is a **product regression** relative to §4.1 and §12.1 unless the PRD is formally updated. Connector detail may live on `/integrations` instead of a duplicate dashboard panel once that product decision is recorded in the decision log.

---

## 2. Goals and Objectives

### 2.1 Primary Goal

Replace the manual small-business manager workflow of:

- Handling reservation changes
- Creating and sending invoices
- Tracking payment status
- Sending feedback/follow-up messages
- Reviewing what needs attention next

### 2.2 Hackathon Success Criteria

The MVP must:

- Replace one workflow end-to-end
- Show clear before-vs-after
- Remove manual steps
- Target a specific user
- Provide a usable working demo
- Make AI central to the product, not decorative
- Support a credible payment or validation story

### 2.3 Product Objectives

- Build a believable AI-first operations dashboard, not a generic chatbot
- Make the reservation-to-invoice-to-follow-up workflow demoable in under 3 minutes
- Show modular expansion paths for inventory, finance, and performance without overbuilding them
- Fix the current weakest area: finance depth

### 2.4 Non-Goals for Hackathon Build

- Full accounting platform
- Production-grade ERP
- Real-time live integrations for every tool
- Multi-tenant enterprise admin panel
- Emergency-response or hospital-routing mode from earlier brainstorming

---

## 3. User Personas and Use Cases

### 3.1 Primary Persona: Sarah, Restaurant Owner-Manager

Sarah runs a neighborhood restaurant. She manages reservations, payments, guest service, reminders, and stock ordering. She currently jumps across booking tools, texting, payment apps, and memory. This matches the current Lovable framing while making the demo easier to understand.

### 3.2 Secondary Personas

- Front-desk coordinator
- Operations lead
- Floor manager or shift lead with limited admin responsibility
- Owner reviewing daily business health

### 3.3 Core Use Cases

| # | Use Case |
|---|----------|
| 1 | As a manager, I want completed reservations or table visits to generate invoices automatically so I do not handwrite or re-enter order details. |
| 2 | As a manager, I want overdue invoices flagged and reminded automatically so cash collection improves. |
| 3 | As a manager, I want poor customer feedback highlighted with suggested recovery actions. |
| 4 | As a manager, I want a daily AI summary that tells me what needs action now. |
| 5 | As a manager, I want basic finance visibility beyond revenue totals, including pending cash in, expense categories, tax-relevant records, and write-off tracking. |
| 6 | As a manager, I want inventory and performance previews so I can see where the product can expand next. |

---

## 4. UI/UX Specification

### 4.1 Current UI Strengths

Based on the supplied screenshots, the current product has a solid shell:

- **Left sidebar** with clear module grouping: Core, Support, Future Preview
- **Dashboard** with KPI cards, reservation list, AI manager summary, recent AI activity, finance snapshot, and inventory alerts
- **Workflow timeline** that makes the AI actions visible and demoable
- **Customers page** with upcoming reservations and guest cards
- **Invoices page** with status tagging
- **Feedback page** with flagged unhappy customers and AI-suggested actions
- **Integrations page** that explains the MCP bridge simply
- **Inventory/performance page** that frames future expansion well

These screens are strong for a hackathon because they tell one story visually: business events trigger AI actions.

### 4.2 Missing or Weak UI Areas

#### 4.2.1 Finance (Biggest Gap)

The current "Financial Snapshot" is too shallow. It shows totals, but not the manager decisions behind them. Figma notes call for:

- Transactions
- Paid fees
- Taxes
- Inventory-related spending
- Total income
- Tax write-offs
- Receipt tracking

**Required additions:**

- Cash in vs cash out
- Invoice aging
- Expense categories
- Tax-relevant transactions
- Receipts/write-off tracker
- Simple profit estimate
- Week-over-week trend
- Alerts such as "cash flow risk" or "high overdue ratio"

#### 4.2.2 Appointments / Reservations

The customers page shows reservations but not enough workflow state. Figma asks for:

- Reservation confirmations
- Reminders
- Rescheduling
- Cancellations
- Reassignment of cancelled slots
- Appointment history

#### 4.2.3 Invoices

The invoices page needs:

- Line-item detail drawer/modal
- Due-date logic
- Reminder history
- Recurring invoice example
- Invoice PDF/export placeholder
- Customer payment method note
- Audit trail

#### 4.2.4 Feedback and Follow-up

The feedback page is strong, but should add:

- Thank-you message status
- Return-visit prompt status
- Personalized follow-up suggestions based on visit history
- Feedback timeline tied to customer profile

#### 4.2.5 Inventory and Performance

The inventory page should better reflect Figma:

- Expiry-date signal
- Price-rise signal
- Equipment issue signal
- Reorder logic explanation
- Demand inputs such as history, seasonality, and external signals as future cards

### 4.3 Recommended Information Architecture

```
/                 Landing page
/dashboard
/workflow
/appointments
/customers
/invoices
/finance          ← New first-class page
/feedback
/integrations
/inventory
/analytics
```

This is one page more than the current Lovable concept because finance should be first-class, not hidden inside the dashboard. The current plan includes dashboard, workflow, customers, invoices, feedback, inventory, and integrations, but finance is only a card today.

---

## 5. Technical Architecture

### 5.1 Architecture Summary

Use a modern full-stack TypeScript web application with a React frontend, server-rendered dashboard pages, Postgres-backed operational data, and an AI workflow service that generates structured outputs.

**Next.js App Router** is a strong fit because it supports nested layouts, navigation, and server/client component patterns well for dashboard apps.

### 5.2 High-Level System Design

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend App                            │
│  • Next.js 15+ App Router                                    │
│  • Tailwind CSS + shadcn/ui                                  │
│  • Charts (Recharts) + Tables (TanStack)                     │
│  • Route groups for Core/Support/Future modules              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend Application Layer                  │
│  • Next.js route handlers + server actions                   │
│  • Optional background jobs for reminders/summaries          │
│  • Domain Services:                                          │
│    - Appointment Service                                     │
│    - Invoice Service                                         │
│    - Feedback Service                                        │
│    - Finance Service                                         │
│    - Inventory Service                                       │
│    - AI Workflow Orchestrator                                │
│    - MCP Integration Service                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Database                              │
│  • Supabase Postgres                                         │
│  • Row Level Security for tenant-aware access                │
│  • Storage for invoice PDFs and receipt uploads              │
│  • Realtime (optional) for dashboard refresh                 │
│  • Edge Functions (later) for webhooks/scheduled automation  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        AI Layer                              │
│  • OpenAI API with structured outputs                        │
│  • Deterministic business rules first, model outputs second  │
│  • JSON schema-constrained responses                         │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Infrastructure

| Component | Provider | Purpose |
|-----------|----------|---------|
| Deployment | Vercel | Preview environments, logs, cron jobs |
| Database/Auth/Storage | Supabase | Managed Postgres, Auth, Storage, Realtime |
| Source Control | GitHub | CI/CD, version control |
| Environment Tiers | Vercel | Local, preview, prod configs |

### 5.4 Core Architectural Principle

**The AI should not own the system state machine.**

Business rules should decide when an event triggers the next step; AI should classify text, generate explanations, write messages, and prioritize actions. That makes the system more reliable for a fast MVP.

---

## 6. Tech Stack Details

### 6.1 Frontend

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15+ App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Kit | shadcn/ui |
| State | React state + server data fetching |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Tables | TanStack Table |

### 6.2 Backend

| Layer | Technology |
|-------|------------|
| Runtime | Node.js via Next.js server environment |
| API Style | Route handlers (REST-like) + server actions |
| Validation | Zod schemas (shared frontend/backend) |
| Jobs | Vercel Cron for reminders, overdue checks, daily summaries |

### 6.3 Database and Storage

| Component | Technology |
|-----------|------------|
| Primary DB | Supabase Postgres |
| Auth | Supabase Auth |
| Authorization | Postgres RLS policies |
| File Storage | Supabase Storage (receipts, invoice PDFs, attachments) |
| Realtime | Optional dashboard event feed |

### 6.4 AI and Automation

| Component | Technology |
|-----------|------------|
| Model Provider | OpenAI API |
| Patterns | Structured outputs, message drafting, sentiment classification, next-action recommendations |
| Prompting Mode | JSON schema driven |
| Observability | Persist prompts, outputs, latency, confidence metadata |

---

## 7. Data Model

### 7.1 Core Domain Tables

| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant business entities |
| `users` | System users |
| `memberships` | Org-user relationships with roles |
| `customers` | End customers of the business |
| `staff` | Restaurant staff |
| `appointments` | Scheduled services |
| `appointment_events` | Audit trail of appointment changes |
| `services` | Menu item or service catalog |
| `invoices` | Customer invoices |
| `invoice_items` | Line items |
| `payments` | Payment records |
| `payment_reminders` | Reminder history |
| `feedback` | Customer feedback |
| `follow_up_actions` | Post-feedback actions |
| `finance_transactions` | All financial movements |
| `expense_categories` | Expense categorization |
| `receipts` | Receipt uploads |
| `inventory_items` | Stock items |
| `inventory_events` | Inventory audit trail |
| `ai_actions` | AI-generated actions |
| `ai_summaries` | AI-generated summaries |
| `audit_logs` | System audit trail |

### 7.2 Schema Details

#### `customers`

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| organization_id | uuid | Tenant identifier |
| full_name | text | Customer name |
| email | text | Contact email |
| phone | text | Contact phone |
| preferred_contact_channel | text | Email/SMS preference |
| last_visit_at | timestamptz | Last visit date |
| lifetime_value | numeric | Total spend |
| avg_feedback_score | numeric | Average rating |
| risk_status | text | Churn/flag status |
| notes | text | Freeform notes |

#### `appointments`

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| organization_id | uuid | Tenant identifier |
| customer_id | uuid | FK to customers |
| staff_id | uuid | FK to staff |
| service_id | uuid | FK to services |
| starts_at | timestamptz | Appointment start |
| ends_at | timestamptz | Appointment end |
| status | enum | scheduled, confirmed, in_progress, completed, rescheduled, cancelled, no_show |
| booking_source | text | Origin channel |
| confirmation_sent_at | timestamptz | Confirmation timestamp |
| reminder_sent_at | timestamptz | Reminder timestamp |
| rescheduled_from_appointment_id | uuid | FK to previous appointment |
| cancellation_reason | text | Reason for cancellation |
| notes | text | Freeform notes |

#### `invoices`

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| organization_id | uuid | Tenant identifier |
| appointment_id | uuid | FK to appointments |
| customer_id | uuid | FK to customers |
| invoice_number | text | Human-readable ID |
| currency | text | Currency code |
| subtotal | numeric | Pre-tax total |
| tax_amount | numeric | Tax |
| discount_amount | numeric | Discounts |
| total_amount | numeric | Final total |
| amount_paid | numeric | Paid amount |
| due_at | timestamptz | Due date |
| status | enum | draft, sent, pending, paid, overdue, void |
| sent_at | timestamptz | Sent timestamp |
| paid_at | timestamptz | Payment timestamp |
| pdf_path | text | Storage path |

#### `finance_transactions`

**This table is the most important finance addition. Without it, the product cannot support the finance scope discussed in Figma.**

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| organization_id | uuid | Tenant identifier |
| invoice_id | uuid (nullable) | FK to invoices |
| type | enum | revenue, expense, refund, fee, tax_payment, inventory_purchase, writeoff |
| category | text | Expense/revenue category |
| amount | numeric | Transaction amount |
| direction | enum | in, out |
| occurred_at | timestamptz | Transaction date |
| payment_method | text | Payment channel |
| tax_relevant | boolean | Tax-deductible flag |
| writeoff_eligible | boolean | Write-off candidate |
| receipt_id | uuid (nullable) | FK to receipts |
| notes | text | Freeform notes |

#### `receipts`

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| organization_id | uuid | Tenant identifier |
| transaction_id | uuid | FK to finance_transactions |
| file_path | text | Storage path |
| vendor_name | text | Vendor |
| receipt_date | date | Receipt date |
| extracted_total | numeric | OCR-extracted total |
| extraction_status | enum | pending, extracted, failed |

#### `inventory_items`

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| organization_id | uuid | Tenant identifier |
| item_name | text | Product name |
| category | text | Category |
| quantity_on_hand | integer | Current stock |
| reorder_level | integer | Reorder threshold |
| unit_cost | numeric | Cost per unit |
| expires_at | timestamptz (nullable) | Expiry date |
| vendor_name | text | Supplier |
| issue_status | text | Issue flag |
| price_trend_status | text | Price trend indicator |

#### `ai_actions`

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| organization_id | uuid | Tenant identifier |
| entity_type | text | Source entity type |
| entity_id | uuid | Source entity ID |
| trigger_type | text | Event that triggered AI |
| action_type | text | Type of AI action |
| input_summary | text | Input context |
| output_payload_json | jsonb | AI output |
| status | enum | pending, executed, failed |
| created_at | timestamptz | Creation timestamp |
| executed_at | timestamptz | Execution timestamp |

---

## 8. Service Boundaries

### 8.1 Appointment Service

**Responsibilities:**

- Create, update, cancel, reschedule appointments
- Send confirmation/reminder triggers
- Maintain appointment history
- Emit workflow events

### 8.2 Invoice Service

**Responsibilities:**

- Generate invoice from completed reservation
- Compute tax, discounts, totals
- Create line items
- Mark sent/paid/overdue
- Issue reminder events
- Produce PDF placeholders

### 8.3 Feedback Service

**Responsibilities:**

- Send post-visit requests
- Classify responses
- Flag unhappy customers
- Generate recovery recommendations
- Trigger thank-you or return-visit prompts

### 8.4 Finance Service

**Responsibilities:**

- Create revenue transactions from paid invoices
- Track pending and overdue receivables
- Record expenses, inventory purchases, fees, tax-relevant spend
- Compute dashboard metrics
- Power invoice aging and cash flow summaries

### 8.5 Inventory Service

**Responsibilities:**

- Store stock levels
- Flag reorder and expiry risks
- Track price changes and item issues
- Expose preview analytics for future forecasting

### 8.6 AI Workflow Orchestrator

**Responsibilities:**

- Subscribe to domain events
- Call model for structured recommendation payloads
- Create AI actions
- Populate workflow timeline
- Generate daily/weekly summary objects

### 8.7 MCP Integration Service

**Responsibilities:**

- Store connector metadata
- Normalize external data shapes into internal events
- Maintain sync status and error logs
- Expose "connected/disconnected/error" UI states

---

## 9. Event-Driven Workflow

### 9.1 Core Workflow

```
Reservation marked completed
        │
        ▼
   Invoice generated
        │
        ▼
    Invoice sent
        │
        ▼
Feedback request scheduled
        │
        ▼
 Finance snapshot updated
        │
        ▼
  AI manager summary refreshed
```

### 9.2 Supporting Workflows

| Trigger | Action |
|---------|--------|
| Reservation scheduled | Confirmation + reminder |
| Reservation rescheduled | Timeline update + customer notification |
| Reservation cancelled | Slot vacancy suggestion |
| Invoice overdue | Reminder + dashboard alert |
| Feedback flagged negative | Recovery action + summary alert |
| Inventory below threshold | Dashboard alert + reorder suggestion |

---

## 10. API Specification

### 10.1 Appointments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/appointments` | List appointments |
| POST | `/api/appointments` | Create appointment |
| PATCH | `/api/appointments/:id` | Update appointment |
| POST | `/api/appointments/:id/confirm` | Send confirmation |
| POST | `/api/appointments/:id/remind` | Send reminder |
| POST | `/api/appointments/:id/complete` | Mark completed |
| POST | `/api/appointments/:id/cancel` | Cancel appointment |
| POST | `/api/appointments/:id/reschedule` | Reschedule |

### 10.2 Invoices

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | List invoices |
| GET | `/api/invoices/:id` | Get invoice detail |
| POST | `/api/invoices/generate-from-appointment/:appointmentId` | Generate from appointment |
| POST | `/api/invoices/:id/send` | Send invoice |
| POST | `/api/invoices/:id/remind` | Send reminder |
| POST | `/api/invoices/:id/mark-paid` | Mark as paid |

### 10.3 Feedback

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/feedback` | List feedback |
| POST | `/api/feedback/request/:appointmentId` | Request feedback |
| POST | `/api/feedback/submit` | Submit feedback |
| POST | `/api/feedback/:id/flag` | Flag feedback |
| POST | `/api/feedback/:id/follow-up` | Trigger follow-up |

### 10.4 Finance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/finance/summary` | Get finance summary |
| GET | `/api/finance/transactions` | List transactions |
| POST | `/api/finance/transactions` | Create transaction |
| GET | `/api/finance/aging` | Invoice aging report |
| GET | `/api/finance/cash-flow` | Cash flow analysis |
| GET | `/api/finance/writeoffs` | Write-off tracker |

### 10.5 Inventory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory` | List inventory |
| POST | `/api/inventory` | Create item |
| PATCH | `/api/inventory/:id` | Update item |
| GET | `/api/inventory/alerts` | Get inventory alerts |

### 10.6 AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ai/actions` | List AI actions |
| POST | `/api/ai/summarize-day` | Generate daily summary |
| POST | `/api/ai/recommend-next-actions` | Get recommendations |
| POST | `/api/ai/classify-feedback` | Classify feedback |

### 10.7 Integrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/integrations` | List integrations |
| POST | `/api/integrations/:provider/connect` | Connect provider |
| POST | `/api/integrations/:provider/disconnect` | Disconnect provider |
| GET | `/api/integrations/:provider/sync-status` | Get sync status |

---

## 11. Authentication and Security

### 11.1 Authentication

**For the hackathon build:**

- Demo login shortcut is acceptable
- Production-oriented foundation should still be designed now

**Recommended path:**

- Supabase Auth with email/password and magic links
- Optional OAuth for Google
- Session cookies handled server-side
- Org membership model for multi-user businesses

### 11.2 Authorization

**Organization-scoped RBAC:**

- Owner
- Manager
- Front-desk
- Staff

Use **Row Level Security** at the Postgres layer so every row is constrained by `organization_id` and membership claims.

### 11.3 Security Requirements

- Encrypt secrets via hosted platform environment variables
- Store only necessary customer PII
- Audit log all destructive actions
- Rate-limit public form submissions (e.g., feedback endpoints)
- Validate all inputs with shared schemas
- Signed URLs for storage access where needed
- CSRF-safe mutation patterns
- No model outputs should directly execute financial mutations without deterministic validation

### 11.4 Compliance Note

This product should avoid presenting itself as accounting or tax advice. Finance views are "manager visibility" tools, not formal bookkeeping guarantees.

---

## 12. Features and Requirements

### 12.1 P0 — Must-Have for Hackathon Demo

#### 1. Dashboard

**Requirements:**

- Greeting and business context
- KPI cards:
  - Today's reservations
  - Today's revenue
  - Overdue payments
  - Unhappy customers
- Today's reservations list
- AI manager summary panel
- Recent AI activity feed
- Financial snapshot
- Inventory alerts preview

**Acceptance:**

- User can understand the day in under 15 seconds
- At least one action recommendation is visible
- Metrics update from mock workflow state

#### 2. Workflow Timeline

**Requirements:**

- Show ordered event stream for today
- Show triggers, action type, timestamp, status
- Distinguish generated invoice, sent invoice, reminder, feedback request, flagged feedback
- Include explanatory footer that teaches judges how to read the timeline

**Acceptance:**

- One completed reservation clearly propagates into downstream actions

#### 3. Appointments and Customers

**Requirements:**

- Appointments table with status tags
- Customer directory cards
- Customer history preview
- Appointment lifecycle states
- Future: cancelled-slot reassignment suggestion shown in UI

**Acceptance:**

- Can view scheduled, in-progress, completed states
- At least one guest has repeat-visit context

#### 4. Invoices

**Requirements:**

- Invoice list with statuses
- Due dates
- Totals
- Paid/pending/overdue counts
- Reminder history teaser
- Invoice detail drawer with line items and tax
- PDF/export placeholder state

**Acceptance:**

- At least two overdue invoices visible
- Invoice generated from reservation relationship is clear

#### 5. Feedback and Follow-ups

**Requirements:**

- Average rating
- Flagged count
- Positive count
- Flagged unhappy customer cards
- AI-suggested recovery action
- All feedback list
- Follow-up state:
  - Requested
  - Thank-you sent
  - Callback needed
  - Return-visit prompt suggested

**Acceptance:**

- At least one poor rating triggers a visible manager action

#### 6. Finance

**Requirements:**

- Dedicated finance page or expanded finance section
- Metrics:
  - Revenue today
  - Revenue this week
  - Pending receivables
  - Overdue receivables
  - Expenses this week
  - Net cash flow estimate
- Invoice aging widget
- Transaction table
- Expense categories
- Tax-relevant transactions
- Receipt/write-off tracker preview

**Acceptance:**

Manager can answer:

- What is waiting to come in?
- What already went out?
- Which spend may matter for taxes?
- Where is cash flow at risk?

#### 7. Integrations and MCP Bridge

**Requirements:**

- Explain MCP bridge in plain language
- Show connectors:
  - Calendar
  - Payments/POS
  - Email
  - Accounting
  - Inventory
  - SMS (optional)
- Show status and last sync time
- Show connected/disconnected/error states

**Acceptance:**

- Judge can understand that data is unified through one connector model

### 12.2 P1 — Strong Should-Have

#### Scheduling Enhancements

- Booking confirmation state
- Reminder state
- Reschedule/cancel flows
- No-show state
- Slot-reassignment suggestion

#### Invoice Enhancements

- Recurring invoice example
- Partial payment example
- Payment method metadata
- Invoice note drafted by AI

#### Finance Enhancements

- Refund handling
- Fee tracking
- Weekly trend chart
- Simple menu-line profitability preview
- Tax/write-off filter
- Export CSV

#### Feedback Enhancements

- Personalized return-visit suggestion
- Thank-you automation status
- Sentiment explanation
- Customer-level satisfaction history

#### Inventory and Performance Preview

- Expiry alerts
- Price increase signals
- Equipment issue signals
- Menu demand trend cards
- "Future forecast" cards clearly marked preview

### 12.3 P2 — Later

- Real Google Calendar sync
- Real email/SMS sending
- QuickBooks or Stripe/Square live connector
- Receipt OCR
- Staff scheduling optimization
- External signal forecasting using weather/news
- Advanced AI agent planning
- Formal accountant export workflows

---

## 13. Performance, Scalability, and Deployment

### 13.1 Expected Load

Hackathon MVP load is light:

- Tens of demo users
- Low write frequency
- Mostly dashboard reads

### 13.2 Performance Requirements

| Metric | Target |
|--------|--------|
| First meaningful page load | Under 2.5s on broadband |
| Dashboard server response | Under 500ms (excluding cold starts) |
| API p95 | Under 700ms for normal CRUD |
| AI-generated summary refresh | Under 5s |
| Finance summary queries | Cached or pre-aggregated |

### 13.3 Scalability Strategy

- Organization-scoped schema supports multi-tenant growth
- Event tables separate from entity tables for auditability
- Server-render high-level dashboards, client-hydrate only interactive widgets
- Precompute expensive summaries on cron
- Paginate invoice and transaction tables
- Use DB indexes on:
  - `organization_id`
  - `status`
  - `due_at`
  - `starts_at`
  - `created_at`

### 13.4 Deployment

| Component | Provider |
|-----------|----------|
| Frontend/Backend | Vercel |
| Database/Auth/Storage | Supabase |
| Source Control | GitHub |
| Preview Deploys | Every PR branch |
| Environment Tiers | Local, preview, production |
| Scheduled Jobs | Vercel Cron |

### 13.5 CI/CD

- Lint
- Typecheck
- Unit tests on domain services
- DB migration checks
- Preview deploy
- Smoke test core routes

### 13.6 Monitoring and Maintenance

- Vercel runtime logs
- Error tracking with Sentry
- Supabase logs for DB and auth issues
- Business event audit log page for debugging demo flows
- Monthly review of AI prompts and structured schema drift

---

## 14. Appendices

### Appendix A — Explicit Mapping to Figma Discussion Points

#### Appointment Scheduling and Cancellation

- Availability-based reservation state
- Confirmations
- Reminders
- Reschedule and cancel
- Cancelled-slot reassignment suggestion
- Appointment history

#### Automating Invoice Creation

- Invoice generated after reservation completion
- Line items (quantity, tax, discounts, total)
- Email sending state
- Paid/pending/overdue tracking
- Reminder history
- Recurring invoice example
- Invoice history by customer
- Invoice PDF placeholder

#### Feedback and Follow-up

- Feedback request after visit
- Ratings/comments
- Unhappy customer flag
- Thank-you flow
- Repeat-visit reminder
- Personalized follow-up suggestions
- Customer feedback record

#### Inventory

- Stock level
- Reorder suggestion
- Expiry tracking
- Equipment issue tracking
- Price-rise tracking

#### Finance

Add missing requirements beyond current UI:

- Full transaction list
- Expenses and fees
- Tax-relevant tracking
- Inventory spending
- Write-off candidate tracking
- Receipts
- Simple net cash flow
- Aging and overdue ratios

#### Performance Analyzer

- Revenue trend
- Retention trend
- Busy-day indicator
- Demand trend preview
- "Future predictive model" card clearly labeled as later phase

---

### Appendix B — Current Scope vs Missing Scope

#### Already Represented in Current Lovable Build

- Dashboard
- Workflow timeline
- Customers
- Invoices
- Feedback
- Integrations
- Inventory/performance preview
- AI action framing

#### Not Yet Strong Enough

- Finance depth
- Reservation lifecycle detail
- Invoice detail and reminder history
- Customer history linkage
- Role-based auth
- Backend architecture
- Durable event model
- Real workflow execution engine

---

### Appendix C — Demo Script Alignment

The demo should follow this sequence:

1. Show dashboard problem state
2. Open completed reservation
3. Show generated invoice
4. Show timeline event trail
5. Show overdue alert and reminder
6. Show negative feedback flag
7. Show finance page proving this is not just a chatbot
8. End on AI manager summary

---

### Appendix D — Implementation Memory Snapshot

This appendix is additive project memory. It captures implementation truths that future contributors and tools should preserve.

#### Current Milestone Status

The codebase now contains a substantial part of the first operational milestone:

- Supabase migration for the core ledger domain
- deterministic seed data for Ember Table demo states
- service-layer implementations for appointments, invoices, finance, and integrations
- read-model query modules for dashboard, appointments, invoices, and finance
- route handlers for dashboard summary, appointments, invoices, finance, and integration webhooks
- server-rendered pages that consume real route/query-backed data patterns

#### Engineering Rules Learned During Implementation

- Prefer a dedicated read-model query layer for page and route response shaping instead of repeating row-to-UI mapping logic.
- Keep `env.ts` and the Supabase server client server-only.
- Do not rely on network-fetched fonts in baseline verification paths.
- Use Zod v4-compatible record signatures.
- Webhook ingestion must support payload normalization, raw payload storage, dedupe, and dispatch through the same service layer as first-party APIs.

#### Stable Architectural Expectations

- Supabase/Postgres remains the source of truth.
- Service modules own deterministic business mutations.
- Query modules own UI-facing read shaping.
- AI stays downstream of facts and must not own financial truth or workflow truth.

#### Known Next Priorities

- connect and validate against a live Supabase project
- add automated tests for `mark-paid` idempotency and webhook dedupe
- complete feedback and AI summary flows on top of the deterministic foundation

---

### Appendix E — 6-Hour Deadline Status (2026-04-14)

**This appendix is the authoritative "what's done vs. what's left" for the hackathon submission deadline.**

#### E.1 — What Is Complete (Can Demo End-to-End)

| Module | Status | Evidence |
|--------|--------|----------|
| **Database Schema** | ✅ Complete | `supabase/migrations/0001_core_ledger.sql`, `002_invoice_reminders.sql`, `004_feedback_domain.sql` |
| **Seed Data** | ✅ Complete | `supabase/seed.sql` (core ledger), `supabase/seed_feedback_addon.sql` (feedback demo rows) |
| **Appointments Service** | ✅ Complete | `src/lib/services/appointments.ts` — `completeAppointment()` creates invoice + events |
| **Invoice Service** | ✅ Complete | `src/lib/services/invoices.ts` — `generateInvoice()`, `markInvoicePaid()` with idempotency |
| **Finance Service** | ✅ Complete | `src/lib/services/finance.ts` — revenue transaction creation on `mark_paid` |
| **Integrations Service** | ✅ Complete | `src/lib/services/integrations.ts` — webhook ingestion, dedupe on `external_event_id`, dispatch to same services |
| **Feedback Service** | ✅ Complete | `src/lib/services/feedback.ts` — full analysis pipeline, AI integration, follow-up actions |
| **Query Layer (Read Models)** | ✅ Complete | `src/lib/queries/{dashboard,appointments,invoices,finance,feedback}.ts` |
| **API Routes — Core** | ✅ Complete | `/api/appointments/:id/complete`, `/api/invoices/:id/mark-paid`, `/api/invoices/:id/send`, `/api/finance/summary`, `/api/dashboard/summary` |
| **API Routes — Feedback** | ✅ Complete | `/api/review` (POST — full agent pipeline), `/api/feedback/submit`, `/api/feedback/:id/flag`, `/api/feedback/:id/follow-up`, `/api/feedback/:id/approve-reply` |
| **API Routes — Integrations** | ✅ Complete | `/api/integrations/webhooks/:provider` (POST — MCP bridge ingress) |
| **Customer Service Agent** | ✅ Complete | `agents/customer-service/agent.js` — `analyzeReview()` + `analyzeAndRespond()` with full JSON schema |
| **Dashboard Page** | ✅ Complete | `/dashboard` — KPI cards, Feedback & recovery spotlight, AI manager briefing, finance snapshot |
| **Feedback Page** | ✅ Complete | `/feedback` — flagged reviews, pending manager decisions, all feedback table, approval/dismissal actions |
| **Invoices Page** | ✅ Complete | `/invoices` — list with status tags, detail drawer, mark-paid flow |
| **Finance Page** | ✅ Complete | `/finance` — transactions table, cash flow summary, invoice aging |
| **Appointments Page** | ✅ Complete | `/appointments` — reservation list with status progression |
| **Integrations Page** | ✅ Complete | `/integrations` — connector status, MCP bridge explanation |

#### E.2 — What Is Partially Complete (Needs Final Touches)

| Module | Status | What's Left |
|--------|--------|-------------|
| **AI Manager Summary** | 🟡 Partial | `src/lib/ai/generate-daily-summary.ts` exists but may need wiring to `/api/ai/manager-summary` route |
| **Follow-up Message Generation** | 🟡 Partial | `src/lib/ai/generate-followup.ts` exists — verify it's called on appointment complete |
| **Workflow Timeline Page** | 🟡 Partial | `/workflow` page exists — verify it shows `appointment_events` rows |
| **Guest History Resolution** | 🟡 Partial | `/api/review` resolves `guestId` → full history, but may need email-based fallback for external reviews |

#### E.3 — What Is NOT Implemented (Can Be Deferred Or Mocked)

| Module | Status | Notes |
|--------|--------|-------|
| **Automated Tests** | 🟡 Partial | `npm test` exists (Vitest) and there are `src/**/*.test.ts` files, but coverage is still limited and should be expanded post-hackathon |
| **Real Email/SMS Sending** | ❌ Not Started | Message drafts are generated but not sent — acceptable for demo |
| **Public Review Posting** | ❌ Not Started | Google/Yelp reply approval updates DB state only — manual posting is fine for demo |
| **Receipt Upload/OCR** | ❌ Not Started | `receipts` table exists but no upload UI — not required for core demo |
| **Inventory Predictions** | ❌ Not Started | Inventory prediction model not yet integrated — inventory page uses mock alerts |
| **Performance Analyzer** | ❌ Not Started | Performance analysis model not yet wired — can demo with static cards |
| **n8n Workflow Integration** | ❌ Not Started | Webhook routes exist but n8n flows not configured — can simulate with direct POST |

#### E.4 — Demo-Ready Workflow (Can Execute Live)

**The following end-to-end flow works with live Supabase data:**

```
1. POST /api/appointments/:id/complete
   → Invoice generated deterministically
   → appointment_events row inserted
   → follow-up message drafted

2. POST /api/invoices/:id/mark-paid
   → Invoice status → "paid"
   → Exactly one revenue finance_transaction row created
   → amount_paid updated

3. POST /api/review
   → Customer service agent analyzes review
   → feedback row inserted/updated
   → ai_actions row recorded
   → follow_up_actions created if recovery needed
   → customer risk_status patched

4. GET /dashboard
   → All KPIs reflect DB truth
   → Feedback spotlight shows flagged reviews
   → Finance snapshot shows revenue/expenses
   → Integrations stay one click away in nav and on `/integrations`
```

#### E.5 — Supabase Connection Checklist (Must Complete Before Demo)

```bash
# 1. Create Supabase project (if not done)
# 2. Copy .env.example → .env.local (or create .env.local manually)
# 3. Fill in:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...

# 4. Apply migrations in order:
#    - 0001_core_ledger.sql
#    - 002_invoice_reminders.sql
#    - 004_feedback_domain.sql

# 5. Run seed:
#    - supabase/seed.sql (full seed)
#    OR
#    - supabase/seed_feedback_addon.sql (if core data already exists)

# 6. Verify:
npm run lint && npx tsc --noEmit && npm run build
```

#### E.6 — Known Gaps vs. PRD Requirements

| PRD Section | Requirement | Current Status |
|-------------|-------------|----------------|
| §4.2.1 Finance | Receipt/write-off tracker | Table exists, UI not built |
| §4.2.2 Appointments | Reassignment suggestion for cancelled slots | Not implemented |
| §4.2.3 Invoices | PDF/export placeholder | Not implemented |
| §4.2.4 Feedback | Personalized return-visit suggestions | Partially in agent, not surfaced in UI |
| §12.1 P0 #6 Finance | Invoice aging widget | Query exists, widget not prominent |
| §12.2 P1 | Recurring invoice example | Not implemented |

**These gaps are acceptable for hackathon demo — the core reservation→invoice→finance→feedback loop is complete.**

#### E.7 — File Ownership Summary

| Owner | Files | Status |
|-------|-------|--------|
| **Anant (you)** | Customer service agent, feedback APIs, dashboard, finance, integrations, MCP bridge | ✅ Complete |
| **Teammate** | Performance analyzer (archived / not included in this repo), inventory prediction model | 🟡 Not yet integrated |
| **Shared** | Supabase schema, seed data, base UI components | ✅ Complete |

#### E.8 — Recommended Final 6-Hour Plan

**Hours 1-2: Supabase Connection**
- Apply all migrations to live project
- Run full seed
- Verify `/dashboard` loads with real data

**Hours 3-4: Demo Flow Rehearsal**
- Complete a reservation → verify invoice generated
- Mark invoice paid → verify finance row created
- Submit review → verify feedback page shows flagged card
- Approve/dismiss follow-up → verify state updates

**Hours 5-6: Polish & Recording**
- Fix any UI rough edges discovered during rehearsal
- Record demo video as backup
- Prepare pitch deck / speaker notes
