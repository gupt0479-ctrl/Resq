#!/bin/bash

# Apply Recovery Agent Migration
# Adds Stripe columns and recovery agent tables to your database

echo ""
echo "🔧 Applying Recovery Agent Migration..."
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ .env.local not found"
  echo "   Copy .env.example to .env.local and add your credentials"
  exit 1
fi

# Load environment variables
export $(grep -v '^#' .env.local | xargs)

# Check if Supabase credentials exist
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Supabase credentials not found in .env.local"
  echo "   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

# Extract project ref from URL (e.g., https://abc123.supabase.co -> abc123)
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -E 's|https://([^.]+)\.supabase\.co|\1|')

echo "📊 Database: $PROJECT_REF"
echo ""

# Check if psql is available
if command -v psql &> /dev/null; then
  echo "✅ Using psql to apply migration..."
  echo ""
  
  # Construct connection string
  DB_URL="postgresql://postgres:$SUPABASE_SERVICE_ROLE_KEY@db.$PROJECT_REF.supabase.co:5432/postgres"
  
  # Apply migration
  psql "$DB_URL" -f supabase/migrations/005_recovery_agent.sql
  
  if [ $? -eq 0 ]; then
    echo ""
    echo "============================================================"
    echo "✅ Migration applied successfully!"
    echo "============================================================"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Create test data:"
    echo "      node scripts/setup-stripe-test-data.mjs"
    echo ""
    echo "   2. Start dev server:"
    echo "      npm run dev"
    echo ""
    echo "   3. Test collections agent:"
    echo "      curl -X POST http://localhost:3000/api/recovery/run \\"
    echo "        -H \"Content-Type: application/json\" \\"
    echo "        -d '{\"dryRun\": true}'"
    echo ""
  else
    echo ""
    echo "❌ Migration failed"
    exit 1
  fi
else
  echo "⚠️  psql not found. Using manual method..."
  echo ""
  echo "📋 Please apply the migration manually:"
  echo ""
  echo "1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
  echo ""
  echo "2. Copy the contents of: supabase/migrations/005_recovery_agent.sql"
  echo ""
  echo "3. Paste into the SQL Editor and click 'Run'"
  echo ""
  echo "4. Then run: node scripts/setup-stripe-test-data.mjs"
  echo ""
fi
