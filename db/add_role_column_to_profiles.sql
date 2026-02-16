-- ============================================================================
-- Add Role Column to Profiles Table
-- ============================================================================
-- This script adds the 'role' column to the profiles table if it doesn't exist
-- ============================================================================

-- Check if role column exists and add it if missing
DO $$
BEGIN
    -- Check if role column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        -- Add role column with default value
        ALTER TABLE profiles 
        ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
        
        -- Add check constraint for valid roles
        ALTER TABLE profiles 
        ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('admin', 'governance', 'reviewer', 'user', 'system'));
        
        RAISE NOTICE '✅ Role column added to profiles table';
    ELSE
        RAISE NOTICE '✅ Role column already exists in profiles table';
    END IF;
END $$;

-- Create index on role column if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Show current profiles and their roles
SELECT 
    id,
    email,
    role,
    display_name,
    created_at,
    updated_at
FROM profiles
ORDER BY created_at DESC;

-- Add comment
COMMENT ON COLUMN profiles.role IS 'User role: admin, governance, reviewer, user, or system';


