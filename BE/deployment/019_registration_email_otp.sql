-- Run on Neon before deploying BE. OFF preserves current registration behavior.
BEGIN;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS registration_email_otp_enabled BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS registration_email_otps (
 email VARCHAR(254) PRIMARY KEY,
 code_hash VARCHAR(64), nonce VARCHAR(36),
 expires_at TIMESTAMP WITH TIME ZONE, sent_at TIMESTAMP WITH TIME ZONE,
 consumed_at TIMESTAMP WITH TIME ZONE, window_started_at TIMESTAMP WITH TIME ZONE,
 send_count INTEGER NOT NULL DEFAULT 0,
 failed_attempts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_registration_email_otp_sent ON registration_email_otps(sent_at);
COMMIT;
