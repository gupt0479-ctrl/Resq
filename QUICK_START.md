# 🚀 Quick Start - Test Stripe Integration

Follow these 3 simple steps to test your Stripe collections agent.

---

## Step 1: Apply Database Migration (2 minutes)

### Option A: Copy-Paste (Easiest)

1. **Open the SQL file**: `APPLY_THIS_SQL.sql` (in this folder)
2. **Copy everything** (Cmd+A, Cmd+C)
3. **Go to Supabase**: The SQL Editor should already be open, or go to:
   https://supabase.com/dashboard/project/wqsizjmmewdqcnlsuelj/sql/new
4. **Paste** (Cmd+V)
5. **Click "Run"** (or press Cmd+Enter)

You should see: ✅ Success. No rows returned

### Option B: Use the Script

```bash
bash scripts/apply-recovery-migration.sh
```

---

## Step 2: Create Test Data (1 minute)

```bash
node scripts/setup-stripe-test-data.mjs
```

This creates:
- 3 test customers in Stripe
- 3 overdue invoices ($4,250, $1,890, $8,500)
- Links them to your database

Expected output:
```
✅ Stripe test data setup complete!
```

---

## Step 3: Test the Collections Agent (1 minute)

### Start the dev server:
```bash
npm run dev
```

### In a new terminal, test the agent:
```bash
curl -X POST http://localhost:3000/api/recovery/run \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

### Expected Response:
```json
{
  "processed": 3,
  "skipped": 0,
  "errors": 0,
  "financingEscalations": 1,
  "escalated": 1,
  "actions": [
    {
      "invoiceNumber": "INV-...",
      "action": "send_reminder",
      "riskScore": 0.72,
      "creditScore": 650,
      "urgency": "high",
      "stripeReminderId": "in_...",
      "suggestedChannel": "stripe"
    }
  ]
}
```

---

## ✅ Success Checklist

- [ ] Database migration applied (Step 1)
- [ ] Test data created in Stripe (Step 2)
- [ ] Dev server running (Step 3)
- [ ] Collections agent returns results (Step 3)

---

## 🎯 What Just Happened?

Your collections agent:

1. **Detected** 3 overdue invoices
2. **Analyzed** customer payment history and risk
3. **Decided** the best action for each:
   - High risk (67 days overdue) → Escalate to collections
   - Medium risk (45 days overdue) → Send formal demand letter
   - Low risk (22 days overdue) → Send friendly reminder
4. **Prepared** Stripe reminders (in dry run mode, no emails sent)
5. **Logged** everything in the audit trail

---

## 🔍 View the Results

### In Stripe Dashboard:
https://dashboard.stripe.com/test/invoices

You should see 3 test invoices.

### In Your App:
```bash
# View recovery queue
curl http://localhost:3000/api/recovery/queue?orgId=00000000-0000-0000-0000-000000000001

# View audit trail
curl http://localhost:3000/api/recovery/audit?orgId=00000000-0000-0000-0000-000000000001
```

---

## 🚀 Next Steps

### Test Live Mode (Actually Send Reminders)

```bash
curl -X POST http://localhost:3000/api/recovery/run \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false, "maxInvoices": 1}'
```

⚠️ This will actually send a Stripe invoice reminder!

### Customize the Agent

Edit these files:
- `src/lib/domain/recovery-state-machine.ts` - Risk scoring logic
- `src/lib/services/recovery-agent.ts` - Action execution
- `src/lib/services/stripe-helper.ts` - Stripe integration

---

## 🆘 Troubleshooting

### "Could not find stripe_customer_id column"
→ Go back to Step 1 and apply the migration

### "Mock mode active"
→ Check that `STRIPE_SECRET_KEY` is set in `.env.local`

### "No invoices found"
→ Run Step 2 again: `node scripts/setup-stripe-test-data.mjs`

### Server won't start
→ Check for errors: `npm run lint && npx tsc --noEmit`

---

## 📚 Full Documentation

- `STRIPE_SETUP.md` - Complete setup checklist
- `docs/stripe-integration-guide.md` - Technical reference
- `docs/stripe-quick-commands.md` - Command reference

---

**Total Time: ~5 minutes**

Questions? Check the docs or see the full guides in the `docs/` folder.
