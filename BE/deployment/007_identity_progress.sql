-- Run against the backend database before deploying this phase. Preserve IDENTITY_ENCRYPTION_KEY.
BEGIN;
CREATE TABLE IF NOT EXISTS identity_progress (
    user_id UUID PRIMARY KEY REFERENCES users(user_id),
    checkpoint BYTEA, face_image BYTEA, selfie_image BYTEA, front_image BYTEA, back_image BYTEA,
    document_number BYTEA,
    selfie_passed BOOLEAN NOT NULL DEFAULT FALSE,
    front_passed BOOLEAN NOT NULL DEFAULT FALSE,
    back_passed BOOLEAN NOT NULL DEFAULT FALSE,
    front_reason VARCHAR(500), back_reason VARCHAR(500), status VARCHAR(30), updated_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);
COMMIT;
