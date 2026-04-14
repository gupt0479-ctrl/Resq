# Restaurant Core Demo Workflow

Use this as the canonical demo sequence.

## Demo story

1. Open `/dashboard`
2. Show KPIs, feedback spotlight, and AI briefing
3. Go to `/appointments` and complete an `in_progress` reservation
4. Show the generated invoice on `/invoices` or `/workflow`
5. Mark the invoice paid
6. Show the matching finance transaction on `/finance`
7. Submit a negative review on `/feedback`
8. Show the flagged issue and suggested recovery action
9. Approve the follow-up and close on the dashboard

## Domain mapping

- `appointments` = reservations
- `customers` = guests
- `services` = billable restaurant services or menu groupings
- `invoice_items` = ordered charges
- `follow_up_actions` = thank-you, callback, recovery, return-visit outreach

## Deterministic boundaries

Backend owns:

- invoice generation
- totals and tax logic
- state transitions
- finance row creation

AI owns:

- review analysis
- recovery drafting
- prioritization
- manager summary wording

## Success condition

The judge should be able to see one clear chain of cause and effect:

`operational event -> system action -> AI interpretation -> manager decision`
