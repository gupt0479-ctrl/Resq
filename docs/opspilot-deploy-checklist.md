# OpsPilot Deployment Checklist

Production deployment checklist for the OpsPilot restaurant/SMB operations tool.

## Environment Variables

### Supabase

- [ ] `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (public, used client-side)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key (public, used client-side)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only)

### AI

- [ ] `GOOGLE_GENERATIVE_AI_API_KEY` — Google Generative AI API key

### App

- [ ] `DEMO_ORG_ID` — Demo organization UUID (default: `00000000-0000-0000-0000-000000000001`)

## Service Configuration

### Vercel

- [ ] Create Vercel project linked to `gupt0479-ctrl/opspilot`
- [ ] Set all environment variables above in Vercel project settings
- [ ] Confirm production branch is `main`
- [ ] Verify build succeeds with `npm run build`

### Supabase

- [ ] Create dedicated Supabase project for OpsPilot (separate from Resq)
- [ ] Set Auth → Site URL to the OpsPilot production domain
- [ ] Set Auth → Redirect URLs as needed
- [ ] Apply seed data if using demo mode

## Services NOT Required

OpsPilot does not use the following — no configuration needed:

- Stripe (no payments/billing)
- TinyFish (no web automation)
- Resend (no transactional email)
- AWS S3 (no artifact storage)
- Anthropic (uses Google Generative AI instead)

## Post-Deploy Verification

- [ ] `npm run build` succeeds in Vercel
- [ ] Landing page loads with OpsPilot branding (not Resq)
- [ ] Dashboard renders with demo data
- [ ] No Resq-era artifacts visible (no cash forecast, no rescue queue)
