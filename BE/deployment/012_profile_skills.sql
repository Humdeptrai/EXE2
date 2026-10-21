BEGIN;
CREATE TABLE IF NOT EXISTS profile_skills (
 skill_id uuid PRIMARY KEY, name varchar(40) NOT NULL, normalized_name varchar(40) NOT NULL,
 status varchar(12) NOT NULL CHECK (status IN ('PENDING','APPROVED','REJECTED')),
 submitted_by uuid REFERENCES users(user_id), reviewed_by uuid REFERENCES users(user_id),
 reviewed_at timestamptz, rejection_reason varchar(300),
 created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
 CONSTRAINT uk_profile_skill_key UNIQUE(normalized_name)
);
CREATE INDEX IF NOT EXISTS idx_profile_skills_status_created ON profile_skills(status,created_at);
CREATE INDEX IF NOT EXISTS idx_profile_skills_submitter ON profile_skills(submitted_by,created_at);
-- Seed the existing shared choices; do not publish arbitrary private legacy tags.
INSERT INTO profile_skills(skill_id,name,normalized_name,status,created_at,updated_at)
SELECT md5('handsfree-profile-skill:' || lower(name))::uuid,name,lower(name),'APPROVED',now(),now()
FROM unnest(ARRAY['Dọn dẹp','Giao hàng','Chăm thú cưng','Sửa chữa','Gia sư','Thiết kế','Nấu ăn','Hỗ trợ sự kiện','Có phương tiện','Làm việc nhanh','Cẩn thận','Linh hoạt']) AS name
ON CONFLICT (normalized_name) DO NOTHING;
-- Hibernate enum checks from older deployments may not allow the new notification type.
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='notifications'::regclass AND contype='c'
 AND pg_get_constraintdef(oid) ~ '\mtype\M' LOOP
  EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT %I',c.conname);
 END LOOP;
END $$;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('JOB_INTEREST_RECEIVED','CANDIDATE_ACCEPTED','CANDIDATE_REJECTED','PAYMENT_RECEIVED','CONNECTION_SUCCEEDED','CHAT_MESSAGE_RECEIVED','REPORT_RESOLVED','REPORT_REJECTED','IDENTITY_REVIEWED','RATING_RECEIVED','SKILL_REVIEWED'));
COMMIT;
