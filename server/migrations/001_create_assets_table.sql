-- Migration: Create Assets table and refactor Submissions
-- Description: Separate media storage (Assets) from contest participation (Submissions)
-- Goal: One asset record, multiple contest submissions possible

-- Step 1: Create new Assets table
CREATE TABLE IF NOT EXISTS assets (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- image, video
  title VARCHAR(255) NOT NULL,
  description TEXT,
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  cloudinary_public_id VARCHAR(255),
  cloudinary_resource_type VARCHAR(20),
  tags TEXT[],
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  category VARCHAR(100),
  ai_model VARCHAR(255),
  prompt TEXT,
  generation_id VARCHAR REFERENCES ai_generations(id) ON DELETE SET NULL,
  is_enhanced BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX assets_user_idx ON assets(user_id);
CREATE INDEX assets_status_idx ON assets(status);
CREATE INDEX assets_created_at_idx ON assets(created_at);

-- Step 2: Migrate existing submissions data to assets table
-- For each unique media file in submissions, create an asset record
INSERT INTO assets (
  id,
  user_id,
  type,
  title,
  description,
  media_url,
  thumbnail_url,
  cloudinary_public_id,
  cloudinary_resource_type,
  tags,
  status,
  category,
  ai_model,
  prompt,
  generation_id,
  is_enhanced,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid() as id,
  user_id,
  type,
  title,
  description,
  media_url,
  thumbnail_url,
  cloudinary_public_id,
  cloudinary_resource_type,
  tags,
  status,
  category,
  ai_model,
  prompt,
  generation_id,
  is_enhanced,
  created_at,
  created_at as updated_at
FROM submissions
ON CONFLICT DO NOTHING;

-- Step 3: Create temporary column to link submissions to assets
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS asset_id VARCHAR;

-- Step 4: Link existing submissions to their corresponding assets
-- Match by media_url + user_id (assuming same file = same asset)
UPDATE submissions s
SET asset_id = a.id
FROM assets a
WHERE s.media_url = a.media_url 
  AND s.user_id = a.user_id;

-- Step 5: Drop old media-related columns from submissions
ALTER TABLE submissions 
  DROP COLUMN IF EXISTS type,
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS media_url,
  DROP COLUMN IF EXISTS thumbnail_url,
  DROP COLUMN IF EXISTS cloudinary_public_id,
  DROP COLUMN IF EXISTS cloudinary_resource_type,
  DROP COLUMN IF EXISTS tags,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS ai_model,
  DROP COLUMN IF EXISTS prompt,
  DROP COLUMN IF EXISTS generation_id,
  DROP COLUMN IF EXISTS is_enhanced;

-- Step 6: Make asset_id required and add foreign key
ALTER TABLE submissions ALTER COLUMN asset_id SET NOT NULL;
ALTER TABLE submissions ADD CONSTRAINT submissions_asset_id_fkey 
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE;

-- Step 7: Add unique constraint to prevent duplicate submissions (same asset + contest)
ALTER TABLE submissions ADD CONSTRAINT submissions_asset_contest_unique 
  UNIQUE (asset_id, contest_id);

-- Step 8: Add new index for asset lookups
CREATE INDEX submissions_asset_idx ON submissions(asset_id);

-- Step 9: Drop old indexes that are no longer relevant
DROP INDEX IF EXISTS submissions_user_contest_idx;
DROP INDEX IF EXISTS submissions_contest_status_idx;
DROP INDEX IF EXISTS submissions_votes_idx;

-- Step 10: Recreate necessary indexes
CREATE INDEX submissions_user_contest_idx ON submissions(user_id, contest_id);
CREATE INDEX submissions_contest_status_idx ON submissions(contest_id, status);
CREATE INDEX submissions_votes_idx ON submissions(votes_count);

COMMENT ON TABLE assets IS 'Stores user media files (images/videos) in personal gallery';
COMMENT ON TABLE submissions IS 'Represents asset participation in contests - links assets to contests with voting data';
COMMENT ON CONSTRAINT submissions_asset_contest_unique ON submissions IS 'Prevents duplicate submissions of same asset to same contest';
