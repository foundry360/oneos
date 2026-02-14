-- Add display_name and avatar_url columns to profiles table
-- Run this migration after rbac_migration.sql

DO $$
BEGIN
    -- Add display_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'display_name'
    ) THEN
        ALTER TABLE profiles ADD COLUMN display_name TEXT;
    END IF;

    -- Add avatar_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN profiles.display_name IS 'User display name (optional)';
COMMENT ON COLUMN profiles.avatar_url IS 'URL to user avatar image in Supabase storage';




