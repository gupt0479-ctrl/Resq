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
- [ ] `/api/tinyfish/demo-run` returns a valid financing-first scenario response
- [ ] Mock mode fallback is available
- [ ] Financing output includes source links, warnings, and mode truth

## Demo path

- [ ] Dashboard clearly shows cash pressure
- [ ] Rescue queue feels like the main working surface
- [ ] Financing result is understandable in under 15 seconds
- [ ] Vendor or insurance proof supports the story without distracting from it
- [ ] Workflow / audit trail clearly shows the survival scan

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
- [ ] 90-second script rehearsed
- [ ] 5-minute script rehearsed
