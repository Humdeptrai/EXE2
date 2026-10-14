-- Run on the BE database after backup. Idempotent; retains all message history.
BEGIN;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_name varchar(255);
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_type varchar(100);
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_size bigint;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_provider varchar(20);
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_key varchar(500);
CREATE TABLE IF NOT EXISTS chat_message_hearts (
    message_id uuid NOT NULL REFERENCES chat_messages(chat_message_id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(user_id),
    PRIMARY KEY(message_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread_sender ON chat_messages(conversation_id, sender_id) WHERE read_at IS NULL;
COMMIT;
