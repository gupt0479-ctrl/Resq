# Separation History — OpsPilot ↔ Resq

## Timeline

| Date | Event |
|------|-------|
| April 10–14, 2026 | OpsPilot built and demoed at O1 Summit hackathon |
| April 14, 2026 | Last pure OpsPilot commit (`6a62eb1` — "Landing page ui fix") |
| April 17, 2026 | Resq pivot begins (`a629668` — "OpsPilot Rescue — cashflow recovery agent and dashboard pivot") |

## Git Tags

Two tags anchor the boundary between OpsPilot and Resq:

| Tag | Commit | Purpose |
|-----|--------|---------|
| `opspilot-hackathon-2026-04-14` | `6a62eb1` | Exact state shown to judges at O1 Summit |
| `resq-pivot-start-2026-04-17` | `a629668` | First commit of the Resq fintech pivot |

## Preserved Artifacts at Hackathon Tag

The following files at `opspilot-hackathon-2026-04-14` represent the hackathon deliverable:

- **`supabase/seed.sql`** — Demo data seeded for the live presentation to judges (restaurants, invoices, appointments, inventory).
- **`DEMO.md`** — Demo script used during the hackathon presentation. Note: this file was later updated for Resq branding, but the original version is preserved at the tag.

## Purpose

These tags serve as a permanent, immutable anchor of what was shown at the O1 Summit hackathon before any repository splitting, branding changes, or codebase divergence. They allow:

1. Restoring the OpsPilot repo to its exact hackathon state.
2. Verifying that no Resq-era artifacts leak into the restored OpsPilot codebase.
3. Providing a defensible "this is what we built" reference point.
