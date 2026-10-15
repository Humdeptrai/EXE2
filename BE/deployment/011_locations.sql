BEGIN;
ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS area_label varchar(120);
ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE job_posts ADD COLUMN IF NOT EXISTS longitude double precision;
CREATE INDEX IF NOT EXISTS idx_job_geo ON job_posts(latitude,longitude) WHERE latitude IS NOT NULL;
CREATE TABLE IF NOT EXISTS saved_addresses (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
 label varchar(40) NOT NULL,address varchar(255) NOT NULL,area varchar(120) NOT NULL,
 latitude double precision,longitude double precision,default_address boolean NOT NULL DEFAULT false,
 CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))
);
CREATE INDEX IF NOT EXISTS idx_saved_address_owner ON saved_addresses(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_address_default ON saved_addresses(owner_id) WHERE default_address;
CREATE TABLE IF NOT EXISTS activity_locations (
 user_id uuid PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,area varchar(120) NOT NULL,
 latitude double precision,longitude double precision,radius_km integer,
 CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)),
 CHECK (radius_km IS NULL OR (latitude IS NOT NULL AND radius_km IN (1,3,5,10,20)))
);
COMMIT;
