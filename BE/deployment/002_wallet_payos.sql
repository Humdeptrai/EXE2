-- PostgreSQL migration for HandsFree(4).zip. Run with the backend stopped and a backup.
-- Idempotent: preserves existing jobs, matches, payment history and wallet entries.
BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance numeric(18,0) NOT NULL DEFAULT 0;
ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS moderation_hidden boolean NOT NULL DEFAULT false;

CREATE SEQUENCE IF NOT EXISTS wallet_order_seq START WITH 100000 INCREMENT BY 1;
CREATE TABLE IF NOT EXISTS wallet_topups (
    order_code bigint PRIMARY KEY DEFAULT nextval('wallet_order_seq'),
    owner_id uuid NOT NULL REFERENCES users(user_id),
    request_id uuid NOT NULL,
    amount numeric(18,0) NOT NULL CHECK (amount > 0),
    status varchar(30) NOT NULL,
    checkout_url varchar(1000),
    payment_link_id varchar(100),
    created_at timestamptz NOT NULL,
    credited_at timestamptz,
    UNIQUE (owner_id, request_id)
);
CREATE INDEX IF NOT EXISTS idx_wallet_topups_owner ON wallet_topups(owner_id, created_at DESC);
CREATE TABLE IF NOT EXISTS wallet_entries (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES users(user_id),
    amount numeric(18,0) NOT NULL CHECK (amount <> 0),
    balance_after numeric(18,0) NOT NULL CHECK (balance_after >= 0),
    kind varchar(30) NOT NULL,
    dedupe_key varchar(160) NOT NULL UNIQUE,
    description varchar(160),
    occurred_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wallet_entries_owner ON wallet_entries(owner_id, occurred_at);
CREATE TABLE IF NOT EXISTS platform_settings (
    id integer PRIMARY KEY,
    consumer_fee numeric(12,0) NOT NULL CHECK (consumer_fee >= 1000),
    provider_fee numeric(12,0) NOT NULL CHECK (provider_fee >= 1000),
    min_top_up bigint NOT NULL CHECK (min_top_up >= 1000),
    max_top_up bigint NOT NULL CHECK (max_top_up >= min_top_up),
    top_up_enabled boolean NOT NULL,
    version bigint NOT NULL
);
INSERT INTO platform_settings VALUES (1,10000,5000,10000,5000000,true,0) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS moderation_reports (
    id uuid PRIMARY KEY,
    reporter_id uuid NOT NULL REFERENCES users(user_id),
    target_type varchar(10) NOT NULL,
    target_id uuid NOT NULL,
    reason varchar(2000) NOT NULL,
    status varchar(20) NOT NULL,
    resolution varchar(2000),
    resolved_by uuid,
    created_at timestamptz NOT NULL,
    resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON moderation_reports(reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON moderation_reports(status, created_at DESC);
CREATE TABLE IF NOT EXISTS admin_audit (
    id uuid PRIMARY KEY,
    actor_id uuid NOT NULL,
    action varchar(50) NOT NULL,
    detail varchar(2000) NOT NULL,
    occurred_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_time ON admin_audit(occurred_at DESC);

-- Hibernate's update mode may leave old enum CHECK constraints intact.
-- Replace only checks containing the affected enum column/value; do not drop other checks.
DO $$
DECLARE item record;
BEGIN
    FOR item IN SELECT conname FROM pg_constraint
        WHERE conrelid = 'users'::regclass AND contype = 'c'
          AND pg_get_constraintdef(oid) ~ '\mrole\M'
          AND pg_get_constraintdef(oid) LIKE '%USER%'
    LOOP EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', item.conname); END LOOP;
    ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('USER','STAFF','ADMIN'));

    FOR item IN SELECT conname FROM pg_constraint
        WHERE conrelid = 'connection_payments'::regclass AND contype = 'c'
          AND pg_get_constraintdef(oid) ~ '(consumer_payment_method|provider_payment_method|payment_method)'
          AND pg_get_constraintdef(oid) LIKE '%MOMO%'
    LOOP EXECUTE format('ALTER TABLE connection_payments DROP CONSTRAINT %I', item.conname); END LOOP;
    ALTER TABLE connection_payments ADD CONSTRAINT chk_payment_method
        CHECK (payment_method IS NULL OR payment_method IN ('MOMO','ZALOPAY','BANK_TRANSFER','WALLET'));
    ALTER TABLE connection_payments ADD CONSTRAINT chk_consumer_payment_method
        CHECK (consumer_payment_method IS NULL OR consumer_payment_method IN ('MOMO','ZALOPAY','BANK_TRANSFER','WALLET'));
    ALTER TABLE connection_payments ADD CONSTRAINT chk_provider_payment_method
        CHECK (provider_payment_method IS NULL OR provider_payment_method IN ('MOMO','ZALOPAY','BANK_TRANSFER','WALLET'));
END $$;
COMMIT;
