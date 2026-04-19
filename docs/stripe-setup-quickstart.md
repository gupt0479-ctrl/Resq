# Stripe Setup Quickstart

Complete guide to setting up Stripe for OpsPilot Rescue collections agent.

---

## Part 1: Create Stripe Account (5 minutes)

### 1. Sign Up for Stripe

Go to: **https://dashboard.stripe.com/register**

- Enter your email
- Create a password
- Verify your email

### 2. Activate Your Account

You'll land on the Stripe Dashboard. For testing, you can skip business verification and use **Test Mode** immediately.

**Toggle to Test Mode** (top right corner) - this gives you test API keys that won't charge real money.

---

## Part 2: Get Your API Keys (2 minutes)

### 1. Navigate to API Keys

In the Stripe Dashboard:
- Click **Developers** (top right)
- Click **API keys** (left sidebar)

### 2. Copy Your Secret Key

You'll see two keys:
- **Publishable key** (starts with `pk_test_...`) - for frontend (not needed yet)
- **Secret key** (starts with `sk_test_...`) - for backend ⚠️ **KEEP THIS SECRET**

Click **Reveal test key** and copy the secret key.

---

## Part 3: Install Stripe in Your Project (1 minute)

### 1. Install the Stripe SDK

```bash
npm install stripe
```

### 2. Add Your API Key to Environment Variables

Open `.env.local` and add:

```env
# Stripe API Key (Test Mode)
STRIPE_SECRET_KEY=sk_test_51ABC...your_key_here
```

