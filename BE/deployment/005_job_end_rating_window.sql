BEGIN;
ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS expected_end_at timestamp;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS rating_delay_minutes integer NOT NULL DEFAULT 360;
-- Repair a column created without its default/NOT NULL during an earlier deploy.
-- Preserve any delay already configured by ADMIN, including 0.
ALTER TABLE platform_settings ALTER COLUMN rating_delay_minutes SET DEFAULT 360;
UPDATE platform_settings SET rating_delay_minutes = 360 WHERE rating_delay_minutes IS NULL;
ALTER TABLE platform_settings ALTER COLUMN rating_delay_minutes SET NOT NULL;
ALTER TABLE job_matches ADD COLUMN IF NOT EXISTS expected_end_at timestamptz;
ALTER TABLE job_matches ADD COLUMN IF NOT EXISTS rating_opens_at timestamptz;
ALTER TABLE job_matches ADD COLUMN IF NOT EXISTS rating_closes_at timestamptz;
ALTER TABLE job_matches ADD COLUMN IF NOT EXISTS consumer_rating_dismissed_at timestamptz;
ALTER TABLE job_matches ADD COLUMN IF NOT EXISTS provider_rating_dismissed_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_match_rating_window ON job_matches(rating_opens_at, rating_closes_at) WHERE connection_succeeded_at IS NOT NULL;
COMMIT;
