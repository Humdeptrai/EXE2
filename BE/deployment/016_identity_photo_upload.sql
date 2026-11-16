-- Apply before deploying the optional photo-reference workflow. Default: camera only.
BEGIN;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS face_photo_upload_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE identity_progress ADD COLUMN IF NOT EXISTS face_photo_uploaded BOOLEAN NOT NULL DEFAULT FALSE;
COMMIT;
