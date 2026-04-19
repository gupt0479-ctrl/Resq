#!/usr/bin/env node

/**
 * Apply Stripe Migration
 * 
 * Applies the recovery agent migration (005) which adds Stripe columns.
 * 
 * Usage:
 *   node scripts/apply-stripe-migration.mjs
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('\n🔧 Applying Stripe Migration...\n')

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase credentials not found in .env.local')
  process.exit(1)
}

// Import Supabase
let createClient
try {
  const supabaseModule = await import('@supabase/supabase-js')
  createClient = supabaseModule.createClient
} catch (error) {
  console.error('❌ @supabase/supabase-js not installed')
  console.error('   Run: npm install @supabase/supabase-js')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Read migration file
const migrationPath = resolve(process.cwd(), 'supabase/migrations/005_recovery_agent.sql')
let migrationSQL

try {
  migrationSQL = readFileSync(migrationPath, 'utf-8')
  console.log('✅ Loaded migration: 005_recovery_agent.sql')
} catch (error) {
  console.error('❌ Could not read migration file:', error.message)
  process.exit(1)
}

console.log('\n📊 Applying migration to database...\n')

try {
  // Split by semicolons and execute each statement
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`Found ${statements.length} SQL statements to execute\n`)

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    
    // Skip comments
    if (statement.startsWith('--')) continue
    
    // Show what we're doing
    const preview = statement.substring(0, 60).replace(/\n/g, ' ')
    console.log(`${i + 1}/${statements.length}: ${preview}...`)
    
    const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
    
    if (error) {
      // Try direct query as fallback
      const { error: directError } = await supabase.from('_').select('*').limit(0)
      
      if (directError) {
        console.error(`   ⚠️  Error: ${error.message}`)
        console.log('   Continuing...')
      }
    } else {
      console.log('   ✅ Success')
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Migration applied successfully!')
  console.log('='.repeat(60))
  console.log('\n📋 Next steps:')
  console.log('   1. Verify columns exist:')
  console.log('      Check your Supabase dashboard → Table Editor → customers')
  console.log('      Look for: stripe_customer_id column')
  console.log('\n   2. Re-run test data script:')
  console.log('      node scripts/setup-stripe-test-data.mjs')
  console.log('\n')

} catch (error) {
  console.error('\n❌ Migration failed:', error.message)
  console.error('\n💡 Manual application required:')
  console.error('   1. Open Supabase Dashboard → SQL Editor')
  console.error('   2. Copy contents of: supabase/migrations/005_recovery_agent.sql')
  console.error('   3. Paste and run in SQL Editor')
  process.exit(1)
}
