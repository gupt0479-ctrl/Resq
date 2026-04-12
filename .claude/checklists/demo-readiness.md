# Demo Readiness Checklist

Run this before demoing or calling a milestone complete.

## Required Reality Checks

- Supabase project is connected
- migrations are applied
- seed data is loaded
- dashboard reads live Supabase-backed data
- reservations page shows real workflow states
- invoices page shows real invoice states
- finance page shows real ledger and receivables
- integrations page shows connector states

## Required Story Checks

- a judge can understand the core workflow in under three minutes
- it is obvious what the system did automatically
- it is obvious what still needs manager attention
- it is clear which parts are deterministic and which parts are AI-assisted

## Required Integrity Checks

- invoice generation is deterministic
- paid invoice creates exactly one revenue transaction
- webhook dedupe exists
- service role key is not exposed to client code
