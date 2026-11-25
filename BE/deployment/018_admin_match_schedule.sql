-- Run before deploying BE: enable schedule-change notifications.
-- No work dates, payments or existing ratings are modified by this migration.
BEGIN;
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='notifications'::regclass AND contype='c'
 AND pg_get_constraintdef(oid) ~ '\mtype\M' LOOP
  EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT %I',c.conname);
 END LOOP;
END $$;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
 'JOB_INTEREST_RECEIVED','CANDIDATE_ACCEPTED','CANDIDATE_REJECTED','PAYMENT_RECEIVED',
 'CONNECTION_SUCCEEDED','CHAT_MESSAGE_RECEIVED','REPORT_RESOLVED','REPORT_REJECTED',
 'IDENTITY_REVIEWED','RATING_RECEIVED','SKILL_REVIEWED','MATCH_SCHEDULE_CHANGED'
));
COMMIT;
