# Demo Readiness Checklist

## Environment

- Supabase project is connected
- Required migrations are applied
- Demo seed data is loaded
- `.env.local` contains valid credentials

## Product

- Dashboard loads real data
- Appointment completion creates an invoice
- Mark-paid creates exactly one finance row
- Feedback submission creates a flagged issue when appropriate
- Follow-up approval resolves the item correctly

## Quality

- `npm run lint` passes
- `npx tsc --noEmit` passes
- `npm run test` passes
- `npm run build` passes

## Story

- A judge can understand the workflow in under 3 minutes
- It is obvious what the system automated
- It is obvious what still requires manager action
