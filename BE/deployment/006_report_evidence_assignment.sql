BEGIN;
ALTER TABLE moderation_reports ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE moderation_reports ADD COLUMN IF NOT EXISTS assigned_at timestamptz;
ALTER TABLE moderation_reports ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;

-- Old IN_REVIEW cases have no assignee. Release these into the shared queue.
UPDATE moderation_reports SET status = 'OPEN', resolution = NULL, resolved_by = NULL, resolved_at = NULL
WHERE status = 'IN_REVIEW' AND assigned_to IS NULL;

CREATE TABLE IF NOT EXISTS report_links (
    report_id uuid NOT NULL REFERENCES moderation_reports(id) ON DELETE CASCADE,
    link_index integer NOT NULL,
    url varchar(2000) NOT NULL,
    PRIMARY KEY (report_id, link_index)
);
CREATE TABLE IF NOT EXISTS report_evidence (
    id uuid PRIMARY KEY,
    report_id uuid NOT NULL REFERENCES moderation_reports(id) ON DELETE CASCADE,
    original_name varchar(255) NOT NULL,
    content_type varchar(80) NOT NULL,
    size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 104857600),
    storage_provider varchar(20) NOT NULL,
    storage_key varchar(600) NOT NULL,
    created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_report_evidence_report ON report_evidence(report_id);
CREATE INDEX IF NOT EXISTS idx_reports_assignment ON moderation_reports(status, assigned_to, created_at);

-- Hibernate update does not reliably expand an existing enum check constraint.
DO $$
DECLARE item record;
BEGIN
    FOR item IN SELECT conname FROM pg_constraint
        WHERE conrelid = 'notifications'::regclass AND contype = 'c'
        AND pg_get_constraintdef(oid) ~ '\mtype\M'
    LOOP
        EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT %I', item.conname);
    END LOOP;
END $$;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'JOB_INTEREST_RECEIVED', 'CANDIDATE_ACCEPTED', 'CANDIDATE_REJECTED',
    'PAYMENT_RECEIVED', 'CONNECTION_SUCCEEDED', 'CHAT_MESSAGE_RECEIVED',
    'RATING_RECEIVED', 'REPORT_RESOLVED', 'REPORT_REJECTED'
));
COMMIT;
