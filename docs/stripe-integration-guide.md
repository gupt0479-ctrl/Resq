# Stripe Integration Guide for Resq

## Overview

Resq uses Stripe for automated collections and payment reminders. The system is designed to work in **two modes**:

1. **Mock Mode** (default) - Safe for demos and development, no real Stripe calls
2. **Live Mode** - Real Stripe API integration for production use

## Current Implementation Status

### ✅ Already Built

- **Collections Agent** (`src/lib/services/recovery-agent.ts`)
  - Detects overdue invoices
  - Calculates risk scores and credit tiers
  - Decides on recovery actions (reminders, payment plans, escalations)
  - Drafts outreach messages
  - Logs all actions for audit trail

- **Database Schema**
  - `invoices.stripe_invoice_id` - Links internal invoices to Stripe
  - `customers.stripe_customer_id` - Links customers to Stripe
  - `stripe_events` - Tracks Stripe webhook events (payment failures, etc.)
  - `client_reminders` - Logs all reminder communications
  - `invoice_recovery_actions` - Full audit trail

- **Mock Mode**
  - Returns deterministic mock IDs
  - Safe for hackathon demos
  - No external API calls

### 🔧 Needs Implementation (Live Mode)

The code has placeholder comments marked `// Stripe hook: Person 3 wires this up` that need real Stripe SDK calls.

---

## Setup Instructions

### 1. Install Stripe SDK

```bash
npm install stripe
```

### 2. Add Environment Variables

Add to your `.env.local`:

```env
# Stripe API Key (get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_...

# Optional: Stripe webhook signing secret (for webhook verification)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Implement Live Stripe Integration

#### A. Update `src/lib/services/recovery-agent.ts`

Replace the `sendStripeReminder` function with live Stripe calls:

```typescript
import Stripe from "stripe"

const stripe = STRIPE_SECRET_KEY 
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" })
  : null

