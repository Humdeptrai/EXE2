BEGIN;
CREATE TABLE IF NOT EXISTS identity_appeals (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(user_id), status varchar(20) NOT NULL,
 note varchar(500), reason varchar(500), created_at timestamptz NOT NULL, resolved_at timestamptz,
 claimed_at timestamptz, claimed_by uuid REFERENCES users(user_id), submission_at timestamptz,
 similarity double precision, full_name bytea, document_number bytea, document_data bytea,
 front_image bytea, back_image bytea, face_image bytea, selfie_image bytea, version bigint NOT NULL DEFAULT 0,
 CONSTRAINT identity_appeal_state_check CHECK (status IN ('REQUESTED','PROCESSING','RESOLVED','REJECTED')),
 CONSTRAINT identity_appeal_claim_check CHECK (status <> 'PROCESSING' OR (claimed_by IS NOT NULL AND claimed_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_appeal_open ON identity_appeals(user_id) WHERE status IN ('REQUESTED','PROCESSING');
CREATE INDEX IF NOT EXISTS idx_identity_appeal_queue ON identity_appeals(status,created_at DESC);
DO $$ DECLARE item record; BEGIN
 FOR item IN SELECT conname FROM pg_constraint WHERE conrelid='notifications'::regclass AND contype='c'
 AND pg_get_constraintdef(oid) ~ '\mtype\M' LOOP
 EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT %I',item.conname);
 END LOOP;
END $$;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
 'JOB_INTEREST_RECEIVED','CANDIDATE_ACCEPTED','CANDIDATE_REJECTED','PAYMENT_RECEIVED',
 'CONNECTION_SUCCEEDED','CHAT_MESSAGE_RECEIVED','RATING_RECEIVED','REPORT_RESOLVED','REPORT_REJECTED','IDENTITY_REVIEWED'
));
COMMIT;
