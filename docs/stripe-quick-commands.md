# Stripe Quick Commands

Copy-paste commands for common Stripe operations.

---

## 🚀 Initial Setup

```bash
# 1. Install Stripe
npm install stripe

# 2. Add to .env.local (replace with your key)
echo "STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE" >> .env.local

# 3. Create test data
node scripts/setup-stripe-test-data.mjs

# 4. Start dev server
npm run dev
```

---

## 🧪 Testing Commands

### Test Collections Agent (Dry Run)
```bash
curl -X POST http://localhost:3000/api/recovery/run \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true, "maxInvoices": 5}'
```

### Test Collections Agent (Live)
```bash
curl -X POST http://localhost:3000/api/recovery/run \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false, "maxInvoices": 5}'
```

### Get Recovery Queue
```bash
curl http://localhost:3000/api/recovery/queue?orgId=00000000-0000-0000-0000-000000000001
```

### Get Audit Trail
```bash
curl http://localhost:3000/api/recovery/audit?orgId=00000000-0000-0000-0000-000000000001
```

---

## 🔧 Stripe CLI Commands

### Install Stripe CLI
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop install stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz
tar -xvf stripe_linux_x86_64.tar.gz
```

### Login to Stripe
```bash
stripe login
```

### Listen for Webhooks (Local Development)
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Trigger Test Events
```bash
# Test payment failure
stripe trigger invoice.payment_failed

# Test payment success
stripe trigger invoice.payment_succeeded

# Test customer creation
stripe trigger customer.created
```

### View Recent Events
```bash
stripe events list --limit 10
```

---

## 📊 Database Queries

### Check Stripe Integration Status
```sql
-- Count customers with Stripe IDs
SELECT COUNT(*) as customers_with_stripe
FROM customers 
WHERE stripe_customer_id IS NOT NULL;

-- Count invoices with Stripe IDs
SELECT COUNT(*) as invoices_with_stripe
FROM invoices 
WHERE stripe_invoice_id IS NOT NULL;

-- View overdue invoices with Stripe data
SELECT 
  invoice_number,
  stripe_invoice_id,
  total_amount,
  days_overdue,
  recovery_status
FROM invoices
WHERE status = 'overdue'
  AND stripe_invoice_id IS NOT NULL
ORDER BY days_overdue DESC;
```

### Link Existing Customer to Stripe
```sql
UPDATE customers 
SET stripe_customer_id = 'cus_ABC123'
WHERE email = 'customer@example.com';
```

### Link Existing Invoice to Stripe
```sql
UPDATE invoices 
SET stripe_invoice_id = 'in_ABC123'
WHERE invoice_number = 'INV-001';
```

---

## 🔍 Debugging Commands

### Check Environment Variables
```bash
# Check if Stripe key is set
node -e "console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'SET ✓' : 'NOT SET ✗')"

# Check all Stripe-related env vars
grep STRIPE .env.local
```

### Test Stripe Connection
```bash
# Create a test file
cat > test-stripe.mjs << 'EOF'
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const balance = await stripe.balance.retrieve()
console.log('✅ Stripe connected! Balance:', balance)
EOF

# Run it
node test-stripe.mjs

# Clean up
rm test-stripe.mjs
```

### View Stripe Logs
```bash
# In Stripe Dashboard
# Go to: Developers → Logs
# Or use CLI:
stripe logs tail
```

---

## 📦 Package Management

### Check Stripe Version
```bash
npm list stripe
```

### Update Stripe
```bash
npm update stripe
```

### Reinstall Stripe
```bash
npm uninstall stripe
npm install stripe
```

---

## 🧹 Cleanup Commands

### Delete Test Data from Stripe
```bash
# List all test customers
stripe customers list --limit 100

# Delete a specific customer (and all their data)
stripe customers delete cus_ABC123

# Delete all test invoices (careful!)
stripe invoices list --limit 100 | grep '"id":' | cut -d'"' -f4 | xargs -I {} stripe invoices delete {}
```

### Reset Database Test Data
```sql
-- Remove Stripe IDs from test data
UPDATE customers 
SET stripe_customer_id = NULL 
WHERE email LIKE '%@example.com';