export async function sendStripeReminder(
  invoice: OverdueInvoice,
  decision: ReturnType<typeof decideNextAction>,
  draftedMessage: string
): Promise<string> {
  // Mock mode fallback
  if (!stripe || !invoice.stripe_invoice_id) {
    const mockId = `mock_stripe_reminder_${invoice.id.slice(0, 8)}_${Date.now()}`
    console.log(`[RecoveryAgent] Stripe mock: would send reminder for invoice ${invoice.invoice_number} (mock ID: ${mockId})`)
    return mockId
  }

  try {
    // Live Stripe: Send invoice reminder
    const result = await stripe.invoices.sendInvoice(invoice.stripe_invoice_id, {
      // Optional: customize the email
    })
    
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

#### B. Create Stripe Webhook Handler (Optional but Recommended)

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

  // Handle different event types
  switch (event.type) {
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      
      // Log the failure
      await client.from("stripe_events").insert({
        organization_id: process.env.DEMO_ORG_ID, // TODO: map from Stripe metadata
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
      
      // Update invoice status in your database
      await client
        .from("invoices")
        .update({
          status: "paid",
          amount_paid: invoice.amount_paid / 100, // Convert from cents
          paid_at: new Date().toISOString(),
        })
        .eq("stripe_invoice_id", invoice.id)
      
      console.log(`Payment succeeded for invoice ${invoice.id}`)
      break
    }

    case "customer.created":
    case "customer.updated": {
      const customer = event.data.object as Stripe.Customer
      
      // Sync customer data
      await client
        .from("customers")
        .update({
          stripe_customer_id: customer.id,
          email: customer.email,
        })
        .eq("email", customer.email)
      
      break
    }
  }

  return Response.json({ received: true })
}
```

---

## How the Collections Agent Uses Stripe

### Workflow

1. **Detection**: Agent scans for overdue invoices
   ```typescript
   const invoices = await getOverdueInvoices(client, orgId)
   ```

2. **Risk Assessment**: Analyzes customer payment history
   ```typescript
   const profile = await getCustomerProfile(client, orgId, customerId)
   const stripePaymentFailed = await hasRecentStripeFailure(client, orgId, customerId)
   ```

3. **Decision**: Determines best action
   ```typescript
   const decision = decideNextAction(recoveryContext)
   // Returns: send_reminder, offer_payment_plan, escalate, etc.
   ```

4. **Action**: Sends Stripe reminder (if applicable)
   ```typescript
   if (decision.action === "send_reminder") {
     const stripeReminderId = await sendStripeReminder(invoice, decision, draftedMessage)
   }
   ```

5. **Audit**: Logs everything
   ```typescript
   await logReminder(client, orgId, invoice, decision, draftedMessage, stripeReminderId, "sent")
   await writeActionAuditLog(client, orgId, invoice, decision, outreachDraft, stripeReminderId, dryRun)
   ```

### Key Functions

| Function | Purpose | Stripe Integration |
|----------|---------|-------------------|
| `sendStripeReminder()` | Send payment reminder via Stripe | ✅ Calls `stripe.invoices.sendInvoice()` |
| `hasRecentStripeFailure()` | Check for recent payment failures | ✅ Queries `stripe_events` table |
| `logReminder()` | Record reminder in database | Stores `stripe_reminder_id` |
| `draftOutreachMessage()` | Generate reminder text | Used in Stripe email customization |

---

## Testing

### Mock Mode (Default)

```bash
# No Stripe key needed
curl -X POST http://localhost:3000/api/recovery/run \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

Returns mock IDs like `mock_stripe_reminder_abc123_1234567890`

### Live Mode

```bash
# Set STRIPE_SECRET_KEY in .env.local
STRIPE_SECRET_KEY=sk_test_...

# Run the agent
curl -X POST http://localhost:3000/api/recovery/run \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'
```

Real Stripe API calls will be made.

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Resq Database                                           │
├─────────────────────────────────────────────────────────────┤
│ invoices                                                    │
│   - stripe_invoice_id (links to Stripe)                    │
│   - recovery_status (none, contacted, escalated, etc.)     │
│   - days_overdue                                            │
│                                                             │
│ customers                                                   │
│   - stripe_customer_id (links to Stripe)                   │
│   - risk_status                                             │
│                                                             │
│ stripe_events                                               │
│   - event_type (invoice.payment_failed, etc.)              │
│   - stripe_customer_id                                      │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│ Recovery Agent (src/lib/services/recovery-agent.ts)        │
├─────────────────────────────────────────────────────────────┤
│ 1. getOverdueInvoices()                                     │
│ 2. hasRecentStripeFailure() ← checks stripe_events         │
│ 3. decideNextAction() ← risk scoring                        │
│ 4. sendStripeReminder() → Stripe API                        │
│ 5. logReminder() → client_reminders                         │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│ Stripe API                                                  │
├─────────────────────────────────────────────────────────────┤
│ stripe.invoices.sendInvoice(invoice_id)                     │
│   → Sends email to customer                                 │
│   → Returns reminder ID                                     │
│                                                             │
│ Webhooks (optional):                                        │
│   invoice.payment_failed → stripe_events table             │
│   invoice.payment_succeeded → update invoice status        │
└─────────────────────────────────────────────────────────────┘
```

---

## Collections Agent Features

### 1. Formal Demand Letters

When `days_overdue > 45` and `risk_score > 0.7`:

```typescript
recommendedAction: "formal_demand_letter"
actionDetails: {
  method: "certified_mail",
  tone: "firm_but_professional",
  deadline: "2026-05-03",
  template: "final_notice_before_collections"
}
```

### 2. Payment Plans

When customer has good history but temporary cash flow issue:

```typescript
recommendedAction: "offer_payment_plan"
alternativeActions: [
  {
    action: "payment_plan",
    description: "Offer 3-month payment plan with 5% late fee",
    conditions: "Customer must respond within 7 days"
  }
]
```

### 3. Risk Scoring

Factors considered:
- Payment history (on-time percentage)
- Days overdue
- Previous reminder count
- Stripe payment failures
- Customer lifetime value
- Relationship duration

### 4. External Context (via TinyFish)

The agent can check:
- Customer payment portals
- Email correspondence history
- Credit bureau data
- Industry payment trends

---

## API Endpoints

### Run Collections Agent

```bash
POST /api/recovery/run
```

**Request:**
```json
{
  "maxInvoices": 20,
  "dryRun": true
}
```

**Response:**
```json
{
  "processed": 3,
  "skipped": 0,
  "errors": 0,
  "financingEscalations": 1,
  "escalated": 1,
  "dryRun": true,
  "actions": [
    {
      "invoiceId": "...",
      "invoiceNumber": "INV-001",
      "action": "send_reminder",
      "riskScore": 0.72,
      "creditScore": 650,
      "creditTier": "fair",
      "urgency": "high",
      "stripeReminderId": "in_abc123",
      "suggestedChannel": "stripe"
    }
  ]
}
```

### Get Recovery Queue

```bash
GET /api/recovery/queue?orgId=...
```

Returns prioritized list of overdue invoices with risk scores.

### Get Audit Trail

```bash
GET /api/recovery/audit?orgId=...
```

Returns full history of all recovery actions taken.

---

## Best Practices

### 1. Always Use Dry Run First

```typescript
const result = await runRecoveryAgent(client, orgId, { dryRun: true })
// Review results before running live
```

### 2. Monitor Stripe Events

Set up webhook handler to track:
- Payment failures
- Payment successes
- Customer updates

### 3. Respect Rate Limits

The agent processes invoices sequentially to avoid overwhelming Stripe API:

```typescript
for (const invoice of batch) {
  await runRecoveryActionOnInvoice(invoice, orgId, client, dryRun)
}
```

### 4. Handle Errors Gracefully

The system falls back to mock mode if Stripe is unavailable:

```typescript
if (!STRIPE_SECRET_KEY || !invoice.stripe_invoice_id) {
  return mockId // Safe fallback
}
```

---

## Troubleshooting

### "Mock mode active" in logs

**Cause**: `STRIPE_SECRET_KEY` not set or invoice missing `stripe_invoice_id`

**Fix**: 
1. Add `STRIPE_SECRET_KEY` to `.env.local`
2. Ensure invoices have `stripe_invoice_id` populated

### Webhook signature verification failed

**Cause**: `STRIPE_WEBHOOK_SECRET` mismatch

**Fix**: Get the correct secret from Stripe Dashboard → Webhooks → Signing secret

### No Stripe customer ID

**Cause**: Customer not synced with Stripe

**Fix**: Create Stripe customer and store ID:
```typescript
const customer = await stripe.customers.create({
  email: "customer@example.com",
  name: "Customer Name",
  metadata: { resq_customer_id: "..." }
})

await client
  .from("customers")
  .update({ stripe_customer_id: customer.id })
  .eq("id", customerId)
```

---

## Next Steps

1. **Install Stripe SDK**: `npm install stripe`
2. **Add API Key**: Set `STRIPE_SECRET_KEY` in `.env.local`
3. **Implement Live Mode**: Update `sendStripeReminder()` function
4. **Set Up Webhooks**: Create webhook handler and configure in Stripe Dashboard
5. **Test**: Run with `dryRun: true` first, then go live

---

## Related Files

- `src/lib/services/recovery-agent.ts` - Main collections logic
- `src/lib/domain/recovery-state-machine.ts` - Risk scoring and decision engine
- `supabase/migrations/` - Database schema for invoices, customers, stripe_events
- `docs/rescue-demo-runbook.md` - Demo instructions

---

## Support

For Stripe API documentation: https://stripe.com/docs/api

For Resq-specific questions, see:
- `.claude/PRD.md` - Product requirements
- `.claude/context/current-state.md` - Current implementation status
