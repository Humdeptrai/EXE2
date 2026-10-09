-- Stop BE and back up the database first. Idempotent; no historical matches or payments are changed.
BEGIN;
ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS selfie_image bytea;
ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS selfie_verified_at timestamptz;
ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS document_number bytea;
ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS document_number_confirmed_at timestamptz;
CREATE TABLE IF NOT EXISTS identity_submissions (
    user_id uuid PRIMARY KEY REFERENCES users(user_id), status varchar(20) NOT NULL,
    reason varchar(500), submitted_at timestamptz, verified_at timestamptz, consent_at timestamptz,
    similarity double precision, live boolean, full_name bytea, document_data bytea,
    front_image bytea, back_image bytea, face_image bytea, selfie_image bytea,
    selfie_verified_at timestamptz, document_number bytea, document_number_confirmed_at timestamptz,
    version bigint NOT NULL DEFAULT 0
);
-- New columns deliberately remain NULL on existing records. Legacy users must submit
-- a new scan + live selfie + documents before NEW posting / interest / matching actions.
-- Previously verified identities, matches, payments and existing contacts stay intact.
COMMIT;
