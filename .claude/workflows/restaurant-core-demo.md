# Restaurant Core Demo Workflow

This is the exact workflow the hackathon build should support first.

## Use This File When The Prompt Mentions

- workflow
- reservation
- appointment
- invoice
- finance
- demo story
- judge flow
- end to end

## Canonical Flow

1. A reservation exists in the system.
2. The reservation is marked `completed`.
3. The backend creates an invoice from reservation or order data.
4. The invoice is marked `sent` or `pending`.
5. Finance snapshot metrics update.
6. A feedback request is scheduled.
7. Feedback is submitted.
8. If feedback is negative, AI drafts a recovery action and flags the guest.
9. AI manager summary refreshes with what needs attention now.

## Domain Mapping

Use this mapping consistently in UI copy, seed data, and workflow naming:

- `appointments` = reservations or table visits
- `services` = menu categories or billable items
- `invoice_items` = ordered menu items or charges
- `staff` = host, server, floor manager
- `customers` = guests
- `follow_up_actions` = thank-you note, recovery outreach, return-visit prompt

Do not spend hackathon time renaming every table. Keep semantics clear instead.

## Enums To Lock First

### Reservation Status

- `scheduled`
- `confirmed`
- `in_progress`
- `completed`
- `rescheduled`
- `cancelled`
- `no_show`

### Invoice Status

- `draft`
- `sent`
- `pending`
- `paid`
- `overdue`
- `void`

### AI Action Status

- `pending`
- `executed`
- `failed`

### Finance Direction

- `in`
- `out`

## Event Types To Lock First

- `reservation.created`
- `reservation.confirmed`
- `reservation.completed`
- `invoice.generated`
- `invoice.sent`
- `invoice.paid`
- `invoice.overdue`
- `feedback.received`
- `feedback.flagged`
- `summary.refresh_requested`

These events are the code-level expression of the PRD workflow.

## Deterministic Rules

The backend, not AI, owns:

- invoice item creation
- subtotal calculation
- tax calculation
- discount handling
- fee handling
- invoice status changes
- finance transaction creation
- overdue state

AI may assist with:

- invoice note text
- reminder wording
- feedback classification
- recovery drafting
- manager summary generation

## Internal AI Tasks

Implement only these four tasks first:

- `classifyFeedback`
- `draftFollowup`
- `suggestRecoveryAction`
- `generateDailyManagerSummary`

Every AI task must have:

- an explicit input shape
- a Zod output schema
- a provider adapter call
- response validation
- persistence to `ai_actions` or `ai_summaries`

## Backend Event Flow

### Reservation Completed

Route:

- `POST /api/appointments/:id/complete`

Backend steps:

1. Validate request and organization scope.
2. Mark reservation completed.
3. Insert `appointment_events` row.
4. Create invoice deterministically.
5. Insert `invoice_items`.
6. Enqueue feedback request scheduling.
7. Enqueue manager summary refresh.

### Invoice Sent

Route:

- `POST /api/invoices/:id/send`

Backend steps:

1. Validate invoice exists.
2. Set `sent_at` and invoice status.
3. Schedule reminder workflow if unpaid.
4. Emit internal `invoice.sent` event.
5. Optionally trigger n8n delivery workflow.

### Feedback Submitted

Route:

- `POST /api/feedback/submit`

Backend steps:

1. Store feedback payload.
2. Run `classifyFeedback`.
3. Validate structured output.
4. If negative, create guest flag and recovery draft.
5. Emit `summary.refresh_requested`.

### Daily Summary

Trigger:

- cron or manual refresh

Backend steps:

1. Gather pending, overdue, and flagged metrics.
2. Gather recent events.
3. Run `generateDailyManagerSummary`.
4. Store result in `ai_summaries`.
5. Render on dashboard.

## Finance Minimum

Treat `finance_transactions` as first-class from day one.

Minimum rules:

- when an invoice is marked paid, create a revenue transaction
- when an expense is recorded, create an expense transaction
- compute aging from invoices
- compute pending and overdue receivables from unpaid invoices
- support tax-relevant and writeoff-eligible filters
- retain receipt storage linkage on transactions

## Build Order

### Phase 1

- folder structure
- shared Zod schemas
- environment variable contract
- Supabase clients
- provider adapter interface

### Phase 2

- core tables
- indexes
- seed data

### Phase 3

- `AppointmentService`
- `InvoiceService`
- `FinanceService`
- `FeedbackService`
- `AIOrchestrator`
- **UI contract (PRD §1.2):** Dashboard always includes **MCP bridge & connectors** and **Feedback & recovery** panels; sidebar lists **Feedback** and **Integrations** explicitly. Do not drop these without updating the PRD.

### Phase 4

- `POST /api/appointments/:id/complete`
- `POST /api/invoices/:id/send`
- `POST /api/invoices/:id/mark-paid`
- `GET /api/finance/summary`
- `GET /api/dashboard/summary`
- `GET /api/invoices`
- `GET /api/invoices/:id`
- `GET /api/appointments`

### Phase 5

- n8n invoice email workflow
- n8n feedback request workflow
- n8n overdue reminder workflow

### Phase 6

- KPI cards
- workflow timeline
- finance snapshot
- manager summary

## What Not To Build First

- freeform chatbot
- AI-controlled invoice totals
- n8n as source of truth
- real POS sync
- OCR
- staff scheduling optimization
- MCP-heavy connector scope

## Current Implementation Note

The repo already includes milestone-1 foundations for:

- Supabase migration and seed
- appointment, invoice, finance, and integration services
- read-model queries for dashboard, appointments, invoices, and finance
- route handlers for the main workflow and read APIs
- pages backed by server-side Supabase reads

The next work should prefer live Supabase validation, automated tests, and completion of feedback/AI layers over rebuilding the milestone-1 architecture.
