#!/usr/bin/env node

/**
 * Setup Stripe Test Data
 * 
 * This script creates test customers and invoices in Stripe and links them
 * to your Resq database.
 * 
 * Usage:
 *   node scripts/setup-stripe-test-data.mjs
 * 
 * Requirements:
 *   - STRIPE_SECRET_KEY in .env.local
 *   - NEXT_PUBLIC_SUPABASE_URL in .env.local
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - npm install stripe @supabase/supabase-js
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DEMO_ORG_ID = process.env.DEMO_ORG_ID || '00000000-0000-0000-0000-000000000001'

// Validate environment
if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in .env.local')
  console.error('   Get your key from: https://dashboard.stripe.com/apikeys')
  process.exit(1)
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase credentials not found in .env.local')
  process.exit(1)
}

console.log('🔧 Setting up Stripe test data...\n')

// Dynamic imports (since these packages might not be installed yet)
let Stripe, createClient

try {
  const stripeModule = await import('stripe')
  Stripe = stripeModule.default
  const supabaseModule = await import('@supabase/supabase-js')
  createClient = supabaseModule.createClient
} catch (error) {
  console.error('❌ Missing dependencies. Please install:')
  console.error('   npm install stripe @supabase/supabase-js')
  process.exit(1)
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' })
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Test customers to create
const TEST_CUSTOMERS = [
  {
    email: 'acme@example.com',
    name: 'Acme Corp',
    invoiceAmount: 4250.00,
    daysOverdue: 45,
    description: 'Consulting Services - Q1 2026'
  },
  {
    email: 'buildright@example.com',
    name: 'BuildRight LLC',
    invoiceAmount: 1890.00,
    daysOverdue: 22,
    description: 'Project Management Services'
  },
  {
    email: 'metro@example.com',
    name: 'Metro Services Inc',
    invoiceAmount: 8500.00,
    daysOverdue: 67,
    description: 'Annual Maintenance Contract'
  }
]

async function setupTestData() {
  console.log('📊 Creating test data in Stripe and linking to database...\n')

  for (const testCustomer of TEST_CUSTOMERS) {
    try {
      console.log(`\n👤 Processing: ${testCustomer.name}`)
      
      // 1. Check if customer already exists in Stripe
      const existingCustomers = await stripe.customers.list({
        email: testCustomer.email,
        limit: 1
      })

      let stripeCustomer
      if (existingCustomers.data.length > 0) {
        stripeCustomer = existingCustomers.data[0]
        console.log(`   ✓ Found existing Stripe customer: ${stripeCustomer.id}`)
      } else {
        // Create new Stripe customer
        stripeCustomer = await stripe.customers.create({
          email: testCustomer.email,
          name: testCustomer.name,
          metadata: {
            source: 'resq_test_script',
            demo_org_id: DEMO_ORG_ID
          }
        })
        console.log(`   ✓ Created Stripe customer: ${stripeCustomer.id}`)
      }

      // 2. Create invoice item
      await stripe.invoiceItems.create({
        customer: stripeCustomer.id,
        amount: Math.round(testCustomer.invoiceAmount * 100), // Convert to cents
        currency: 'usd',
        description: testCustomer.description
      })
      console.log(`   ✓ Created invoice item: $${testCustomer.invoiceAmount}`)

      // 3. Create invoice
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() - testCustomer.daysOverdue)
      
      const invoice = await stripe.invoices.create({
        customer: stripeCustomer.id,
        collection_method: 'send_invoice',
        days_until_due: 30,
        auto_advance: false, // Don't auto-finalize
        metadata: {
          opspilot_test: 'true',
          days_overdue: testCustomer.daysOverdue.toString()
        }
      })

      // 4. Finalize invoice
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id)
      console.log(`   ✓ Created invoice: ${finalizedInvoice.id}`)

      // 5. Update database - find or create customer
      const { data: dbCustomers, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('organization_id', DEMO_ORG_ID)
        .eq('email', testCustomer.email)
        .limit(1)

      if (customerError) {
        console.error(`   ❌ Database error:`, customerError.message)
        continue
      }

      let customerId
      if (dbCustomers && dbCustomers.length > 0) {
        customerId = dbCustomers[0].id
        
        // Update existing customer with Stripe ID
        const { error: updateError } = await supabase
          .from('customers')
          .update({ 
            stripe_customer_id: stripeCustomer.id,
            full_name: testCustomer.name,
            email: testCustomer.email
          })
          .eq('id', customerId)

        if (updateError) {
          console.error(`   ❌ Failed to update customer:`, updateError.message)
          continue
        }
        console.log(`   ✓ Updated database customer: ${customerId}`)
      } else {
        // Create new customer in database
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            organization_id: DEMO_ORG_ID,
            full_name: testCustomer.name,
            email: testCustomer.email,
            stripe_customer_id: stripeCustomer.id,
            risk_status: testCustomer.daysOverdue > 60 ? 'high' : testCustomer.daysOverdue > 30 ? 'medium' : 'low'
          })
          .select('id')
          .single()

        if (createError) {
          console.error(`   ❌ Failed to create customer:`, createError.message)
          continue
        }
        customerId = newCustomer.id
        console.log(`   ✓ Created database customer: ${customerId}`)
      }

      // 6. Create or update invoice in database
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`
      const dueAtISO = dueDate.toISOString()

      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('stripe_invoice_id', finalizedInvoice.id)
        .single()

      if (existingInvoice) {
        console.log(`   ✓ Invoice already exists in database`)
      } else {
        const { error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            organization_id: DEMO_ORG_ID,
            customer_id: customerId,
            invoice_number: invoiceNumber,
            stripe_invoice_id: finalizedInvoice.id,
            status: 'overdue',
            recovery_status: 'none',
            total_amount: testCustomer.invoiceAmount,
            amount_paid: 0,
            due_at: dueAtISO,
            days_overdue: testCustomer.daysOverdue,
            reminder_count: 0
          })

        if (invoiceError) {
          console.error(`   ❌ Failed to create invoice:`, invoiceError.message)
          continue
        }
        console.log(`   ✓ Created database invoice: ${invoiceNumber}`)
      }

      console.log(`   ✅ ${testCustomer.name} setup complete!`)

    } catch (error) {
      console.error(`   ❌ Error processing ${testCustomer.name}:`, error.message)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Stripe test data setup complete!')
  console.log('='.repeat(60))
  console.log('\n📋 Next steps:')
  console.log('   1. Check Stripe Dashboard: https://dashboard.stripe.com/test/invoices')
  console.log('   2. Test the collections agent:')
  console.log('      curl -X POST http://localhost:3000/api/recovery/run \\')
  console.log('        -H "Content-Type: application/json" \\')
  console.log('        -d \'{"dryRun": true}\'')
  console.log('\n')
}

// Run the setup
setupTestData().catch((error) => {
  console.error('\n❌ Setup failed:', error.message)
  process.exit(1)
})
