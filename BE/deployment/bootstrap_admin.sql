-- Register YOUR administrator account through the normal website first.
-- Run with psql: psql ... -v admin_user_id='UUID_FROM_YOUR_ACCOUNT' -f deployment/bootstrap_admin.sql
-- No administrator password is embedded. Verify the UUID before running; RETURNING identifies the changed account.
BEGIN;
UPDATE users SET role='ADMIN', active=true
WHERE user_id=:'admin_user_id'::uuid
RETURNING user_id, full_name, email, role;
COMMIT;
