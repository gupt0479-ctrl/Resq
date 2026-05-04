# Resq Deployment Checklist

Production deployment checklist for the Resq fintech CFO survival workspace.

## Environment Variables

### Supabase

- [ ] `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (public, used client-side)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key (public, used client-side)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only, bypasses RLS)

### Database

- [ ] `DATABASE_URL` — Postgres connection string for Drizzle ORM

### Stripe

- [ ] `STRIPE_SECRET_KEY` — Stripe API secret key
- [ ] `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret (from webhook endpoint config)

### AI

- [ ] `ANTHROPIC_API_KEY` — Anthropic Claude API key for AI-assisted recovery actions

### TinyFish

- [ ] `TINYFISH_API_KEY` — TinyFish API key for web automation
- [ ] `TINYFISH_ENABLED` — Set to `true` to enable live TinyFish calls
- [ ] `TINYFISH_USE_MOCKS` — Set to `false` for production (defaults to `true`)

### Email

- [ ] `RESEND_API_KEY` — Resend API key for transactional email (collections reminders)

### AWS (optional)

- [ ] `AWS_REGION` — AWS region for S3 artifact storage
- [ ] `AWS_S3_BUCKET` — S3 bucket name
- [ ] `AWS_ACCESS_KEY_ID` — IAM access key
- [ ] `AWS_SECRET_ACCESS_KEY` — IAM secret key

### App

- [ ] `DEMO_MODE` — Set to `false` for production (defaults to `true`)

## Service Configuration

### Vercel

- [ ] Rename the existing Vercel project to `resq` or the cleanest available `resq-*` slug
- [ ] Confirm the project is linked to `gupt0479-ctrl/Resq`
- [ ] Set the production domain to the clean Resq Vercel domain and remove the old demo domain after verification
- [ ] Set all environment variables above in Vercel project settings
- [ ] Confirm production branch is `main`
- [ ] Verify build succeeds with `npm run build`

### Supabase

- [ ] Create dedicated Supabase project for Resq
- [ ] Set Auth → Site URL to the Resq production domain
- [ ] Set Auth → Redirect URLs to include `/auth/callback`
- [ ] Configure Google OAuth provider (client ID + secret from Google Cloud Console)
- [ ] Apply migration `008_org_memberships.sql` (org membership table + auto-provisioning trigger)
- [ ] Apply migration `009_rls_policies.sql` (RLS policies on all org-scoped tables)

### Stripe

- [ ] Create webhook endpoint pointing to `https://<resq-domain>/api/integrations/webhooks/stripe`
- [ ] Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### Resend

- [ ] Configure sender domain for `collections@resq.app`
- [ ] Verify DNS records (SPF, DKIM, DMARC) for the sender domain

### TinyFish

- [ ] Obtain TinyFish API key and set `TINYFISH_API_KEY`
- [ ] Set `TINYFISH_ENABLED=true` and `TINYFISH_USE_MOCKS=false` for live mode

## Post-Deploy Verification

- [ ] `npm run build` succeeds in Vercel
- [ ] Landing page loads at production URL
- [ ] Google OAuth login completes and redirects to `/dashboard`
- [ ] Unauthenticated `/dashboard` access redirects to `/login`
- [ ] Unauthenticated `curl /api/invoices` returns 401
- [ ] New signup auto-creates org + membership
- [ ] Stripe webhook events are received and processed
