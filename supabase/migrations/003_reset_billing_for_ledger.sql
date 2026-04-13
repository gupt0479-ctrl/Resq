-- OpsPilot · Ember Table — reset billing tables for ledger reconciliation
-- Use when `invoices` is a legacy/hybrid shape (e.g. columns like `total`, `line_items`)
-- so `CREATE TABLE IF NOT EXISTS invoices` in 0001 never ran.
--
-- WARNING: Deletes all rows in these tables. For dev / hackathon / empty projects.
-- After running this file in the Supabase SQL Editor, run IN ORDER:
--   1) supabase/migrations/0001_core_ledger.sql  (full file — idempotent for other tables)
--   2) supabase/migrations/002_invoice_reminders.sql
--   3) supabase/seed.sql
--
-- Then verify: npm run db:check

BEGIN;

DROP TABLE IF EXISTS finance_transactions CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;

COMMIT;
