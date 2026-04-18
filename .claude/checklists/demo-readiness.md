# Demo Readiness Checklist

Use this on the final rehearsal path.

## Product clarity

- [ ] Landing page clearly says autonomous SMB survival agent
- [ ] Fintech value is obvious in under 30 seconds
- [ ] Agentic behavior is visible, not implied

## Data and state

- [ ] Supabase project is connected
- [ ] Base seed is loaded
- [ ] `supabase/seed_survival_demo.sql` is loaded
- [ ] Demo org data matches the current story

## TinyFish

- [ ] `/api/tinyfish/health` returns healthy output
- [ ] `/api/tinyfish/demo-run` returns a valid scenario response
- [ ] Mock mode fallback is available

## Demo path

- [ ] Rescue / dashboard view shows cash pressure
- [ ] Financing result is understandable
- [ ] Vendor or insurance result is understandable
- [ ] Workflow / audit trail shows agent activity

## Verification

- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `bash scripts/demo-smoke.sh`

## Logistics

- [ ] Backup recording prepared
- [ ] Live demo browser tabs prepared
- [ ] HDMI / stage fallback plan ready
