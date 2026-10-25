BEGIN;
CREATE TABLE IF NOT EXISTS identity_registry_lock (id integer PRIMARY KEY);
INSERT INTO identity_registry_lock(id) VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS identity_claims (
 document_key varchar(64) PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(user_id),
 face_vector bytea, front_digest varchar(64), back_digest varchar(64), legacy_conflict boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL, index_attempt_at timestamptz, version bigint NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_identity_claim_owner ON identity_claims(owner_id);
COMMIT;