UPDATE invoices 
SET stripe_invoice_id = NULL 
WHERE customer_id IN (
  SELECT id FROM customers WHERE email LIKE '%@example.com'
);
```

---

## 🔐 Security Commands

### Rotate API Keys
```bash
# 1. Generate new key in Stripe Dashboard
# 2. Update .env.local
# 3. Restart server
# 4. Delete old key from Stripe Dashboard
```

### Check for Exposed Keys
```bash
# Search for accidentally committed keys
git log -p | grep -i "sk_live"
git log -p | grep -i "sk_test"

# Check current files
grep -r "sk_live" . --exclude-dir=node_modules
grep -r "sk_test" . --exclude-dir=node_modules
```

---

## 📈 Monitoring Commands

### Check Recent Stripe Activity
```bash
# View recent API calls
stripe events list --limit 20

# View recent invoices
stripe invoices list --limit 10

# View recent customers
stripe customers list --limit 10
```

### Export Data
```bash
# Export invoices to JSON
stripe invoices list --limit 100 > invoices.json

# Export customers to JSON
stripe customers list --limit 100 > customers.json
```

---

## 🎯 Common Workflows

### Create Test Customer with Invoice
```bash
# 1. Create customer
CUSTOMER_ID=$(stripe customers create \
  --email="test@example.com" \
  --name="Test Customer" \
  --format=json | jq -r '.id')

# 2. Create invoice item
stripe invoice-items create \
  --customer=$CUSTOMER_ID \
  --amount=10000 \
  --currency=usd \
  --description="Test Invoice"

# 3. Create and finalize invoice
INVOICE_ID=$(stripe invoices create \
  --customer=$CUSTOMER_ID \
  --collection-method=send_invoice \
  --days-until-due=30 \
  --format=json | jq -r '.id')

stripe invoices finalize $INVOICE_ID

echo "Customer: $CUSTOMER_ID"
echo "Invoice: $INVOICE_ID"
```

### Send Manual Reminder
```bash
# Get invoice ID
INVOICE_ID="in_ABC123"

# Send reminder
stripe invoices send-invoice $INVOICE_ID
```

### Mark Invoice as Paid
```bash
stripe invoices pay in_ABC123
```

---

## 🔗 Useful URLs

```bash
# Open Stripe Dashboard
open https://dashboard.stripe.com

# Open API Keys
open https://dashboard.stripe.com/apikeys

# Open Webhooks
open https://dashboard.stripe.com/webhooks

# Open Logs
open https://dashboard.stripe.com/logs

# Open Test Cards
open https://stripe.com/docs/testing
```

---

## 💡 Pro Tips

### Use jq for JSON parsing
```bash
# Install jq
brew install jq  # macOS
apt install jq   # Linux

# Pretty print Stripe responses
stripe customers list | jq '.'

# Extract specific fields
stripe invoices list | jq '.data[] | {id, amount_due, status}'
```

### Create Aliases
Add to your `~/.bashrc` or `~/.zshrc`:
```bash
alias stripe-test="stripe listen --forward-to localhost:3000/api/webhooks/stripe"
alias stripe-logs="stripe logs tail"
alias recovery-test="curl -X POST http://localhost:3000/api/recovery/run -H 'Content-Type: application/json' -d '{\"dryRun\": true}'"
```

### Environment Switching
```bash
# Test mode
export STRIPE_SECRET_KEY=sk_test_...

# Live mode (be careful!)
export STRIPE_SECRET_KEY=sk_live_...
```

---

## 📚 Related Files

- `STRIPE_SETUP.md` - Setup checklist
- `docs/stripe-setup-quickstart.md` - Detailed guide
- `docs/stripe-integration-guide.md` - Technical reference
- `scripts/setup-stripe-test-data.mjs` - Test data script

---

**Need help?** Check the full documentation or Stripe's support at https://support.stripe.com
