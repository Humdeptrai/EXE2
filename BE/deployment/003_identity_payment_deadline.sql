-- Stop backend and back up PostgreSQL before running. Safe to run again.
BEGIN;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS payment_window_minutes integer NOT NULL DEFAULT 1440;
ALTER TABLE job_matches ADD COLUMN IF NOT EXISTS payment_deadline_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_matches_payment_deadline ON job_matches(status, payment_deadline_at);
CREATE TABLE IF NOT EXISTS identity_verifications (
    user_id uuid PRIMARY KEY REFERENCES users(user_id),
    status varchar(20) NOT NULL,
    reason varchar(500), submitted_at timestamptz, verified_at timestamptz, consent_at timestamptz,
    similarity double precision, live boolean,
    full_name bytea, document_data bytea, front_image bytea, back_image bytea, face_image bytea,
    version bigint NOT NULL DEFAULT 0
);
DO $$ DECLARE item record; BEGIN
    FOR item IN SELECT conname FROM pg_constraint WHERE conrelid = 'job_matches'::regclass
        AND contype = 'c' AND pg_get_constraintdef(oid) ~ '\mstatus\M'
        AND pg_get_constraintdef(oid) LIKE '%ACTIVE%'
    LOOP EXECUTE format('ALTER TABLE job_matches DROP CONSTRAINT %I', item.conname); END LOOP;
    ALTER TABLE job_matches ADD CONSTRAINT chk_job_match_status CHECK (status IN ('ACTIVE','DISCONNECTED','COMPLETED','EXPIRED'));
END $$;
-- Existing matching deadlines deliberately remain NULL: no retroactive expiry/refund.
-- New matches snapshot the ADMIN-configured duration in application code.
COMMIT;
