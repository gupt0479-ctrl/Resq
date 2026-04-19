-- OpsPilot · KYC (Know Your Client) system
-- Migration: 006_kyc_system
-- Adds identity verification, risk scoring, audit trail, and operator alerts

-- ─── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE kyc_status AS ENUM (
    'not_started',
    'pending',
    'in_progress',
    'completed_verified',
    'completed_review',
    'completed_flagged',
    'completed_failed'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE kyc_band AS ENUM ('verified', 'review', 'flagged', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE kyc_check_type AS ENUM (
    'business_name',
    'office_address',
    'people_verification',
    'watchlist_screening',
    'bank_account',
    'owner_kyc',
    'adverse_media',
    'website_presence'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE kyc_check_status AS ENUM (
    'pending', 'running', 'passed', 'failed', 'flagged', 'skipped'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── KYC columns on customers ─────────────────────────────────────────────────

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS kyc_status    kyc_status NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS kyc_score     INTEGER,
  ADD COLUMN IF NOT EXISTS kyc_band      kyc_band,
  ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_customers_kyc_status
  ON customers(organization_id, kyc_status);

-- ─── KYC Verification Requests ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kyc_verification_requests (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id           UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_id            UUID        REFERENCES invoices(id),
  token                 TEXT        NOT NULL UNIQUE,
  status                kyc_status  NOT NULL DEFAULT 'not_started',
  current_step          kyc_check_type,
  risk_score            INTEGER,
  risk_band             kyc_band,
  score_breakdown       JSONB,
  watchlist_flagged     BOOLEAN     NOT NULL DEFAULT FALSE,
  liveness_flagged      BOOLEAN     NOT NULL DEFAULT FALSE,
  adverse_media_flagged BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Client-submitted identity data
  business_name         TEXT,
  registered_state      TEXT,
  business_address      TEXT,
  website_url           TEXT,
  director_name         TEXT,
  director_dob          DATE,
  bank_account_last4    TEXT,
  bank_routing_number   TEXT,
  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ,
  link_opened_at        TIMESTAMPTZ,
  link_expires_at       TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_kyc_requests_org      ON kyc_verification_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_customer ON kyc_verification_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_token    ON kyc_verification_requests(token);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_status   ON kyc_verification_requests(organization_id, status);

-- ─── KYC Individual Checks ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kyc_checks (
  id                    UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id            UUID             NOT NULL REFERENCES kyc_verification_requests(id) ON DELETE CASCADE,
  check_type            kyc_check_type   NOT NULL,
  status                kyc_check_status NOT NULL DEFAULT 'pending',
  points_possible       INTEGER          NOT NULL,
  points_earned         INTEGER,
  result_summary        TEXT,
  result_detail         JSONB,
  source_url            TEXT,
  raw_tinyfish_result   JSONB,
  claude_analysis       TEXT,
  flags                 JSONB            NOT NULL DEFAULT '[]',
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  CONSTRAINT kyc_checks_request_type_unique UNIQUE (request_id, check_type)
);

CREATE INDEX IF NOT EXISTS idx_kyc_checks_request ON kyc_checks(request_id);
CREATE INDEX IF NOT EXISTS idx_kyc_checks_status  ON kyc_checks(request_id, status);

-- ─── KYC Audit Trail ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kyc_audit_trail (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID        NOT NULL REFERENCES kyc_verification_requests(id) ON DELETE CASCADE,
  event_type  TEXT        NOT NULL,
  event_data  JSONB,
  actor       TEXT        NOT NULL DEFAULT 'system',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_audit_request ON kyc_audit_trail(request_id, created_at DESC);

-- ─── KYC Operator Alerts ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kyc_operator_alerts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        UUID        NOT NULL REFERENCES kyc_verification_requests(id) ON DELETE CASCADE,
  organization_id   UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id       UUID        NOT NULL REFERENCES customers(id),
  customer_name     TEXT        NOT NULL,
  alert_type        TEXT        NOT NULL,
  severity          TEXT        NOT NULL DEFAULT 'high',
  summary           TEXT        NOT NULL,
  failed_checks     JSONB       NOT NULL DEFAULT '[]',
  watchlist_matches JSONB,
  adverse_media     JSONB,
  claude_analysis   TEXT,
  status            TEXT        NOT NULL DEFAULT 'open',
  resolved_by       TEXT,
  resolved_at       TIMESTAMPTZ,
  resolution_notes  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT kyc_alerts_status_check   CHECK (status IN ('open', 'escalated', 'approved', 'declined')),
  CONSTRAINT kyc_alerts_severity_check CHECK (severity IN ('high', 'critical')),
  CONSTRAINT kyc_alerts_type_check     CHECK (alert_type IN ('kyc_flagged', 'kyc_failed', 'watchlist_hit'))
);

CREATE INDEX IF NOT EXISTS idx_kyc_alerts_org    ON kyc_operator_alerts(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kyc_alerts_status ON kyc_operator_alerts(organization_id, status);

-- ─── Demo seed: three KYC cases ──────────────────────────────────────────────
-- Customers: Blueprint Events, Grand Hotels Ltd, Meridian Corp
-- UUIDs use segment 0003 (customers) and 0020 (kyc_requests) and 0011 (invoices)

INSERT INTO customers (
  id, organization_id, full_name, email, phone,
  preferred_contact_channel, lifetime_value, risk_status,
  kyc_status, kyc_score, kyc_band
) VALUES
  -- Case 1: Blueprint Events — KYC in_progress, agent HELD
  ('00000000-0000-0000-0003-000000000100',
   '00000000-0000-0000-0000-000000000001',
   'James Hartley', 'j.hartley@blueprintevents.com', '+1-612-555-0201',
   'email', 0.00, 'none', 'in_progress', NULL, NULL),
  -- Case 2: Grand Hotels Ltd — KYC completed_verified, agent ACTIVE
  ('00000000-0000-0000-0003-000000000101',
   '00000000-0000-0000-0000-000000000001',
   'Grand Hotels Ltd', 'accounts@grandhotels.com', '+1-612-555-0202',
   'email', 0.00, 'none', 'completed_verified', 91, 'verified'),
  -- Case 3: Meridian Corp — KYC completed_flagged, agent BLOCKED
  ('00000000-0000-0000-0003-000000000102',
   '00000000-0000-0000-0000-000000000001',
   'Robert Chen', 'r.chen@meridiancorp.io', '+1-612-555-0203',
   'email', 0.00, 'flagged', 'completed_flagged', 34, 'flagged')
ON CONFLICT (id) DO NOTHING;

-- Overdue invoices for the three demo cases (no appointment required)
INSERT INTO invoices (
  id, organization_id, customer_id, appointment_id,
  invoice_number, currency, subtotal, tax_rate, tax_amount,
  discount_amount, total_amount, amount_paid,
  due_at, status, recovery_status
) VALUES
  -- Blueprint Events: $9,100 overdue deposit
  ('00000000-0000-0000-0011-000000000001',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0003-000000000100', NULL,
   'INV-KYC-001', 'USD', 9100.00, 0.00, 0.00, 0.00, 9100.00, 0.00,
   NOW() - INTERVAL '22 days', 'overdue', 'queued'),
  -- Grand Hotels Ltd: $8,200 overdue
  ('00000000-0000-0000-0011-000000000002',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0003-000000000101', NULL,
   'INV-KYC-002', 'USD', 8200.00, 0.00, 0.00, 0.00, 8200.00, 0.00,
   NOW() - INTERVAL '18 days', 'overdue', 'reminder_sent'),
  -- Meridian Corp: $14,500 overdue
  ('00000000-0000-0000-0011-000000000003',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0003-000000000102', NULL,
   'INV-KYC-003', 'USD', 14500.00, 0.00, 0.00, 0.00, 14500.00, 0.00,
   NOW() - INTERVAL '31 days', 'overdue', 'escalated')
ON CONFLICT (id) DO NOTHING;

-- KYC verification requests
INSERT INTO kyc_verification_requests (
  id, organization_id, customer_id, invoice_id, token,
  status, risk_score, risk_band,
  watchlist_flagged, liveness_flagged, adverse_media_flagged,
  business_name, registered_state, business_address, website_url,
  director_name, director_dob, bank_account_last4, bank_routing_number,
  created_at, updated_at, completed_at, link_opened_at, link_expires_at
) VALUES
  -- Case 1: Blueprint Events — in_progress, steps 1+2 done, 3-8 pending
  ('00000000-0000-0000-0020-000000000001',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0003-000000000100',
   '00000000-0000-0000-0011-000000000001',
   'kyc_tok_blueprint_events_2026',
   'in_progress', NULL, NULL,
   FALSE, FALSE, FALSE,
   'Blueprint Events LLC', 'MN', '420 N 5th St Suite 210, Minneapolis MN 55401',
   'https://blueprintevents.com',
   'James Hartley', '1981-03-14', '4821', '091000022',
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days',
   NULL, NOW() - INTERVAL '2 days', NOW() + INTERVAL '4 days'),
  -- Case 2: Grand Hotels Ltd — completed_verified, score 91
  ('00000000-0000-0000-0020-000000000002',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0003-000000000101',
   '00000000-0000-0000-0011-000000000002',
   'kyc_tok_grand_hotels_2026',
   'completed_verified', 91, 'verified',
   FALSE, FALSE, FALSE,
   'Grand Hotels Ltd', 'MN', '1300 Nicollet Mall, Minneapolis MN 55403',
   'https://grandhotels.com',
   'Alexandra Chen', '1975-08-22', '9034', '091000022',
   NOW() - INTERVAL '14 days', NOW() - INTERVAL '10 days',
   NOW() - INTERVAL '10 days', NOW() - INTERVAL '13 days', NOW() + INTERVAL '0 days'),
  -- Case 3: Meridian Corp — completed_flagged, score 34, OFAC hit
  ('00000000-0000-0000-0020-000000000003',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0003-000000000102',
   '00000000-0000-0000-0011-000000000003',
   'kyc_tok_meridian_corp_2026',
   'completed_flagged', 34, 'flagged',
   TRUE, FALSE, TRUE,
   'Meridian Corp', 'DE', '1 Commerce Square, Suite 2000, Wilmington DE 19801',
   'https://meridiancorp.io',
   'Robert Chen', '1968-11-05', '7731', '021000021',
   NOW() - INTERVAL '21 days', NOW() - INTERVAL '17 days',
   NOW() - INTERVAL '17 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '14 days')
ON CONFLICT (id) DO NOTHING;

-- KYC checks for Case 1: Blueprint Events (steps 1+2 passed, 3-8 pending)
INSERT INTO kyc_checks (
  request_id, check_type, status, points_possible, points_earned,
  result_summary, result_detail, source_url, flags, completed_at
) VALUES
  ('00000000-0000-0000-0020-000000000001', 'business_name', 'passed', 15, 15,
   'Blueprint Events LLC is an active Minnesota LLC, registered 2018-06-12.',
   '{"registration_status":"active","filing_date":"2018-06-12","registered_agent":"CT Corporation System","name_changes":0,"state":"MN"}',
   'https://mblsportal.sos.state.mn.us/', '[]',
   NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0020-000000000001', 'office_address', 'passed', 10, 9,
   '420 N 5th St Suite 210, Minneapolis verified as commercial office building.',
   '{"geocoded":true,"location_type":"commercial","virtual_office_flag":false,"address":"420 N 5th St Suite 210, Minneapolis, MN 55401","maps_result":"Minneapolis, MN — The Butler Square Building"}',
   'https://maps.google.com/?q=420+N+5th+St+Minneapolis+MN', '[]',
   NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0020-000000000001', 'people_verification', 'pending', 15, NULL, NULL, NULL, NULL, '[]', NULL),
  ('00000000-0000-0000-0020-000000000001', 'watchlist_screening', 'pending', 25, NULL, NULL, NULL, NULL, '[]', NULL),
  ('00000000-0000-0000-0020-000000000001', 'bank_account', 'pending', 10, NULL, NULL, NULL, NULL, '[]', NULL),
  ('00000000-0000-0000-0020-000000000001', 'owner_kyc', 'pending', 15, NULL, NULL, NULL, NULL, '[]', NULL),
  ('00000000-0000-0000-0020-000000000001', 'adverse_media', 'pending', 10, NULL, NULL, NULL, NULL, '[]', NULL),
  ('00000000-0000-0000-0020-000000000001', 'website_presence', 'pending', 10, NULL, NULL, NULL, NULL, '[]', NULL)
ON CONFLICT (request_id, check_type) DO NOTHING;

-- KYC checks for Case 2: Grand Hotels Ltd (all 8 passed, score 91)
INSERT INTO kyc_checks (
  request_id, check_type, status, points_possible, points_earned,
  result_summary, result_detail, source_url, flags, completed_at
) VALUES
  ('00000000-0000-0000-0020-000000000002', 'business_name', 'passed', 15, 15,
   'Grand Hotels Ltd is an active Minnesota corporation, registered 2009-03-18.',
   '{"registration_status":"active","filing_date":"2009-03-18","registered_agent":"Registered Agents Inc.","name_changes":0,"state":"MN"}',
   'https://mblsportal.sos.state.mn.us/', '[]',
   NOW() - INTERVAL '10 days'),
  ('00000000-0000-0000-0020-000000000002', 'office_address', 'passed', 10, 10,
   '1300 Nicollet Mall confirmed as a commercial hotel property in Minneapolis.',
   '{"geocoded":true,"location_type":"commercial","virtual_office_flag":false,"address":"1300 Nicollet Mall, Minneapolis, MN 55403"}',
   'https://maps.google.com/?q=1300+Nicollet+Mall+Minneapolis+MN', '[]',
   NOW() - INTERVAL '10 days'),
  ('00000000-0000-0000-0020-000000000002', 'people_verification', 'passed', 15, 14,
   'Alexandra Chen: 1 active company found. No dissolution pattern.',
   '{"director_name":"Alexandra Chen","companies_found":[{"name":"Grand Hotels Ltd","status":"active","state":"MN","incorporated":"2009-03-18"}],"dissolved_count":0,"pattern_flag":false}',
   'https://opencorporates.com/officers?q=Alexandra+Chen', '[]',
   NOW() - INTERVAL '10 days'),
  ('00000000-0000-0000-0020-000000000002', 'watchlist_screening', 'passed', 25, 25,
   'No matches found on OFAC SDN, EU sanctions, UN sanctions, or PEP lists.',
   '{"ofac_result":"clear","eu_sanctions":"clear","un_sanctions":"clear","pep_list":"clear","searched_names":["Alexandra Chen","Grand Hotels Ltd"]}',
   'https://sanctionssearch.ofac.treas.gov/', '[]',
   NOW() - INTERVAL '10 days'),
  ('00000000-0000-0000-0020-000000000002', 'bank_account', 'passed', 10, 8,
   'Bank account ending 9034 verified as active checking account (Plaid sandbox).',
   '{"account_status":"active","account_type":"checking","institution":"Wells Fargo","routing_verified":true}',
   NULL, '[]',
   NOW() - INTERVAL '10 days'),
  ('00000000-0000-0000-0020-000000000002', 'owner_kyc', 'passed', 15, 12,
   'ID documents verified. Passport and secondary ID cross-matched. Liveness check passed (94% confidence).',
   '{"document_type":"passport","name_match":true,"dob_match":true,"expiry_valid":true,"liveness_score":0.94,"cross_match_passed":true,"forgery_analysis":"No anomalies detected. ID number format valid for US passport."}',
   NULL, '[]',
   NOW() - INTERVAL '10 days'),
  ('00000000-0000-0000-0020-000000000002', 'adverse_media', 'passed', 10, 7,
   'No significant adverse media found. One unrelated 2019 article about hospitality industry trends.',
   '{"results_found":1,"credible_adverse":false,"articles":[{"headline":"Minnesota hospitality sector sees growth in 2019","source":"Minneapolis Star Tribune","url":"https://startribune.com/hospitality-2019","relevant":false}]}',
   NULL, '[]',
   NOW() - INTERVAL '10 days'),
  ('00000000-0000-0000-0020-000000000002', 'website_presence', 'passed', 10, 9,
   'grandhotels.com loads, has about page, business name matches, copyright 2015. Domain age: 11 years.',
   '{"site_loads":true,"has_about_page":true,"name_matches":true,"copyright_year":2015,"domain_age_months":132,"parked":false}',
   'https://grandhotels.com', '[]',
   NOW() - INTERVAL '10 days')
ON CONFLICT (request_id, check_type) DO NOTHING;

-- KYC checks for Case 3: Meridian Corp (flagged — OFAC hit, 3 dissolved, adverse media)
INSERT INTO kyc_checks (
  request_id, check_type, status, points_possible, points_earned,
  result_summary, result_detail, source_url, flags, completed_at
) VALUES
  ('00000000-0000-0000-0020-000000000003', 'business_name', 'passed', 15, 14,
   'Meridian Corp is an active Delaware LLC, registered 2021-08-03.',
   '{"registration_status":"active","filing_date":"2021-08-03","registered_agent":"Delaware Registered Agent LLC","name_changes":0,"state":"DE"}',
   'https://icis.corp.delaware.gov/', '[]',
   NOW() - INTERVAL '17 days'),
  ('00000000-0000-0000-0020-000000000003', 'office_address', 'passed', 10, 9,
   '1 Commerce Square Wilmington is a commercial office complex.',
   '{"geocoded":true,"location_type":"commercial","virtual_office_flag":true,"address":"1 Commerce Square Suite 2000, Wilmington DE 19801","note":"Suite 2000 pattern consistent with virtual/registered-office suite"}',
   'https://maps.google.com/?q=1+Commerce+Square+Wilmington+DE',
   '["Suite 2000 pattern: possible virtual office address"]',
   NOW() - INTERVAL '17 days'),
  ('00000000-0000-0000-0020-000000000003', 'people_verification', 'flagged', 15, 5,
   'Robert Chen: 4 companies found, 3 dissolved within 24 months of incorporation.',
   '{"director_name":"Robert Chen","companies_found":[{"name":"Meridian Corp","status":"active","state":"DE","incorporated":"2021-08-03"},{"name":"Apex Trade Solutions LLC","status":"dissolved","state":"DE","incorporated":"2019-01-14","dissolved":"2020-11-22"},{"name":"Chen Capital Group Inc","status":"dissolved","state":"NY","incorporated":"2018-06-01","dissolved":"2020-04-15"},{"name":"Pacific Rim Ventures LLC","status":"dissolved","state":"CA","incorporated":"2017-03-10","dissolved":"2019-01-08"}],"dissolved_count":3,"pattern_flag":true,"rapid_dissolution_flag":true}',
   'https://opencorporates.com/officers?q=Robert+Chen',
   '["3 dissolved companies under same director","Rapid incorporation-dissolution pattern detected","Same director across 4 entities in 4 states"]',
   NOW() - INTERVAL '17 days'),
  ('00000000-0000-0000-0020-000000000003', 'watchlist_screening', 'flagged', 25, 0,
   'OFAC SDN LIST HIT: Robert Chen matches entry on OFAC Specially Designated Nationals list.',
   '{"ofac_result":"HIT","ofac_match":{"name":"CHEN, Robert","list":"SDN List","program":"SDGT","entry_id":"28841","match_confidence":"HIGH"},"eu_sanctions":"clear","un_sanctions":"clear","pep_list":"clear","searched_names":["Robert Chen","Meridian Corp"]}',
   'https://sanctionssearch.ofac.treas.gov/',
   '["OFAC SDN LIST HIT: Robert Chen — SDGT program","Score capped at 30 regardless of other results"]',
   NOW() - INTERVAL '17 days'),
  ('00000000-0000-0000-0020-000000000003', 'bank_account', 'passed', 10, 8,
   'Bank account ending 7731 verified as active (Plaid sandbox).',
   '{"account_status":"active","account_type":"checking","institution":"JPMorgan Chase","routing_verified":true}',
   NULL, '[]',
   NOW() - INTERVAL '17 days'),
  ('00000000-0000-0000-0020-000000000003', 'owner_kyc', 'passed', 15, 12,
   'ID documents verified. Liveness check passed (88% confidence). Minor inconsistency in secondary ID font noted.',
   '{"document_type":"passport","name_match":true,"dob_match":true,"expiry_valid":true,"liveness_score":0.88,"cross_match_passed":true,"forgery_analysis":"Minor font weight variation noted on secondary ID — low-risk anomaly. Primary passport appears authentic."}',
   NULL, '[]',
   NOW() - INTERVAL '17 days'),
  ('00000000-0000-0000-0020-000000000003', 'adverse_media', 'flagged', 10, 0,
   'Credible adverse media found: fraud lawsuit and regulatory inquiry coverage.',
   '{"results_found":2,"credible_adverse":true,"articles":[{"headline":"Former exec Robert Chen named in $2.1M wire fraud lawsuit, Delaware court records show","source":"Delaware Law Journal","url":"https://delaware-law-journal.example.com/robert-chen-fraud-2022","date":"2022-09-14","relevant":true},{"headline":"SEC inquiry targets Meridian Corp over undisclosed related-party transactions","source":"Reuters","url":"https://reuters.com/article/meridian-corp-sec-inquiry","date":"2023-02-07","relevant":true}]}',
   'https://www.google.com/search?q=Robert+Chen+Meridian+Corp+fraud+lawsuit+investigation',
   '["Credible adverse media: fraud lawsuit (Delaware Law Journal, 2022)","Credible adverse media: SEC inquiry coverage (Reuters, 2023)","Additional -10 point deduction applied"]',
   NOW() - INTERVAL '17 days'),
  ('00000000-0000-0000-0020-000000000003', 'website_presence', 'passed', 10, 8,
   'meridiancorp.io loads. Business name matches. Domain registered 2021 — relatively new (3 years).',
   '{"site_loads":true,"has_about_page":true,"name_matches":true,"copyright_year":2022,"domain_age_months":33,"parked":false,"whois_note":"Domain registered August 2021 — correlates with company incorporation date"}',
   'https://meridiancorp.io', '[]',
   NOW() - INTERVAL '17 days')
ON CONFLICT (request_id, check_type) DO NOTHING;

-- Score breakdown JSON for completed cases
UPDATE kyc_verification_requests
SET score_breakdown = '{
  "business_name":       {"points_earned":15,"points_possible":15,"status":"passed"},
  "office_address":      {"points_earned":10,"points_possible":10,"status":"passed"},
  "people_verification": {"points_earned":14,"points_possible":15,"status":"passed"},
  "watchlist_screening": {"points_earned":25,"points_possible":25,"status":"passed"},
  "bank_account":        {"points_earned":8,"points_possible":10,"status":"passed"},
  "owner_kyc":           {"points_earned":12,"points_possible":15,"status":"passed"},
  "adverse_media":       {"points_earned":7,"points_possible":10,"status":"passed"},
  "website_presence":    {"points_earned":9,"points_possible":10,"status":"passed"}
}'::jsonb
WHERE id = '00000000-0000-0000-0020-000000000002';

UPDATE kyc_verification_requests
SET score_breakdown = '{
  "business_name":       {"points_earned":14,"points_possible":15,"status":"passed"},
  "office_address":      {"points_earned":9,"points_possible":10,"status":"passed"},
  "people_verification": {"points_earned":5,"points_possible":15,"status":"flagged"},
  "watchlist_screening": {"points_earned":0,"points_possible":25,"status":"flagged"},
  "bank_account":        {"points_earned":8,"points_possible":10,"status":"passed"},
  "owner_kyc":           {"points_earned":12,"points_possible":15,"status":"passed"},
  "adverse_media":       {"points_earned":0,"points_possible":10,"status":"flagged"},
  "website_presence":    {"points_earned":8,"points_possible":10,"status":"passed"},
  "caps_applied":        ["watchlist_hit_cap_30","adverse_media_deduction_10"]
}'::jsonb
WHERE id = '00000000-0000-0000-0020-000000000003';

-- Audit trail entries
INSERT INTO kyc_audit_trail (request_id, event_type, event_data, actor) VALUES
  ('00000000-0000-0000-0020-000000000001', 'request_created',
   '{"customer":"James Hartley","invoice":"INV-KYC-001","amount":9100}', 'system'),
  ('00000000-0000-0000-0020-000000000001', 'link_sent',
   '{"channel":"email","to":"j.hartley@blueprintevents.com"}', 'system'),
  ('00000000-0000-0000-0020-000000000001', 'link_opened',
   '{"ip":"203.0.113.45","user_agent":"Mozilla/5.0"}', 'client'),
  ('00000000-0000-0000-0020-000000000001', 'check_completed',
   '{"check_type":"business_name","status":"passed","points":15}', 'system'),
  ('00000000-0000-0000-0020-000000000001', 'check_completed',
   '{"check_type":"office_address","status":"passed","points":9}', 'system'),
  ('00000000-0000-0000-0020-000000000002', 'request_created',
   '{"customer":"Grand Hotels Ltd","invoice":"INV-KYC-002","amount":8200}', 'system'),
  ('00000000-0000-0000-0020-000000000002', 'link_sent',
   '{"channel":"email","to":"accounts@grandhotels.com"}', 'system'),
  ('00000000-0000-0000-0020-000000000002', 'verification_completed',
   '{"score":91,"band":"verified","status":"completed_verified"}', 'system'),
  ('00000000-0000-0000-0020-000000000002', 'agent_activated',
   '{"reason":"KYC verified, score 91 — agent cleared to act"}', 'system'),
  ('00000000-0000-0000-0020-000000000003', 'request_created',
   '{"customer":"Robert Chen","invoice":"INV-KYC-003","amount":14500}', 'system'),
  ('00000000-0000-0000-0020-000000000003', 'watchlist_hit',
   '{"list":"OFAC SDN","match":"CHEN, Robert","program":"SDGT","severity":"critical"}', 'system'),
  ('00000000-0000-0000-0020-000000000003', 'people_verification_flagged',
   '{"dissolved_companies":3,"directors_checked":"Robert Chen"}', 'system'),
  ('00000000-0000-0000-0020-000000000003', 'adverse_media_flagged',
   '{"articles_found":2,"sources":["Delaware Law Journal","Reuters"]}', 'system'),
  ('00000000-0000-0000-0020-000000000003', 'verification_completed',
   '{"score":34,"band":"flagged","status":"completed_flagged","caps_applied":["watchlist_hit_cap_30","adverse_media_deduction_10"]}', 'system'),
  ('00000000-0000-0000-0020-000000000003', 'agent_blocked',
   '{"reason":"KYC flagged — OFAC SDN hit. Agent cannot act without operator override."}', 'system');

-- Operator alert for Meridian Corp
INSERT INTO kyc_operator_alerts (
  request_id, organization_id, customer_id, customer_name,
  alert_type, severity, summary,
  failed_checks, watchlist_matches, adverse_media, claude_analysis, status
) VALUES (
  '00000000-0000-0000-0020-000000000003',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0003-000000000102',
  'Robert Chen (Meridian Corp)',
  'watchlist_hit', 'critical',
  'CRITICAL: OFAC SDN list match on director Robert Chen. 3 dissolved companies. 2 credible adverse media hits. Score 34/100 — agent blocked.',
  '[{"check_type":"watchlist_screening","reason":"OFAC SDN LIST HIT","detail":"Robert Chen matches SDGT program entry #28841 on Specially Designated Nationals list"},{"check_type":"people_verification","reason":"3 dissolved companies under same director","detail":"Apex Trade Solutions (dissolved 2020), Chen Capital Group (dissolved 2020), Pacific Rim Ventures (dissolved 2019)"},{"check_type":"adverse_media","reason":"Credible adverse media found","detail":"Wire fraud lawsuit (Delaware Law Journal 2022) and SEC inquiry (Reuters 2023)"}]',
  '{"ofac_match":{"name":"CHEN, Robert","list":"SDN List","program":"SDGT","entry_id":"28841","match_confidence":"HIGH"}}',
  '[{"headline":"Former exec Robert Chen named in $2.1M wire fraud lawsuit, Delaware court records show","source":"Delaware Law Journal","url":"https://delaware-law-journal.example.com/robert-chen-fraud-2022","date":"2022-09-14"},{"headline":"SEC inquiry targets Meridian Corp over undisclosed related-party transactions","source":"Reuters","url":"https://reuters.com/article/meridian-corp-sec-inquiry","date":"2023-02-07"}]',
  'Document analysis: Primary passport appears authentic. Minor font variation on secondary ID — low-risk anomaly. Liveness check passed at 88% confidence. However, OFAC SDN match on director name is a hard block regardless of document authenticity.',
  'open'
) ON CONFLICT DO NOTHING;
