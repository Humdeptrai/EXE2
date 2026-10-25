BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS password_resets(token_hash varchar(64) PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(user_id),created_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,consumed_at timestamptz);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_time ON password_resets(user_id,created_at);
COMMIT;
