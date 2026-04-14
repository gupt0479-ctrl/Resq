-- Add occasion and follow-up tracking to appointments table
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS occasion       TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_sent BOOLEAN NOT NULL DEFAULT FALSE;
