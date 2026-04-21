-- Resq · Organization membership default guardrails
-- Keep demo/auth assumptions safe: one default org per user, first membership defaults to true.

ALTER TABLE organization_memberships
  ALTER COLUMN is_default SET DEFAULT false;

-- Normalize existing rows to exactly one default membership per user.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY is_default DESC, created_at ASC, id ASC
    ) AS rn
  FROM organization_memberships
)
UPDATE organization_memberships om
SET is_default = (ranked.rn = 1)
FROM ranked
WHERE om.id = ranked.id;

CREATE UNIQUE INDEX IF NOT EXISTS org_memberships_one_default_per_user
  ON organization_memberships(user_id)
  WHERE is_default = true;

CREATE OR REPLACE FUNCTION enforce_membership_default()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE organization_memberships
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id <> NEW.id
      AND is_default = true;
  ELSIF NOT EXISTS (
    SELECT 1 FROM organization_memberships WHERE user_id = NEW.user_id
  ) THEN
    NEW.is_default := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_membership_default ON organization_memberships;
CREATE TRIGGER trg_enforce_membership_default
  BEFORE INSERT OR UPDATE ON organization_memberships
  FOR EACH ROW
  EXECUTE FUNCTION enforce_membership_default();