⚠️ **Never commit this file to git!** (It's already in `.gitignore`)

---

## Part 4: Enable Live Stripe Integration (5 minutes)

### 1. Update `src/lib/services/recovery-agent.ts`

Find the `sendStripeReminder` function (around line 263) and replace it with:

```typescript
import Stripe from "stripe"

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY?.trim() ?? ""
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" })
  : null

export async function sendStripeReminder(
  invoice: OverdueInvoice,
  _decision: ReturnType<typeof decideNextAction>,
  _draftedMessage: string
): Promise<string> {
  // Mock mode fallback
  if (!stripe || !invoice.stripe_invoice_id) {
    const mockId = `mock_stripe_reminder_${invoice.id.slice(0, 8)}_${Date.now()}`
    console.log(`[RecoveryAgent] Stripe mock: would send reminder for invoice ${invoice.invoice_number} (mock ID: ${mockId})`)
    return mockId
  }

  try {
    // Live Stripe: Send invoice reminder
    const result = await stripe.invoices.sendInvoice(invoice.stripe_invoice_id)
    
    console.log(`[RecoveryAgent] Stripe live: sent reminder for invoice ${invoice.invoice_number} (Stripe ID: ${result.id})`)
    return result.id
  } catch (error) {
    console.error(`[RecoveryAgent] Stripe error:`, error)
    // Fallback to mock on error
    const mockId = `error_fallback_${invoice.id.slice(0, 8)}_${Date.now()}`
    return mockId
  }
}
```

### 2. Update `src/lib/services/stripe-helper.ts`

Uncomment the Stripe import at the top:

```typescript
import Stripe from "stripe"

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY?.trim() ?? ""

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" })
  : null
```

Then uncomment the live implementation blocks in each function (marked with `/* ... */`).

---

## Part 5: Create Test Data in Stripe (10 minutes)

### Option A: Use Stripe Dashboard (Manual)

#### 1. Create a Test Customer

- Go to **Customers** in Stripe Dashboard
- Click **Add customer**
- Fill in:
  - Name: "Test Customer"
  - Email: "test@example.com"
- Click **Add customer**
- Copy the Customer ID (starts with `cus_...`)

#### 2. Create a Test Invoice

- Go to **Invoices** in Stripe Dashboard
- Click **Create invoice**
- Select your test customer
- Add an item:
  - Description: "Service Invoice"
  - Amount: $100.00
- Set due date (e.g., 30 days ago to make it overdue)
- Click **Finalize invoice**
- Copy the Invoice ID (starts with `in_...`)

#### 3. Link to Your Database

Update your database to link the Stripe IDs:

```sql
-- Update customer with Stripe ID
UPDATE customers 
SET stripe_customer_id = 'cus_...' 
WHERE email = 'test@example.com';

-- Update invoice with Stripe ID
UPDATE invoices 
SET stripe_invoice_id = 'in_...' 
WHERE invoice_number = 'INV-001';
```

### Option B: Use Stripe API (Automated)

Create a script `scripts/setup-stripe-test-data.mjs`:

```javascript
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function setupTestData() {
  // 1. Create Stripe customer
  const customer = await stripe.customers.create({
    email: 'test@example.com',
    name: 'Test Customer',
    metadata: { source: 'opspilot_test' }
  })
  console.log('Created customer:', customer.id)

  // 2. Create invoice item
  await stripe.invoiceItems.create({
    customer: customer.id,
    amount: 10000, // $100.00 in cents
    currency: 'usd',
    description: 'Test Service Invoice'
  })

  // 3. Create invoice
  const invoice = await stripe.invoices.create({
    customer: customer.id,
    collection_method: 'send_invoice',
    days_until_due: -30, // Make it overdue
    auto_advance: true
  })

  // 4. Finalize invoice
  const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id)
  console.log('Created invoice:', finalizedInvoice.id)

  // 5. Update database
  const { data: dbCustomer } = await supabase
    .from('customers')
    .select('id')
    .eq('email', 'test@example.com')
    .single()

  if (dbCustomer) {
    await supabase
      .from('customers')
      .update({ stripe_customer_id: customer.id })
      .eq('id', dbCustomer.id)

    const { data: dbInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('customer_id', dbCustomer.id)
      .limit(1)
      .single()

    if (dbInvoice) {
      await supabase
        .from('invoices')
        .update({ stripe_invoice_id: finalizedInvoice.id })
        .eq('id', dbInvoice.id)
    }
  }

  console.log('✅ Test data setup complete!')
}

setupTestData().catch(console.error)
```

Run it:

```bash
node scripts/setup-stripe-test-data.mjs
```

---

## Part 6: Test the Integration (5 minutes)

### 1. Start Your Dev Server

```bash
npm run dev
```

### 2. Test the Collections Agent

```bash
# Dry run (no actual changes)
curl -X POST http://localhost:3000/api/recovery/run \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true, "maxInvoices": 5}'
```

Expected response:
```json
{
  "processed": 1,
  "skipped": 0,
  "errors": 0,
  "actions": [
    {
      "invoiceNumber": "INV-001",
      "action": "send_reminder",
      "stripeReminderId": "in_...",
      "suggestedChannel": "stripe",
      "riskScore": 0.72
    }
  ]
}
```

### 3. Check Stripe Dashboard

Go to **Invoices** in Stripe Dashboard and verify the reminder was sent.

---

## Part 7: Set Up Webhooks (Optional, 10 minutes)

Webhooks let Stripe notify your app about events (payment failures, successes, etc.).

### 1. Create Webhook Endpoint

Create `src/app/api/webhooks/stripe/route.ts`:

```typescript
import { headers } from "next/headers"
import Stripe from "stripe"
import { createServerSupabaseClient } from "@/lib/db/supabase-server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  const body = await request.text()
  const signature = (await headers()).get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return Response.json({ error: "Invalid signature" }, { status: 400 })
  }

  const client = createServerSupabaseClient()

  switch (event.type) {
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      
      await client.from("stripe_events").insert({
        organization_id: process.env.DEMO_ORG_ID,
        stripe_customer_id: invoice.customer as string,
        event_type: "invoice.payment_failed",
        event_data: event.data.object,
        stripe_event_id: event.id,
        created_at: new Date(event.created * 1000).toISOString(),
      })
      
      console.log(`Payment failed for invoice ${invoice.id}`)
      break
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice
      
      await client
        .from("invoices")
        .update({
          status: "paid",
          amount_paid: invoice.amount_paid / 100,
          paid_at: new Date().toISOString(),
        })
        .eq("stripe_invoice_id", invoice.id)
      
      console.log(`Payment succeeded for invoice ${invoice.id}`)
      break
    }
  }

  return Response.json({ received: true })
}
```

### 2. Configure Webhook in Stripe Dashboard

#### For Local Testing (use Stripe CLI):

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret (starts with `whsec_...`) and add to `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### For Production:

1. Go to **Developers** → **Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. Enter your URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
   - `customer.created`
   - `customer.updated`
5. Copy the signing secret and add to your production environment variables

---

## Part 8: Go Live (When Ready)

### 1. Complete Stripe Account Verification

- Go to **Settings** → **Account details**
- Complete business verification
- Add bank account for payouts

### 2. Switch to Live Mode

- Toggle to **Live mode** in Stripe Dashboard
- Get your **live API keys** (starts with `sk_live_...`)
- Update production environment:

```env
STRIPE_SECRET_KEY=sk_live_...
```

### 3. Update Webhook Endpoint

- Create new webhook endpoint for production URL
- Update `STRIPE_WEBHOOK_SECRET` with live secret

---

## Troubleshooting

### "Stripe is not defined"

**Fix**: Make sure you installed the package:
```bash
npm install stripe
```

### "Invalid API key"

**Fix**: Check that your `.env.local` has the correct key:
```env
STRIPE_SECRET_KEY=sk_test_51...
```

Restart your dev server after adding the key.

### "No such invoice"

**Fix**: Make sure the invoice exists in Stripe and the ID is correct in your database.

### Webhook signature verification failed

**Fix**: 
1. Make sure `STRIPE_WEBHOOK_SECRET` is set correctly
2. Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

---

## Test Cards

Use these test card numbers in Stripe Test Mode:

| Card Number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Card declined |
| 4000 0000 0000 9995 | Insufficient funds |

Use any future expiry date and any 3-digit CVC.

---

## Next Steps

1. ✅ Create Stripe account
2. ✅ Get API keys
3. ✅ Install Stripe SDK
4. ✅ Add keys to `.env.local`
5. ✅ Update code to use live Stripe
6. ✅ Create test data
7. ✅ Test the integration
8. ⏭️ Set up webhooks (optional)
9. ⏭️ Go live (when ready)

---

## Resources

- **Stripe Dashboard**: https://dashboard.stripe.com
- **Stripe API Docs**: https://stripe.com/docs/api
- **Stripe Testing**: https://stripe.com/docs/testing
- **Stripe CLI**: https://stripe.com/docs/stripe-cli

---

## Support

For OpsPilot-specific questions:
- See `docs/stripe-integration-guide.md` for detailed integration info
- See `.claude/PRD.md` for product requirements
- See `src/lib/services/recovery-agent.ts` for collections logic
