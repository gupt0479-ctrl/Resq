#!/usr/bin/env node

/**
 * Test Stripe Connection
 * 
 * Quick test to verify your Stripe API key works.
 * 
 * Usage:
 *   node scripts/test-stripe-connection.mjs
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY

console.log('\n🔧 Testing Stripe Connection...\n')

// Check if key exists
if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in .env.local')
  console.error('\nAdd your key:')
  console.error('  echo "STRIPE_SECRET_KEY=sk_test_..." >> .env.local')
  console.error('\nGet your key from: https://dashboard.stripe.com/apikeys')
  process.exit(1)
}

// Check key format
if (!STRIPE_SECRET_KEY.startsWith('sk_')) {
  console.error('❌ Invalid Stripe key format')
  console.error('   Key should start with "sk_test_" or "sk_live_"')
  process.exit(1)
}

const isTestMode = STRIPE_SECRET_KEY.startsWith('sk_test_')
console.log(`🔑 API Key: ${STRIPE_SECRET_KEY.substring(0, 15)}...`)
console.log(`🧪 Mode: ${isTestMode ? 'TEST' : 'LIVE'}`)

// Import Stripe
let Stripe
try {
  const stripeModule = await import('stripe')
  Stripe = stripeModule.default
} catch {
  console.error('\n❌ Stripe package not installed')
  console.error('   Run: npm install stripe')
  process.exit(1)
}

// Initialize Stripe
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2026-03-25.dahlia',
})

console.log('\n📡 Testing API connection...\n')

try {
  // Test 1: Retrieve account balance
  console.log('Test 1: Retrieving account balance...')
  const balance = await stripe.balance.retrieve()
  console.log('✅ Balance retrieved successfully')
  console.log(`   Available: $${(balance.available[0]?.amount || 0) / 100}`)
  console.log(`   Pending: $${(balance.pending[0]?.amount || 0) / 100}`)

  // Test 2: List customers (just to verify read access)
  console.log('\nTest 2: Listing customers...')
  const customers = await stripe.customers.list({ limit: 3 })
  console.log(`✅ Found ${customers.data.length} customer(s)`)
  if (customers.data.length > 0) {
    customers.data.forEach((customer, i) => {
      console.log(`   ${i + 1}. ${customer.name || customer.email || customer.id}`)
    })
  }

  // Test 3: List invoices
  console.log('\nTest 3: Listing invoices...')
  const invoices = await stripe.invoices.list({ limit: 3 })
  console.log(`✅ Found ${invoices.data.length} invoice(s)`)
  if (invoices.data.length > 0) {
    invoices.data.forEach((invoice, i) => {
      const amount = (invoice.amount_due / 100).toFixed(2)
      console.log(`   ${i + 1}. ${invoice.id} - $${amount} (${invoice.status})`)
    })
  }

  // Success summary
  console.log('\n' + '='.repeat(60))
  console.log('✅ Stripe connection successful!')
  console.log('='.repeat(60))
  console.log('\n📋 Next steps:')
  console.log('   1. Create test data:')
  console.log('      node scripts/setup-stripe-test-data.mjs')
  console.log('\n   2. Start dev server:')
  console.log('      npm run dev')
  console.log('\n   3. Test collections agent:')
  console.log('      curl -X POST http://localhost:3000/api/recovery/run \\')
  console.log('        -H "Content-Type: application/json" \\')
  console.log('        -d \'{"dryRun": true}\'')
  console.log('\n')

} catch (error) {
  console.error('\n❌ Stripe API Error:', error.message)
  
  if (error.type === 'StripeAuthenticationError') {
    console.error('\n💡 Your API key is invalid or expired.')
    console.error('   Get a new key from: https://dashboard.stripe.com/apikeys')
  } else if (error.type === 'StripePermissionError') {
    console.error('\n💡 Your API key doesn\'t have the required permissions.')
  } else {
    console.error('\n💡 Check your internet connection and try again.')
  }
  
  process.exit(1)
}
