# 🚀 Stripe Setup Checklist

Quick reference for setting up Stripe with Resq.

---

## ✅ Setup Checklist

### Step 1: Create Stripe Account (5 min)
- [ ] Go to https://dashboard.stripe.com/register
- [ ] Sign up with email
- [ ] Verify email
- [ ] Toggle to **Test Mode** (top right)

### Step 2: Get API Keys (2 min)
- [ ] Click **Developers** → **API keys**
- [ ] Copy **Secret key** (starts with `sk_test_...`)
- [ ] Keep it secret! Never commit to git

### Step 3: Install Stripe (1 min)
```bash
npm install stripe
```

### Step 4: Configure Environment (2 min)
Add to `.env.local`:
```env
STRIPE_SECRET_KEY=sk_test_51ABC...your_key_here
```

### Step 5: Enable Live Integration (5 min)
- [ ] Update `src/lib/services/recovery-agent.ts`
  - Uncomment Stripe import
  - Replace `sendStripeReminder` function
- [ ] Update `src/lib/services/stripe-helper.ts`
  - Uncomment Stripe import and initialization
  - Uncomment live implementation blocks

### Step 6: Create Test Data (2 min)
```bash
node scripts/setup-stripe-test-data.mjs
```

This creates 3 test customers with overdue invoices.

### Step 7: Test It! (2 min)
```bash
# Start dev server
npm run dev

# Test collections agent
curl -X POST http://localhost:3000/api/recovery/run \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

### Step 8: Verify (1 min)
- [ ] Check Stripe Dashboard → Invoices
- [ ] Verify reminders were sent
- [ ] Check console logs for success messages

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| `docs/stripe-setup-quickstart.md` | Detailed step-by-step guide |
| `docs/stripe-integration-guide.md` | Complete technical reference |
| `scripts/setup-stripe-test-data.mjs` | Automated test data creation |
| `src/lib/services/stripe-helper.ts` | Stripe utility functions |
| `src/lib/services/recovery-agent.ts` | Collections agent logic |

---

## 🧪 Test Cards

Use these in Stripe Test Mode:

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | ✅ Success |
| `4000 0000 0000 0002` | ❌ Declined |
| `4000 0000 0000 9995` | ❌ Insufficient funds |

Any future expiry + any 3-digit CVC works.

---

## 🔗 Quick Links

- **Stripe Dashboard**: https://dashboard.stripe.com
- **API Keys**: https://dashboard.stripe.com/apikeys
- **Test Cards**: https://stripe.com/docs/testing
- **API Docs**: https://stripe.com/docs/api

---

## 🆘 Troubleshooting

### "Stripe is not defined"
```bash
npm install stripe
```

### "Invalid API key"
Check `.env.local` has correct key and restart dev server.

### "No such invoice"
Run the test data script:
```bash
node scripts/setup-stripe-test-data.mjs
```

### Mock mode still active
1. Verify `STRIPE_SECRET_KEY` is set in `.env.local`
2. Verify invoices have `stripe_invoice_id` in database
3. Check console logs for error messages

---

## 🎯 What You Get

Once set up, your collections agent will:

✅ **Detect** overdue invoices automatically  
✅ **Analyze** customer payment history and risk  
✅ **Decide** best action (reminder, payment plan, escalation)  
✅ **Send** Stripe payment reminders automatically  
✅ **Track** all actions in audit trail  
✅ **Escalate** high-risk accounts to collections  

---

## 🚀 Next Steps

After basic setup:

1. **Set up webhooks** (optional) - Get notified of payment events
2. **Customize messages** - Edit reminder templates
3. **Adjust risk scoring** - Tune the decision engine
4. **Go live** - Switch to production keys when ready

See `docs/stripe-setup-quickstart.md` for details.

---

## 💡 Pro Tips

- Start with **Test Mode** - no real charges
- Use **dry run** first - `{"dryRun": true}`
- Check **Stripe Dashboard** - verify everything
- Monitor **console logs** - catch errors early
- Keep keys **secret** - never commit `.env.local`

---

**Total Setup Time: ~20 minutes**

Questions? See the full guides in `docs/` folder.
