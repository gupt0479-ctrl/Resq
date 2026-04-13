-- Invoice reminder tracking (aligns API / AI reminder drafts with ledger invoices)

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS reminder_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ;
