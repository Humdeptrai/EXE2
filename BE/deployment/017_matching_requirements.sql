-- Apply to the backend database before deploying the matching requirements toggle.
-- Existing behavior stays enabled. Does not modify identity records or payments.
BEGIN;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS matching_requirements_enabled BOOLEAN NOT NULL DEFAULT TRUE;
COMMIT;
