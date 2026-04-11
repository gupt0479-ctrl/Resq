# OpsPilot PRD

**Version:** 1.0
**Status:** Draft for hackathon build
**Product:** OpsPilot — Small Business AI Workflow Companion
**Primary demo vertical:** Glow Studio hair salon

---

## 1. Product Overview

OpsPilot is a web-based AI operations companion for small service businesses. It is designed to replace one fragmented manager workflow end-to-end: appointment event handling through invoice generation, customer follow-up, finance update, and manager action summary.

That direction matches the current MVP plan and page structure already produced in Lovable, including the dashboard, workflow timeline, customers, invoices, feedback, integrations, and inventory/performance preview pages.

### 1.1 PRD Input Sources

This PRD reflects three inputs:

1. **The hackathon brief:** build an AI product that replaces one real workflow, shows clear before-vs-after, uses AI meaningfully, and demonstrates willingness to pay.
2. **The current Lovable concept and IA** for Glow Studio.
3. **The Figma discussions and screenshots**, which add missing detail around scheduling/cancellations, feedback workflows, inventory logic, business performance analysis, and especially finance.

---

## 2. Goals and Objectives

### 2.1 Primary Goal

Replace the manual small-business manager workflow of:

- Handling booking changes
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
- Make the appointment-to-invoice-to-follow-up workflow demoable in under 3 minutes
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

### 3.1 Primary Persona: Sarah, Salon Owner-Manager

Sarah runs a 3-stylist salon. She manages appointments, payments, customer service, reminders, and stock ordering. She currently jumps across calendar, texting, payment apps, and memory. This matches the current Lovable framing.

### 3.2 Secondary Personas

- Front-desk coordinator
- Operations lead
- Stylist or service provider with limited admin responsibility
- Owner reviewing daily business health

### 3.3 Core Use Cases

| # | Use Case |
|---|----------|
| 1 | As a manager, I want completed appointments to generate invoices automatically so I do not handwrite or re-enter service details. |
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
- **Dashboard** with KPI cards, appointment list, AI manager summary, recent AI activity, finance snapshot, and inventory alerts
- **Workflow timeline** that makes the AI actions visible and demoable
- **Customers page** with upcoming appointments and customer cards
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

#### 4.2.2 Appointments

The customers page shows appointments but not enough workflow state. Figma asks for:

- Booking confirmations
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
- Rebooking prompt status
- Personalized follow-up suggestions based on service history
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
| `staff` | Service providers |
| `appointments` | Scheduled services |
| `appointment_events` | Audit trail of appointment changes |
| `services` | Service catalog |
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
| last_visit_at | timestamptz | Last service date |
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

- Generate invoice from completed appointment
- Compute tax, discounts, totals
- Create line items
- Mark sent/paid/overdue
- Issue reminder events
- Produce PDF placeholders

### 8.3 Feedback Service

**Responsibilities:**

- Send post-service requests
- Classify responses
- Flag unhappy customers
- Generate recovery recommendations
- Trigger thank-you or rebooking prompts

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
Appointment marked completed
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
| Appointment scheduled | Confirmation + reminder |
| Appointment rescheduled | Timeline update + customer notification |
| Appointment cancelled | Slot vacancy suggestion |
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
  - Today's appointments
  - Today's revenue
  - Overdue payments
  - Unhappy customers
- Today's appointments list
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

- One completed appointment clearly propagates into downstream actions

#### 3. Appointments and Customers

**Requirements:**

- Appointments table with status tags
- Customer directory cards
- Customer history preview
- Appointment lifecycle states
- Future: cancelled-slot reassignment suggestion shown in UI

**Acceptance:**

- Can view scheduled, in-progress, completed states
- At least one customer has repeat-visit context

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
- Invoice generated from appointment relationship is clear

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
  - Rebooking prompt suggested

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
- Simple service-line profitability preview
- Tax/write-off filter
- Export CSV

#### Feedback Enhancements

- Personalized rebooking suggestion
- Thank-you automation status
- Sentiment explanation
- Customer-level satisfaction history

#### Inventory and Performance Preview

- Expiry alerts
- Price increase signals
- Equipment issue signals
- Service demand trend cards
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

- Availability-based booking state
- Confirmations
- Reminders
- Reschedule and cancel
- Cancelled-slot reassignment suggestion
- Appointment history

#### Automating Invoice Creation

- Invoice generated after appointment completion
- Line items (quantity, tax, discounts, total)
- Email sending state
- Paid/pending/overdue tracking
- Reminder history
- Recurring invoice example
- Invoice history by customer
- Invoice PDF placeholder

#### Feedback and Follow-up

- Feedback request after service
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
- Appointment lifecycle detail
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
2. Open completed appointment
3. Show generated invoice
4. Show timeline event trail
5. Show overdue alert and reminder
6. Show negative feedback flag
7. Show finance page proving this is not just a chatbot
8. End on AI manager summary