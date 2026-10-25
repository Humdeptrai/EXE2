BEGIN;
CREATE TABLE IF NOT EXISTS admin_wallet_credits(request_id uuid PRIMARY KEY,actor_id uuid NOT NULL REFERENCES users(user_id),owner_id uuid NOT NULL REFERENCES users(user_id),amount numeric(18,0) NOT NULL CHECK(amount>0),balance_after numeric(18,0) NOT NULL,reason varchar(1000) NOT NULL,order_code bigint REFERENCES wallet_topups(order_code),report_id uuid REFERENCES moderation_reports(id),created_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS idx_admin_wallet_credit_owner ON admin_wallet_credits(owner_id,created_at);
COMMIT;
