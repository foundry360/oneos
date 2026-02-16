-- Add source_profile_id column to governance_profiles table
-- This column stores the ID of the profile that was cloned to create a new version

ALTER TABLE governance_profiles 
ADD COLUMN IF NOT EXISTS source_profile_id UUID REFERENCES governance_profiles(id) ON DELETE SET NULL;

-- Add index for source_profile_id
CREATE INDEX IF NOT EXISTS idx_governance_profiles_source_profile_id ON governance_profiles(source_profile_id);

-- Add comment
COMMENT ON COLUMN governance_profiles.source_profile_id IS 'ID of the profile that was cloned to create this version (for versioning history)';








